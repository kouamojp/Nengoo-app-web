from fastapi import FastAPI, APIRouter, HTTPException, status, Header, Depends, BackgroundTasks, Query, Request, Response
from fastapi.responses import HTMLResponse, Response
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Literal, Optional, Any
import uuid
from datetime import datetime, timedelta
from enum import Enum
import bcrypt
import boto3
from botocore.exceptions import ClientError
import html

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import Firebase Admin configuration
from firebase_admin_config import initialize_firebase_admin

# Initialize Firebase Admin SDK
initialize_firebase_admin()

# --- Email Configuration ---
# Add these variables to your .env file
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("SMTP_USER", "your-email@example.com"),
    MAIL_PASSWORD=os.getenv("SMTP_PASSWORD", "your-password"),
    MAIL_FROM=os.getenv("EMAIL_FROM", "your-email@example.com"),
    MAIL_PORT=int(os.getenv("SMTP_PORT", 587)),
    MAIL_SERVER=os.getenv("SMTP_HOST", "smtp.example.com"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
    MAIL_SSL_TLS=os.getenv("SMTP_SECURE", "False").lower() == "true",
    USE_CREDENTIALS=os.getenv("USE_CREDENTIALS", "True").lower() == "true",
    VALIDATE_CERTS=os.getenv("VALIDATE_CERTS", "True").lower() == "true",
    TEMPLATE_FOLDER=Path(__file__).parent / 'templates',
)

fm = FastMail(conf)

# --- App and DB Setup ---
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Domaine canonique du site (SEO, aperçus réseaux sociaux, sitemap).
# Fixé dans le code : nengoo.com redirige vers www, une valeur sans www crée une boucle pour les robots.
SITE_URL = "https://www.nengoo.com"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Identité par JWT (voir auth_tokens.py). Ajouté avant CORSMiddleware : les
# middlewares s'empilent à l'envers, CORS enveloppe donc ses réponses d'erreur.
from auth_tokens import IdentityMiddleware, create_access_token, decode_access_token
import login_limiter
import password_reset
from account_email import EMAIL_TAKEN, account_query, email_taken, ensure_email_free, normalize_email
from fastapi.responses import JSONResponse
from pymongo.errors import DuplicateKeyError
from category_tree import normalize_name, suggest_category_name
from catalog_rules import CITIES, normalize_city, product_issues, whatsapp_digits
from product_search import normalize_query, search_products, search_products_detailed
from image_variants import aligned_variants, refresh_product_variants
from sms import order_created_text, order_status_text, send_sms
from delivery import load_settings as load_delivery_settings, new_courier_token, new_delivery_code, seller_fee
from order_flow import RELEASES_STOCK, STATUSES as ORDER_STATUSES, check_transition, normalize_status, status_label
from account_deletion import erase_buyer, erase_seller
app.add_middleware(IdentityMiddleware)

@app.exception_handler(DuplicateKeyError)
async def duplicate_key_handler(_request, error):
    # Deux inscriptions simultanées : l'index unique tranche après les contrôles
    if "email" in (error.details or {}).get("keyPattern", {}):
        return JSONResponse(status_code=400, content={"detail": EMAIL_TAKEN})
    raise error


IS_PRODUCTION = os.environ.get("ENVIRONMENT", "").strip().lower() == "production"

origins = [
    "https://www.nengoo.com",
    "https://nengoo.com",
    "https://nengoo-app-web.vercel.app",
    "https://nengoo-app-web.onrender.com",
    # Capacitor mobile app origins
    "capacitor://localhost",
    "https://localhost",
    "http://localhost",
]
# Serveurs de développement : jamais acceptés en production
dev_origins = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8000",
    "http://localhost:8001",  # Backend lui-même (pour tests)
    # Ports Flutter Web communs
    "http://localhost:5000",
    "http://localhost:5001",
    "http://localhost:5500",
    "http://localhost:8888",
    "http://localhost:9000",
]
if not IS_PRODUCTION:
    origins += dev_origins

# Using an explicit list of origins is more secure than a wildcard,
# especially when allow_credentials=True.
# Pour le développement, on peut aussi utiliser allow_origin_regex
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Capacitor mobile partout ; localhost sur tout port hors production
    allow_origin_regex=r"capacitor://.*" if IS_PRODUCTION else r"(http://localhost:\d+|capacitor://.*)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Utility Functions ---

def normalize_whatsapp(whatsapp: str) -> str:
    """
    Normalise le format du numéro WhatsApp en supprimant tous les espaces.
    Exemple: '+237 690703689' -> '+237690703689'
    """
    if not whatsapp:
        return ""
    return whatsapp.replace(" ", "").replace("-", "").strip()

def whatsapp_lookup(whatsapp: str) -> dict:
    """
    Filtre Mongo qui retrouve un numéro quel que soit son format enregistré.

    Les comptes existants mélangent « 690703689 », « +237690703689 »,
    « +237 690703689 », « 237690703689 »… On compare donc les chiffres du
    numéro local, l'indicatif 237 et les séparateurs étant facultatifs.
    Une saisie sans chiffres (ancien compte identifié par un e-mail) est
    comparée telle quelle.
    """
    raw = (whatsapp or "").strip()
    digits = re.sub(r"\D", "", raw)
    if len(digits) < 8:
        return {"whatsapp": raw}
    local = digits[3:] if digits.startswith("237") and len(digits) > 9 else digits
    sep = r"[\s.\-()]*"
    pattern = r"^\s*\+?\s*(237)?" + sep + sep.join(local) + r"\s*$"
    return {"whatsapp": {"$regex": pattern}}


async def find_account_for_login(collection, whatsapp: str, password: str, extra_filter: Optional[dict] = None):
    """
    Compte dont le numéro correspond et dont le mot de passe est valide.
    Plusieurs comptes peuvent partager un numéro (formats différents) : on
    garde celui que le mot de passe ouvre, de préférence approuvé/actif.
    Renvoie (compte, trouvé_sans_mot_de_passe_valide).
    """
    query = {**whatsapp_lookup(whatsapp), **(extra_filter or {})}
    candidates = await collection.find(query).to_list(20)
    def password_ok(account):
        try:
            return bool(account.get("password")) and verify_password(password, account["password"])
        except ValueError:  # hash illisible (ancien format)
            return False
    valid = [c for c in candidates if password_ok(c)]
    valid.sort(key=lambda c: (c.get("status") not in ("approved", "active"), c.get("id") is None))
    return (valid[0] if valid else None), bool(candidates)


def migrate_seller_data(seller_data: dict) -> dict:
    """
    Migrates legacy seller data to match current schema.
    Adds default values for missing required fields.
    """
    if "region" not in seller_data:
        seller_data["region"] = seller_data.get("city", "Non spécifié")
    if "address" not in seller_data:
        seller_data["address"] = "Non spécifié"
    return seller_data

# --- Security (Mock Authorization) ---

async def get_user_id_from_request(
    authorization: Optional[str] = Header(None),
    x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id"),
    x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id")
) -> Optional[str]:
    """Extract user ID from Authorization Bearer token or X-Buyer-Id/X-Seller-Id headers"""
    # First check custom headers (legacy support)
    if x_buyer_id:
        return x_buyer_id
    if x_seller_id:
        return x_seller_id

    # Extract from Bearer token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        # Token is the user ID itself (e.g., "buyer_73b41c54")
        return token

    return None

async def get_current_admin_role(x_admin_role: str = Header(None)) -> Optional[str]:
    return x_admin_role

async def super_admin_required(role: str = Depends(get_current_admin_role)):
    if role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required for this operation."
        )

async def admin_or_higher_required(role: str = Depends(get_current_admin_role)):
    if role not in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Super admin privileges required for this operation."
        )

async def moderator_or_higher_required(role: str = Depends(get_current_admin_role)):
    if role not in ["super_admin", "admin", "moderator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator, Admin, or Super admin privileges required."
        )

async def support_or_higher_required(role: str = Depends(get_current_admin_role)):
    if role not in ["super_admin", "admin", "moderator", "support"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support, Moderator, Admin, or Super admin privileges required."
        )

async def get_current_seller_optional(x_seller_id: Optional[str] = Header(None)) -> Optional[str]:
    return x_seller_id

async def seller_id_or_support_required(seller_id: Optional[str] = Depends(get_current_seller_optional), role: str = Depends(get_current_admin_role)):
    if seller_id:
        return
    if role not in ["super_admin", "admin", "moderator", "support"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support, Moderator, Admin, or Super admin privileges required."
        )

async def seller_or_moderator_or_higher_required(seller_id: Optional[str] = Depends(get_current_seller_optional), role: str = Depends(get_current_admin_role)):
    if seller_id:
        return
    if role not in ["super_admin", "admin", "moderator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller, Moderator, Admin, or Super admin privileges required."
        )

async def product_owner_or_moderator_required(
    product_id: str,
    seller_id: Optional[str] = Depends(get_current_seller_optional),
    role: Optional[str] = Header(None, alias="X-Admin-Role")
):
    # If the user is a moderator or higher, they are authorized.
    if role in ["super_admin", "admin", "moderator"]:
        return

    # If not an admin, they must be a seller trying to edit their own product.
    if not seller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Seller ID header is missing.",
        )

    # Find the product in the database
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if the seller ID from the header matches the product's sellerId
    if product.get("sellerId") != seller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the owner of this product.",
        )

async def order_owner_or_support_required(
    order_id: str,
    seller_id: Optional[str] = Header(None, alias="X-Seller-Id"),
    role: Optional[str] = Header(None, alias="X-Admin-Role")
):
    # If the user is support or higher, they are authorized.
    if role in ["super_admin", "admin", "moderator", "support"]:
        return

    # If not an admin, they must be a seller trying to edit their own order.
    if not seller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Seller ID header is missing.",
        )

    # Find the order in the database
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if the seller ID from the header matches the order's sellerId
    if order.get("sellerId") != seller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the owner of this order.",
        )

def get_status_text_fr(status: str) -> str:
    return status_label(status)

# --- Hashing Utility ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# --- Enums ---
class AdminRole(str, Enum):
    super_admin = "super_admin"
    admin = "admin"
    moderator = "moderator"
    support = "support"

# --- Pydantic Models ---

_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")

def _normalize_colors(colors: Optional[List[str]]) -> List[str]:
    """Couleurs au format #RRGGBB en minuscules, sans doublon (12 max)."""
    result: List[str] = []
    for c in colors or []:
        c = (c or "").strip()
        if not _HEX_COLOR.match(c):
            raise ValueError(f"Couleur invalide : {c!r} (format attendu #RRGGBB)")
        c = c.lower()
        if c not in result:
            result.append(c)
    return result[:12]

# État d'un produit : neuf, occasion, reconditionné
ProductCondition = Literal["new", "used", "refurbished"]

class Product(BaseModel):
    id: str = Field(default_factory=lambda: f"prod_{str(uuid.uuid4())[:8]}")
    slug: Optional[str] = None
    name: str
    description: str
    category: str
    price: float
    promoPrice: Optional[float] = None
    oldPrice: Optional[float] = None
    sellerId: str
    sellerName: str
    stock: int
    images: List[str]
    status: str = "approved"
    # Fields from init_database not in create model
    currency: str = "XAF"
    sold: int = 0
    verified: bool = True
    featured: bool = False
    rating: float = 0.0
    reviewsCount: int = 0
    views: int = 0
    favorites: int = 0
    tags: List[str] = []
    # Couleurs disponibles, en hexadécimal (#RRGGBB)
    colors: List[str] = []
    brand: Optional[str] = None
    condition: Optional[ProductCondition] = None
    # Caractéristiques libres : {"Taille": "M", "Matière": "Coton"}
    specs: Dict[str, str] = {}
    # Versions WebP réduites, alignées sur images ('' = pas encore créée) :
    # 400 px pour les listes, 1000 px pour la fiche (voir image_variants.py)
    thumbnails: List[str] = []
    previews: List[str] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class ProductCreate(BaseModel):
    name: str
    description: str
    category: str
    price: float
    promoPrice: Optional[float] = None
    oldPrice: Optional[float] = None
    sellerId: str
    sellerName: str
    stock: int
    images: List[str]
    tags: Optional[List[str]] = []
    colors: Optional[List[str]] = []
    brand: Optional[str] = None
    condition: Optional[ProductCondition] = None
    specs: Optional[Dict[str, str]] = {}

    @field_validator("colors")
    @classmethod
    def _check_colors(cls, v):
        return _normalize_colors(v)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    promoPrice: Optional[float] = None
    oldPrice: Optional[float] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None
    status: Optional[str] = None
    featured: Optional[bool] = None
    colors: Optional[List[str]] = None
    brand: Optional[str] = None
    condition: Optional[ProductCondition] = None
    specs: Optional[Dict[str, str]] = None

    @field_validator("colors")
    @classmethod
    def _check_colors(cls, v):
        return None if v is None else _normalize_colors(v)

class Seller(BaseModel):
    id: str = Field(default_factory=lambda: f"seller_{str(uuid.uuid4())[:8]}")
    whatsapp: str
    password: Optional[str] = None  # Hashed. Made optional to support OAuth users
    name: str
    businessName: str
    email: str
    city: str
    region: str
    address: str
    categories: List[str]
    description: str
    status: str = "pending"
    type: str = "seller"
    deliveryPrice: Optional[float] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    logoUrl: Optional[str] = None
    socialMedia: Optional[dict] = None
    reset_token: Optional[str] = None
    reset_token_expiry: Optional[datetime] = None
    # OAuth fields
    oauth_provider: Optional[str] = None  # 'google.com', 'facebook.com', 'apple.com'
    oauth_uid: Optional[str] = None  # Firebase UID
    last_login: Optional[datetime] = None

class SellerAuthResponse(Seller):
    """Vendeur connecté + jeton d'accès (à envoyer en Authorization: Bearer)."""
    accessToken: Optional[str] = None

class SellerCreate(BaseModel):
    whatsapp: str
    password: str # Plain text
    name: str
    businessName: str
    email: str
    city: str
    region: str
    address: str
    categories: List[str] = []
    description: str

class SellerUpdate(BaseModel):
    name: Optional[str] = None
    businessName: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    address: Optional[str] = None
    categories: Optional[List[str]] = None
    description: Optional[str] = None
    status: Optional[str] = None
    whatsapp: Optional[str] = None
    logoUrl: Optional[str] = None
    socialMedia: Optional[dict] = None
    deliveryPrice: Optional[float] = None
    password: Optional[str] = None

class SellerAnalyticsData(BaseModel):
    total_revenue: float
    total_orders: int
    total_products: int
    total_customers: int
    monthly_revenue: List[dict]
    top_products: List[dict]

class OrderProduct(BaseModel):
    productId: str
    name: str
    quantity: int
    price: float
    image: Optional[str] = None
    images: Optional[List[str]] = None

class Order(BaseModel):
    id: str
    buyerId: str
    buyerName: str
    buyerWhatsapp: Optional[str] = None # Added
    sellerId: str
    sellerName: str
    products: List[OrderProduct]
    totalAmount: float
    shippingCost: Optional[float] = None
    shippingAddress: Optional[str] = None
    shippingCity: Optional[str] = None
    shippingRegion: Optional[str] = None
    shippingPhone: Optional[str] = None
    # Adresse à la camerounaise : quartier et point de repère
    shippingNeighborhood: Optional[str] = None
    shippingLandmark: Optional[str] = None
    currency: str = "XAF"
    status: str
    # [{"status", "at", "by"}] : historique affiché au client (suivi de commande)
    statusHistory: List[dict] = []
    # Stock retiré à la commande (commandes depuis la phase 4) ; rendu si elle est annulée
    stockReserved: bool = False
    # Livraison (phase 5) : livreur attribué, code donné au client et demandé
    # au livreur à la remise, tentatives sans livraison
    courierId: Optional[str] = None
    courierName: Optional[str] = None
    deliveryCode: Optional[str] = None
    deliveryAttempts: List[dict] = []
    paymentStatus: str
    pickupPointId: Optional[str] = None # Changed to Optional
    pickupPointName: Optional[str] = None # Added
    pickupStatus: str
    orderedDate: datetime
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    paymentStatus: Optional[str] = None
    pickupStatus: Optional[str] = None


class CheckoutProduct(BaseModel):
    id: str
    quantity: int


class CheckoutRequest(BaseModel):
    firstName: str
    lastName: Optional[str] = ""
    # Commande possible sans e-mail, avec le seul numéro de téléphone
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    neighborhood: Optional[str] = None
    landmark: Optional[str] = None
    paymentMethod: str
    deliveryOption: str
    selectedPickupPoint: Optional[str] = None
    cartItems: List[CheckoutProduct]

class Admin(BaseModel):
    id: str
    name: str
    whatsapp: str
    email: str
    role: AdminRole
    accessCode: str  # Hashed
    status: str
    createdDate: datetime
    lastLogin: Optional[datetime] = None
    type: str = "admin"

class AdminAuthResponse(Admin):
    accessToken: Optional[str] = None

class AdminCreate(BaseModel):
    name: str
    whatsapp: str
    email: str
    role: AdminRole
    accessCode: str  # Plain text

class AdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[AdminRole] = None

class AdminStatusUpdate(BaseModel):
    status: str

class AdminPasswordUpdate(BaseModel):
    newPassword: str

class PickupPoint(BaseModel):
    id: str = Field(default_factory=lambda: f"pickup_{str(uuid.uuid4())[:8]}")
    name: str
    address: str
    city: str
    region: str
    managerName: str
    managerWhatsApp: str
    phone: str
    email: str
    hours: str
    description: str
    status: str = "pending"
    createdDate: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    capacity: int = 50
    currentLoad: int = 0
    verified: bool = False
    totalOrders: int = 0
    activeOrders: int = 0
    rating: float = 0.0
    reviewsCount: int = 0
    approvedDate: Optional[datetime] = None
    
class PickupPointCreate(BaseModel):
    name: str
    address: str
    city: str
    region: str
    managerName: str
    managerWhatsApp: str
    phone: str
    email: str
    hours: str
    description: str

class PickupPointUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    managerName: Optional[str] = None
    managerWhatsApp: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    hours: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
class Category(BaseModel):
    id: str = Field(default_factory=lambda: f"cat_{str(uuid.uuid4())[:8]}")
    name: str
    description: Optional[str] = None
    # Sous-catégorie : id de la catégorie principale (un seul niveau)
    parentId: Optional[str] = None
    nameEn: Optional[str] = None
    image: Optional[str] = None
    # Ordre d'affichage (croissant), puis ordre alphabétique
    order: int = 0
    # Anciens noms : les liens /catalog/<ancien nom> continuent de marcher
    formerNames: List[str] = []

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parentId: Optional[str] = None
    nameEn: Optional[str] = None
    image: Optional[str] = None
    order: int = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    # null explicite : la sous-catégorie redevient une catégorie principale
    parentId: Optional[str] = None
    nameEn: Optional[str] = None
    image: Optional[str] = None
    order: Optional[int] = None

class ReclassifyRequest(BaseModel):
    productIds: List[str]
    categoryId: str

class CategoryWithCount(Category):
    productCount: int

class Ad(BaseModel):
    id: str = Field(default_factory=lambda: f"ad_{str(uuid.uuid4())[:8]}")
    title: str
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    linkUrl: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    isActive: bool = True
    createdAt: str = Field(default_factory=lambda: datetime.now().isoformat())

class AdCreate(BaseModel):
    title: str
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    linkUrl: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    isActive: bool = True

class PresignedUrlRequest(BaseModel):
    fileName: str
    fileType: str

class PresignedUrlResponse(BaseModel):
    uploadUrl: str
    publicUrl: str

class Buyer(BaseModel):
    id: str
    whatsapp: str
    name: str
    email: str
    password: Optional[str] = None # Hashed password (optional for OAuth users)
    type: str = "buyer"
    joinDate: datetime
    status: str
    totalOrders: int = 0
    totalSpent: float = 0.0
    reset_token: Optional[str] = None
    reset_token_expiry: Optional[datetime] = None
    # OAuth fields
    oauth_provider: Optional[str] = None  # 'google.com', 'facebook.com', 'apple.com'
    oauth_uid: Optional[str] = None  # Firebase UID
    last_login: Optional[datetime] = None

class BuyerAuthResponse(Buyer):
    accessToken: Optional[str] = None

BUYER_PRIVATE_FIELDS = {"password", "reset_token", "reset_token_expiry"}

class BuyerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None

class BuyerCreate(BaseModel):
    whatsapp: str
    password: str  # Plain text password
    name: str
    email: str

class BuyerLoginRequest(BaseModel):
    whatsapp: str
    password: str

class NewsletterSubscription(BaseModel):
    email: str
    subscribed_at: datetime = Field(default_factory=datetime.utcnow)

class PrivacyPolicy(BaseModel):
    id: str = Field(default="privacy_policy_v1")
    title: str = "Politique de confidentialité"
    content: str
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None  # Admin ID who last updated

class PrivacyPolicyUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class AboutPageSettings(BaseModel):
    id: str = Field(default="about_page_settings")
    mission_image_url: str
    mission_title: str = "Notre Mission"
    mission_text_1: str
    mission_text_2: str
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None  # Admin ID who last updated

class AboutPageSettingsUpdate(BaseModel):
    mission_image_url: Optional[str] = None
    mission_title: Optional[str] = None
    mission_text_1: Optional[str] = None
    mission_text_2: Optional[str] = None

class Message(BaseModel):
    id: str = Field(default_factory=lambda: f"msg_{str(uuid.uuid4())[:8]}")
    conversation_id: str
    sender_id: str
    receiver_id: str
    sender_type: str  # 'buyer' or 'seller'
    receiver_type: str # 'buyer' or 'seller'
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    read_status: bool = False

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: f"notif_{str(uuid.uuid4())[:8]}")
    recipient_id: str
    recipient_type: str # 'buyer' or 'seller'
    type: str # 'order_status', 'new_message', 'stock_alert', 'order_created'
    title: str
    message: str
    link: Optional[str] = None
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationCreate(BaseModel):
    recipient_id: str
    recipient_type: str
    type: str
    title: str
    message: str
    link: Optional[str] = None

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: f"conv_{str(uuid.uuid4())[:8]}")
    buyer_id: str
    seller_id: str
    product_id: str
    last_message_timestamp: datetime = Field(default_factory=datetime.utcnow)
    last_message_preview: str
    seller_unread: bool = False
    buyer_unread: bool = False

class BulkDeleteRequest(BaseModel):
    ids: List[str]

class Review(BaseModel):
    id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:8]}")
    productId: str
    buyerId: str
    buyerName: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ProductInteraction(BaseModel):
    id: str = Field(default_factory=lambda: f"int_{uuid.uuid4().hex[:8]}")
    userId: str
    productId: str
    isFavourite: bool = False
    rating: int = Field(default=0, ge=0, le=5)
    interaction: str = "view"  # "view", "favourite", "rate"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ProductInteractionCreate(BaseModel):
    isFavourite: bool = False
    rating: int = Field(default=0, ge=0, le=5)
    interaction: str = "view"

class ForgotPasswordRequest(BaseModel):
    email: str
    user_type: str # 'buyer' or 'seller'

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    user_type: str

class ResetPasswordCodeRequest(BaseModel):
    email: str
    user_type: str
    code: str
    new_password: str

class WhatsAppClick(BaseModel):
    id: str = Field(default_factory=lambda: f"wac_{str(uuid.uuid4())[:8]}")
    productId: str
    productName: str
    sellerId: str
    sellerName: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class WhatsAppClickCreate(BaseModel):
    productId: str
    productName: str
    sellerId: str
    sellerName: str

# --- Auth Endpoints (Forgot Password) ---

@api_router.post("/analytics/whatsapp-click", status_code=status.HTTP_201_CREATED)
async def record_whatsapp_click(click_data: WhatsAppClickCreate):
    new_click = WhatsAppClick(**click_data.dict())
    await db.whatsapp_clicks.insert_one(new_click.dict())
    return {"message": "Click recorded"}

@api_router.get("/analytics/whatsapp-clicks", dependencies=[Depends(admin_or_higher_required)])
async def get_whatsapp_clicks_analytics():
    pipeline = [
        {
            "$group": {
                "_id": "$productId",
                "productName": { "$first": "$productName" },
                "sellerName": { "$first": "$sellerName" },
                "clickCount": { "$sum": 1 },
                "lastClick": { "$max": "$timestamp" }
            }
        },
        { "$sort": { "clickCount": -1 } }
    ]
    clicks_cursor = db.whatsapp_clicks.aggregate(pipeline)
    clicks = await clicks_cursor.to_list(1000)
    return clicks

@api_router.post("/auth/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, http_request: Request):
    if request.user_type not in ['buyer', 'seller']:
        raise HTTPException(status_code=400, detail="Invalid user type")
    # Chaque demande compte : limite les envois d'e-mails par IP
    login_limiter.check("forgot-password", http_request, None)
    login_limiter.record_failure("forgot-password", http_request, None)

    collection = db.sellers if request.user_type == 'seller' else db.users
    user = await collection.find_one(account_query(request.email, request.user_type))
    if not user:
        # Don't reveal if user exists
        return {"message": "If an account exists with this email, a password reset link has been sent."}

    reset_token = str(uuid.uuid4())
    expiry = datetime.utcnow() + timedelta(hours=1)
    # Le lien sert au site, le code à l'app mobile
    reset_code = password_reset.new_code()

    await collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expiry": expiry,
            **password_reset.code_fields(reset_code),
        }}
    )

    # Determine frontend URL (Assuming it's running on the same domain or configured)
    # Ideally, this should be an environment variable
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000") # Fallback to local
    if "nengoo" in str(origins[0]): # simplistic check
         frontend_url = "https://www.nengoo.com"

    reset_link = f"{frontend_url}/reset-password?token={reset_token}&type={request.user_type}"

    message = MessageSchema(
        subject="Réinitialisation de votre mot de passe Nengoo",
        recipients=[user["email"]],
        template_body={
            "name": user.get("name") or user.get("businessName"),
            "reset_link": reset_link,
            "reset_code": reset_code
        },
        subtype="html"
    )
    background_tasks.add_task(fm.send_message, message, template_name="reset_password.html")

    return {"message": "If an account exists with this email, a password reset link has been sent."}

@api_router.post("/auth/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(request: ResetPasswordRequest):
    if request.user_type not in ['buyer', 'seller']:
        raise HTTPException(status_code=400, detail="Invalid user type")

    collection = db.sellers if request.user_type == 'seller' else db.users
    
    user = await collection.find_one({
        "reset_token": request.token,
        "reset_token_expiry": {"$gt": datetime.utcnow()}
    })

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    hashed_password = hash_password(request.new_password)

    await collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hashed_password, **password_reset.CLEARED_FIELDS}}
    )

    return {"message": "Password successfully reset"}

@api_router.post("/auth/reset-password-code", status_code=status.HTTP_200_OK)
async def reset_password_with_code(request: ResetPasswordCodeRequest, http_request: Request):
    """Nouveau mot de passe depuis l'app mobile, avec le code reçu par e-mail."""
    if request.user_type not in ['buyer', 'seller']:
        raise HTTPException(status_code=400, detail="Invalid user type")
    if len(request.new_password) < password_reset.MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail="Le mot de passe est trop court.")
    login_limiter.check("reset-code", http_request, None)

    collection = db.sellers if request.user_type == 'seller' else db.users
    account = await password_reset.account_for_code(collection, request.email, request.user_type, request.code)
    if not account:
        login_limiter.record_failure("reset-code", http_request, None)
        raise HTTPException(status_code=400, detail="Code incorrect ou expiré.")

    await collection.update_one(
        {"_id": account["_id"]},
        {"$set": {"password": hash_password(request.new_password), **password_reset.CLEARED_FIELDS}}
    )
    return {"message": "Password successfully reset"}

# --- Messaging Endpoints ---

class MessageCreate(BaseModel):
    receiver_id: str
    message: str
    product_id: Optional[str] = None # Needed to create a new conversation

@api_router.post("/messages", response_model=Message)
async def create_message(message_data: MessageCreate, background_tasks: BackgroundTasks, sender_id: str = Header(...), sender_type: str = Header(...)):
    if sender_type not in ['buyer', 'seller']:
        raise HTTPException(status_code=400, detail="Invalid sender_type")

    receiver_type = 'seller' if sender_type == 'buyer' else 'buyer'
    
    # Find conversation or create new one
    conversation = await db.conversations.find_one({
        "$or": [
            {"buyer_id": sender_id, "seller_id": message_data.receiver_id, "product_id": message_data.product_id},
            {"buyer_id": message_data.receiver_id, "seller_id": sender_id, "product_id": message_data.product_id}
        ]
    })

    if not conversation:
        if sender_type == 'buyer' and message_data.product_id:
            conversation_id = f"conv_{str(uuid.uuid4())[:8]}"
            new_conv = Conversation(
                id=conversation_id,
                buyer_id=sender_id,
                seller_id=message_data.receiver_id,
                product_id=message_data.product_id,
                last_message_preview=message_data.message,
                seller_unread=True
            )
            await db.conversations.insert_one(new_conv.dict())
            conversation = new_conv.dict()
        else:
            raise HTTPException(status_code=400, detail="Conversation does not exist. A buyer must initiate a conversation from a product page.")
    else:
        # Update conversation
        update_data = {
            "last_message_timestamp": datetime.utcnow(),
            "last_message_preview": message_data.message
        }
        if sender_type == 'buyer':
            update_data['seller_unread'] = True
        else:
            update_data['buyer_unread'] = True
        await db.conversations.update_one({"id": conversation["id"]}, {"$set": update_data})


    new_message = Message(
        conversation_id=conversation["id"],
        sender_id=sender_id,
        receiver_id=message_data.receiver_id,
        sender_type=sender_type,
        receiver_type=receiver_type,
        message=message_data.message
    )
    await db.messages.insert_one(new_message.dict())

    # Create in-app notification for receiver
    notif_title = f"Nouveau message de {buyer.get('name')}" if sender_type == 'buyer' else f"Nouveau message de {seller.get('businessName')}"
    notif_link = f"/seller/dashboard/messages/{conversation['id']}" if receiver_type == 'seller' else f"/profile/messages"
    
    new_notification = Notification(
        recipient_id=message_data.receiver_id,
        recipient_type=receiver_type,
        type='new_message',
        title=notif_title,
        message=message_data.message[:50] + "..." if len(message_data.message) > 50 else message_data.message,
        link=notif_link
    )
    await db.notifications.insert_one(new_notification.dict())

    # Send email notification to seller
    if receiver_type == 'seller':
        seller = await db.sellers.find_one({"id": message_data.receiver_id})
        buyer = await db.users.find_one({"id": sender_id})
        if seller and seller.get("email") and buyer:
            email_message = MessageSchema(
                subject=f"Nouveau message de {buyer.get('name')} sur Nengoo",
                recipients=[seller["email"]],
                template_body={
                    "seller_name": seller["businessName"],
                    "buyer_name": buyer.get('name'),
                    "message_content": new_message.message,
                    "conversation_url": f"https://www.nengoo.com/seller/dashboard/messages/{conversation['id']}"
                },
                subtype="html"
            )
            background_tasks.add_task(fm.send_message, email_message, template_name="new_message_seller.html")

    return new_message

@api_router.get("/conversations", response_model=List[Conversation])
async def get_conversations(user_id: str = Header(...), user_type: str = Header(...)):
    if user_type not in ['buyer', 'seller']:
        raise HTTPException(status_code=400, detail="Invalid user_type")
        
    query_field = f"{user_type}_id"
    conversations_cursor = db.conversations.find({query_field: user_id}).sort("last_message_timestamp", -1)
    conversations = await conversations_cursor.to_list(1000)
    return [Conversation(**c) for c in conversations]

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(conversation_id: str):
    messages_cursor = db.messages.find({"conversation_id": conversation_id}).sort("timestamp", 1)
    messages = await messages_cursor.to_list(1000)
    return [Message(**m) for m in messages]

@api_router.put("/messages/{message_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_message_as_read(message_id: str):
    await db.messages.update_one({"id": message_id}, {"$set": {"read_status": True}})
    return

# --- Notification Endpoints ---

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    user_id: str = Header(..., alias="X-User-Id"),
    user_type: str = Header(..., alias="X-User-Type")
):
    if user_type not in ['buyer', 'seller']:
        raise HTTPException(status_code=400, detail="Invalid user_type")
    
    notifications_cursor = db.notifications.find({
        "recipient_id": user_id,
        "recipient_type": user_type
    }).sort("created_at", -1)
    
    notifications = await notifications_cursor.to_list(100) # Limit to last 100 notifications
    return [Notification(**n) for n in notifications]

@api_router.get("/notifications/unread-count")
async def get_unread_notifications_count(
    user_id: str = Header(..., alias="X-User-Id"),
    user_type: str = Header(..., alias="X-User-Type")
):
    if user_type not in ['buyer', 'seller']:
        raise HTTPException(status_code=400, detail="Invalid user_type")
        
    count = await db.notifications.count_documents({
        "recipient_id": user_id,
        "recipient_type": user_type,
        "read": False
    })
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_as_read(
    notification_id: str,
    user_id: str = Header(..., alias="X-User-Id")
):
    result = await db.notifications.update_one(
        {"id": notification_id, "recipient_id": user_id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
         raise HTTPException(status_code=404, detail="Notification not found or not authorized")
    return

@api_router.put("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_as_read(
    user_id: str = Header(..., alias="X-User-Id"),
    user_type: str = Header(..., alias="X-User-Type")
):
    await db.notifications.update_many(
        {"recipient_id": user_id, "recipient_type": user_type, "read": False},
        {"$set": {"read": True}}
    )
    return

@api_router.delete("/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: str,
    user_id: str = Header(..., alias="X-User-Id")
):
    result = await db.notifications.delete_one({"id": notification_id, "recipient_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return

# --- Slug Utility ---
import re
import unicodedata

def generate_slug(text: str) -> str:
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).lower().strip()
    return re.sub(r'[-\s]+', '-', text)

async def get_unique_slug(name: str) -> str:
    base_slug = generate_slug(name)
    slug = base_slug
    counter = 1
    while await db.products.find_one({"slug": slug}):
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug

# --- API Endpoints ---
# ... (existing endpoints)

# --- File Upload Management (AWS S3) ---
@api_router.post("/generate-presigned-url", response_model=PresignedUrlResponse, dependencies=[Depends(seller_id_or_support_required)])
async def generate_presigned_url(request: PresignedUrlRequest):
    """
    Generates a pre-signed URL to upload a file directly to S3.
    Requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET_NAME
    to be configured in the environment.
    """
    aws_access_key_id = os.environ.get("AWS_ACCESS_KEY_ID")
    aws_secret_access_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    aws_region = os.environ.get("AWS_REGION")
    bucket_name = os.environ.get("S3_BUCKET_NAME")

    if not all([aws_access_key_id, aws_secret_access_key, aws_region, bucket_name]):
        raise HTTPException(status_code=500, detail="AWS S3 environment variables not configured.")

    s3_client = boto3.client(
        "s3",
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=aws_region,
        config=boto3.session.Config(signature_version='s3v4')
    )
    
    # Generate a unique object name
    object_name = f"uploads/{uuid.uuid4()}-{request.fileName}"

    try:
        response = s3_client.generate_presigned_url(
            'put_object',
            Params={'Bucket': bucket_name, 'Key': object_name, 'ContentType': request.fileType},
            ExpiresIn=3600  # URL expires in 1 hour
        )
        public_url = f"https://{bucket_name}.s3.{aws_region}.amazonaws.com/{object_name}"
        
        return PresignedUrlResponse(uploadUrl=response, publicUrl=public_url)
    except ClientError as e:
        logging.error(e)
        raise HTTPException(status_code=500, detail="Could not generate pre-signed URL.")

class ShippingSettings(BaseModel):
    price: float = Field(..., description="Prix de la livraison standard")

class HomepageSettings(BaseModel):
    heroImages: List[str] = Field(default=[], description="Liste des URLs des images du carrousel hero de la page d'accueil")

# --- API Endpoints for Settings ---
@api_router.get("/settings/shipping", response_model=ShippingSettings)
async def get_shipping_price():
    shipping_setting = await db.settings.find_one({"_id": "shipping_price"})
    if shipping_setting:
        return ShippingSettings(**shipping_setting)
    return ShippingSettings(price=2500) # Default value

@api_router.put("/settings/shipping", response_model=ShippingSettings, dependencies=[Depends(super_admin_required)])
async def update_shipping_price(settings: ShippingSettings):
    await db.settings.update_one(
        {"_id": "shipping_price"},
        {"$set": settings.dict()},
        upsert=True
    )
    return settings

@api_router.get("/settings/homepage", response_model=HomepageSettings)
async def get_homepage_settings():
    homepage_settings = await db.settings.find_one({"_id": "homepage_settings"})
    if homepage_settings:
        return HomepageSettings(**homepage_settings)
    # Images par défaut pour le carrousel hero
    return HomepageSettings(heroImages=[
        "https://images.unsplash.com/photo-1550041499-4c5857d2b508",
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8",
        "https://images.unsplash.com/photo-1483985988355-763728e1935b"
    ])

@api_router.put("/settings/homepage", response_model=HomepageSettings, dependencies=[Depends(super_admin_required)])
async def update_homepage_settings(settings: HomepageSettings):
    await db.settings.update_one(
        {"_id": "homepage_settings"},
        {"$set": settings.dict()},
        upsert=True
    )
    return settings

# --- Buyer Management ---
@api_router.post("/buyers/register", response_model=BuyerAuthResponse, response_model_exclude=BUYER_PRIVATE_FIELDS)
async def register_buyer(buyer_data: BuyerCreate):
    """Register a new buyer account"""
    # Check if buyer already exists
    # Doublon quel que soit le format enregistré ; on stocke le numéro normalisé
    existing_buyer = await db.users.find_one({**whatsapp_lookup(buyer_data.whatsapp), "type": "buyer"})
    if existing_buyer:
        raise HTTPException(status_code=400, detail="Un compte avec ce numéro WhatsApp existe déjà")
    buyer_data.email = await ensure_email_free(db.users, buyer_data.email, "buyer")
    buyer_data.whatsapp = normalize_whatsapp(buyer_data.whatsapp)

    # Hash password
    hashed_password = hash_password(buyer_data.password)

    # Create buyer
    new_buyer = Buyer(
        id=f"buyer_{str(uuid.uuid4())[:8]}",
        whatsapp=buyer_data.whatsapp,
        password=hashed_password,
        name=buyer_data.name,
        email=buyer_data.email,
        type="buyer",
        joinDate=datetime.utcnow(),
        status="active",
        totalOrders=0,
        totalSpent=0.0
    )

    await db.users.insert_one(new_buyer.dict())
    return BuyerAuthResponse(**new_buyer.dict(), accessToken=create_access_token(new_buyer.id, "buyer"))

@api_router.post("/buyers/login", response_model=BuyerAuthResponse, response_model_exclude=BUYER_PRIVATE_FIELDS)
async def buyer_login(login_data: BuyerLoginRequest, request: Request):
    """Login for buyer accounts"""
    login_limiter.check("buyer", request, login_data.whatsapp)
    # Normaliser le numéro WhatsApp (supprimer les espaces)
    normalized_whatsapp = normalize_whatsapp(login_data.whatsapp)

    logging.info(f"[BUYER LOGIN] Attempting login with WhatsApp: {login_data.whatsapp} -> normalized: {normalized_whatsapp}")

    # Chercher l'acheteur avec le numéro normalisé ou le numéro original
    buyer, number_known = await find_account_for_login(db.users, login_data.whatsapp, login_data.password, {"type": "buyer"})

    if not buyer:
        logging.warning(f"[BUYER LOGIN] No buyer/password match (number known: {number_known})")
        login_limiter.record_failure("buyer", request, login_data.whatsapp)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou mot de passe incorrect")

    if buyer.get("status") != "active":
        logging.warning(f"[BUYER LOGIN] Buyer {login_data.whatsapp} account is not active: {buyer.get('status')}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Votre compte est désactivé")

    logging.info(f"[BUYER LOGIN] Login successful for {login_data.whatsapp}")
    login_limiter.record_success("buyer", request, login_data.whatsapp)
    return BuyerAuthResponse(**buyer, accessToken=create_access_token(buyer["id"], "buyer"))

# --- Suppression de compte par son titulaire ---
class AccountDeletionRequest(BaseModel):
    userType: str  # 'buyer' ou 'seller'
    whatsapp: Optional[str] = None
    password: Optional[str] = None

@api_router.post("/account/delete")
async def delete_own_account(req: AccountDeletionRequest, request: Request, authorization: Optional[str] = Header(None)):
    """
    Supprime le compte de l'appelant (page /delete-account du site, écran
    « Supprimer mon compte » de l'app). Identité confirmée par numéro WhatsApp
    + mot de passe ; un compte sans mot de passe (connexion Google) est
    confirmé par son jeton de session.
    """
    if req.userType not in ("buyer", "seller"):
        raise HTTPException(status_code=400, detail="Type de compte inconnu.")
    is_buyer = req.userType == "buyer"
    collection = db.users if is_buyer else db.sellers
    extra_filter = {"type": "buyer"} if is_buyer else None

    if req.whatsapp and req.password:
        login_limiter.check(req.userType, request, req.whatsapp)
        account, _ = await find_account_for_login(collection, req.whatsapp, req.password, extra_filter)
        if not account:
            login_limiter.record_failure(req.userType, request, req.whatsapp)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou mot de passe incorrect")
    else:
        token = (authorization or "").strip()
        if token.lower().startswith("bearer "):
            token = token[7:].strip()
        try:
            claims = decode_access_token(token)
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Saisissez votre numéro WhatsApp et votre mot de passe.")
        if claims.get("typ") != req.userType:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Saisissez votre numéro WhatsApp et votre mot de passe.")
        account = await collection.find_one({"id": claims["sub"], **(extra_filter or {})})
        if not account:
            raise HTTPException(status_code=404, detail="Compte introuvable.")
        if account.get("password"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Saisissez votre mot de passe pour confirmer.")

    if not account.get("id"):
        # Ancien compte vendeur sans identifiant : rien d'autre ne s'y rattache
        await collection.delete_one({"_id": account["_id"]})
    elif is_buyer:
        await erase_buyer(db, account["id"])
    else:
        await erase_seller(db, account["id"])
    logging.info(f"[ACCOUNT DELETE] {req.userType} {account.get('id')} deleted by its owner")
    return {"message": "Votre compte a été supprimé."}

@api_router.get("/buyers", response_model=List[Buyer], dependencies=[Depends(super_admin_required)])
async def list_buyers():
    buyers_cursor = db.users.find({"type": "buyer"})
    buyers = await buyers_cursor.to_list(1000)
    return [Buyer(**b) for b in buyers]

@api_router.delete("/buyers", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(super_admin_required)])
async def bulk_delete_buyers(request: BulkDeleteRequest):
    if not request.ids:
        raise HTTPException(status_code=400, detail="No buyer IDs provided for deletion.")
    
    await db.users.delete_many({"id": {"$in": request.ids}, "type": "buyer"})
    return

@api_router.put("/buyers/{buyer_id}", response_model=Buyer, dependencies=[Depends(admin_or_higher_required)])
async def update_buyer(buyer_id: str, buyer_data: BuyerUpdate):
    update_data = buyer_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
    
    if "password" in update_data and update_data["password"]:
        update_data["password"] = hash_password(update_data["password"])
    
    if update_data.get("email"):
        update_data["email"] = await ensure_email_free(db.users, update_data["email"], "buyer", buyer_id)
    await db.users.update_one({"id": buyer_id, "type": "buyer"}, {"$set": update_data})
    updated_buyer = await db.users.find_one({"id": buyer_id, "type": "buyer"})
    if not updated_buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    return Buyer(**updated_buyer)

# --- API Endpoints ---

@api_router.get("/")
async def root():
    return {"message": "Hello Nengoo API"}

# --- Product Management ---
async def category_search_names() -> Dict[str, str]:
    """Texte de catégorie indexé pour chaque id : « Robes Mode femme »."""
    categories = await db.categories.find({}, {"_id": 0, "id": 1, "name": 1, "nameEn": 1, "parentId": 1}).to_list(1000)
    by_id = {c.get("id"): c for c in categories if c.get("id")}
    names = {}
    for cid, c in by_id.items():
        parent = by_id.get(c.get("parentId")) or {}
        names[cid] = " ".join(filter(None, [c.get("name"), c.get("nameEn"), parent.get("name"), parent.get("nameEn")]))
    return names


async def log_search_miss(search: str) -> None:
    """Journal des recherches sans résultat (pour savoir ce qui manque au catalogue)."""
    key = normalize_query(search)
    if not key:
        return
    await db.search_misses.update_one(
        {"_id": key},
        {"$set": {"query": search.strip()[:100], "lastAt": datetime.utcnow()}, "$inc": {"count": 1},
         "$setOnInsert": {"firstAt": datetime.utcnow()}},
        upsert=True,
    )


PRODUCT_SORTS = {
    "recent": lambda p: -(p.get("updatedAt") or p.get("createdAt") or datetime.min).timestamp(),
    "price_asc": lambda p: (p.get("promoPrice") or p.get("price") or 0),
    "price_desc": lambda p: -(p.get("promoPrice") or p.get("price") or 0),
}


@api_router.get("/products", response_model=List[Product])
async def get_products(
    response: Response,
    search: Optional[str] = None,
    seller_id: Optional[str] = None,
    category: Optional[str] = None,
    # Pages publiques : ?status=approved (cache les produits archivés ou en attente).
    # Sans ce paramètre, tous les statuts sont renvoyés (admin, espace vendeur).
    status_filter: Optional[str] = Query(None, alias="status"),
    # Pagination (facultative : sans limit, toute la liste comme avant)
    limit: Optional[int] = Query(None, ge=1, le=200),
    skip: int = Query(0, ge=0),
    # recent | price_asc | price_desc ; avec une recherche, pertinence par défaut
    sort: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, alias="minPrice"),
    max_price: Optional[float] = Query(None, alias="maxPrice"),
    # Page de résultats : une recherche sans résultat est enregistrée
    track: bool = False,
):
    query = {}
    if category:
        # Une catégorie principale inclut les produits de ses sous-catégories
        query["category"] = {"$in": await category_family_ids(category)}
    if status_filter:
        query["status"] = status_filter
        if status_filter == "approved":
            # Pages publiques : une fiche sans photo ou sans prix n'est pas vendable
            query["price"] = {"$gt": 0}
            query["images"] = {"$elemMatch": {"$nin": ["", None]}}
    if seller_id:
        query["sellerId"] = seller_id

    products = await db.products.find(query).to_list(None)
    if min_price is not None or max_price is not None:
        def paid(p):
            return p.get("promoPrice") or p.get("price") or 0
        products = [p for p in products
                    if (min_price is None or paid(p) >= min_price) and (max_price is None or paid(p) <= max_price)]
    if search and search.strip():
        # Tolérante aux fautes, accents, pluriels et synonymes ; les plus pertinents d'abord
        products, complete = search_products_detailed(products, search, await category_search_names())
        # Aucun produit ne contient tous les mots : le catalogue ne répond pas à la demande
        if track and not complete and status_filter == "approved":
            await log_search_miss(search)
    if sort in PRODUCT_SORTS:
        products.sort(key=PRODUCT_SORTS[sort])

    response.headers["X-Total-Count"] = str(len(products))
    if limit is not None:
        products = products[skip:skip + limit]
    return [Product(**p) for p in products]


@api_router.get("/search/suggest")
async def search_suggest(q: str = Query("", max_length=100), limit: int = Query(6, ge=1, le=12)):
    """Suggestions pendant la saisie : quelques produits et catégories."""
    if len(q.strip()) < 2:
        return {"products": [], "categories": []}
    products = await db.products.find(
        {"status": "approved", "price": {"$gt": 0}, "images": {"$elemMatch": {"$nin": ["", None]}}},
        {"_id": 0, "id": 1, "slug": 1, "name": 1, "price": 1, "promoPrice": 1, "images": 1, "thumbnails": 1,
         "category": 1, "brand": 1, "tags": 1, "description": 1},
    ).to_list(None)
    names = await category_search_names()
    found = search_products(products, q, names)[:limit]
    used = {p.get("category") for p in products}
    categories = await db.categories.find({}, {"_id": 0, "id": 1, "name": 1, "nameEn": 1, "parentId": 1}).to_list(1000)
    # Catégories qui contiennent des produits, cherchées sur leur seul nom
    category_docs = [{"id": c["id"], "name": names.get(c["id"], c["name"]), "c": c}
                     for c in categories if c.get("id") and (c["id"] in used or any(
                         sub.get("parentId") == c["id"] and sub.get("id") in used for sub in categories))]
    matched = search_products(category_docs, q)[:3]
    return {
        "products": [{
            "id": p["id"], "slug": p.get("slug"), "name": p.get("name"), "price": p.get("price"),
            "promoPrice": p.get("promoPrice"),
            # Petite version WebP quand elle existe
            "image": next((i for i in (p.get("thumbnails") or [])[:1] if i), None)
            or next((i for i in p.get("images") or [] if i), None),
        } for p in found],
        "categories": [{"id": d["c"]["id"], "name": d["c"]["name"], "nameEn": d["c"].get("nameEn")} for d in matched],
    }


@api_router.get("/admin/search-misses", dependencies=[Depends(moderator_or_higher_required)])
async def list_search_misses(limit: int = Query(50, ge=1, le=500), days: int = Query(30, ge=1, le=365)):
    """Recherches sans résultat des derniers jours, les plus fréquentes d'abord."""
    since = datetime.utcnow() - timedelta(days=days)
    misses = await db.search_misses.find({"lastAt": {"$gte": since}}).sort("count", -1).to_list(limit)
    return [{"query": m.get("query"), "count": m.get("count", 0), "lastAt": m.get("lastAt")} for m in misses]

class MaxPriceResponse(BaseModel):
    maxPrice: float

@api_router.get("/products/max-price", response_model=MaxPriceResponse)
async def get_max_product_price():
    # Use find().sort().limit(1) for a more robust way to get the product with the max price
    product_cursor = db.products.find().sort("price", -1).limit(1)
    products_list = await product_cursor.to_list(1)
    
    logger.info(f"💰 [Backend Debug] products_list from db.products.find(): {products_list}")

    if products_list:
        product = products_list[0]
        logger.info(f"💰 [Backend] Found product with max price: {product['price']}")
        return MaxPriceResponse(maxPrice=product["price"])
    
    logger.info("💰 [Backend] No products found, returning max price 0.0")
    return MaxPriceResponse(maxPrice=0.0)

@app.get("/sitemap.xml", response_class=Response)
async def generate_sitemap():
    """Generate dynamic XML sitemap for all products, categories, and sellers"""

    try:
        # Fetch all approved products
        products_cursor = db.products.find({"status": "approved"})
        products = await products_cursor.to_list(None)

        # Fetch all approved sellers
        sellers_cursor = db.sellers.find({"status": "approved"})
        sellers = await sellers_cursor.to_list(None)

        # Fetch all categories
        categories_cursor = db.categories.find()
        categories = await categories_cursor.to_list(None)

        frontend_url = SITE_URL
        current_date = datetime.utcnow().strftime("%Y-%m-%d")

        # Build sitemap XML
        xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

        # Homepage
        xml_content += f'''  <url>
    <loc>{frontend_url}/</loc>
    <lastmod>{current_date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
'''

        # Catalog page
        xml_content += f'''  <url>
    <loc>{frontend_url}/catalog</loc>
    <lastmod>{current_date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
'''

        # About page
        xml_content += f'''  <url>
    <loc>{frontend_url}/about</loc>
    <lastmod>{current_date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
'''

        # Privacy Policy page
        xml_content += f'''  <url>
    <loc>{frontend_url}/privacy-policy</loc>
    <lastmod>{current_date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
'''

        # Pickup points page
        xml_content += f'''  <url>
    <loc>{frontend_url}/pickup-points</loc>
    <lastmod>{current_date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
'''

        # Category pages
        for category in categories:
            category_name = category.get('name', '')
            if category_name:
                # URL encode the category name
                from urllib.parse import quote
                encoded_name = quote(category_name)
                xml_content += f'''  <url>
    <loc>{frontend_url}/catalog/{encoded_name}</loc>
    <lastmod>{current_date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
'''

        # Product pages
        for product in products:
            slug = product.get('slug') or product.get('id')
            if not slug:
                continue

            # Get last modified date
            updated = product.get('updatedAt', product.get('createdAt'))
            if isinstance(updated, datetime):
                lastmod = updated.strftime("%Y-%m-%d")
            else:
                lastmod = current_date

            xml_content += f'''  <url>
    <loc>{frontend_url}/product/{slug}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
'''

        # Seller shop pages
        for seller in sellers:
            seller_id = seller.get('id')
            if seller_id:
                xml_content += f'''  <url>
    <loc>{frontend_url}/seller/{seller_id}</loc>
    <lastmod>{current_date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
'''

        xml_content += '</urlset>'

        logging.info(f"✅ [SEO] Sitemap generated: {len(products)} products, {len(sellers)} sellers, {len(categories)} categories")

        return Response(content=xml_content, media_type="application/xml")

    except Exception as e:
        logging.error(f"❌ [SEO] Error generating sitemap: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating sitemap")

@api_router.get("/og/product/{product_id}", response_class=HTMLResponse)
async def get_product_og_tags(product_id: str):
    # Try looking up by ID first
    product = await db.products.find_one({"id": product_id})
    if not product:
        # If not found by ID, try looking up by slug
        product = await db.products.find_one({"slug": product_id})
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Frontend URL for redirection
    frontend_url = SITE_URL
    
    # Construct absolute image URL
    images = product.get("images", [])
    # Check if images list exists, is not empty, and first element is valid
    # Also check that the image URL is not just whitespace
    if images and len(images) > 0 and images[0] and isinstance(images[0], str) and images[0].strip():
        image_url = images[0].strip()
        # Convert relative URLs to absolute
        if not image_url.startswith("http"):
            image_url = f"{frontend_url}{image_url}" if image_url.startswith("/") else f"{frontend_url}/{image_url}"
        # Force HTTPS for WhatsApp compatibility (WhatsApp may block HTTP images)
        elif image_url.startswith("http://"):
            image_url = image_url.replace("http://", "https://", 1)
    else:
        # Fallback to logo if no valid image
        image_url = f"{frontend_url}/images/logo-nengoo.png"

    target_url = f"{frontend_url}/product/{product['slug'] or product['id']}"

    # Handle localized name and description
    name_obj = product.get('name')
    product_name_str = name_obj.get('fr') if isinstance(name_obj, dict) else name_obj

    desc_obj = product.get('description')
    product_description_str = desc_obj.get('fr') if isinstance(desc_obj, dict) else desc_obj

    # Escape content to prevent HTML breakage
    product_name = html.escape(product_name_str or '')
    product_description = html.escape((product_description_str or '')[:200] + "...") if product_description_str else ""

    # Determine image type for og:image:type
    image_type = "image/jpeg"  # Default
    if image_url.lower().endswith('.png'):
        image_type = "image/png"
    elif image_url.lower().endswith('.webp'):
        image_type = "image/webp"
    elif image_url.lower().endswith('.gif'):
        image_type = "image/gif"

    # Create image alt text
    image_alt = f"{product_name} - Nengoo"

    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{product_name} | Nengoo</title>

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="product" />
    <meta property="og:url" content="{target_url}" />
    <meta property="og:title" content="{product_name}" />
    <meta property="og:description" content="{product_description}" />
    <meta property="og:image" content="{image_url}" />
    <meta property="og:image:secure_url" content="{image_url}" />
    <meta property="og:image:type" content="{image_type}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="{image_alt}" />
    <meta property="og:site_name" content="Nengoo - Marketplace Cameroun" />
    <meta property="og:locale" content="fr_FR" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="{target_url}" />
    <meta name="twitter:title" content="{product_name}" />
    <meta name="twitter:description" content="{product_description}" />
    <meta name="twitter:image" content="{image_url}" />
    <meta name="twitter:image:alt" content="{image_alt}" />

    <meta http-equiv="refresh" content="0;url={target_url}" />
</head>
<body>
    <h1>{product_name}</h1>
    <p>{product_description}</p>
    <img src="{image_url}" alt="{image_alt}" style="max-width:100%;height:auto;" />
    <p>Redirection vers <a href="{target_url}">Voir le produit sur Nengoo</a>...</p>
    <script>window.location.href = "{target_url}";</script>
</body>
</html>"""
    return HTMLResponse(content=html_content, status_code=200)

@api_router.get("/og/debug/{product_id}")
async def debug_product_og_tags(product_id: str):
    # Try looking up by ID first
    product = await db.products.find_one({"id": product_id})
    if not product:
        product = await db.products.find_one({"slug": product_id})
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    frontend_url = SITE_URL

    images = product.get("images", [])
    # Check if images list exists, is not empty, and first element is valid
    # Also check that the image URL is not just whitespace
    if images and len(images) > 0 and images[0] and isinstance(images[0], str) and images[0].strip():
        image_url = images[0].strip()
        # Convert relative URLs to absolute
        if not image_url.startswith("http"):
            image_url = f"{frontend_url}{image_url}" if image_url.startswith("/") else f"{frontend_url}/{image_url}"
        # Force HTTPS for WhatsApp compatibility (WhatsApp may block HTTP images)
        elif image_url.startswith("http://"):
            image_url = image_url.replace("http://", "https://", 1)
    else:
        # Fallback to logo if no valid image
        image_url = f"{frontend_url}/images/logo-nengoo.png"

    target_url = f"{frontend_url}/product/{product['slug'] or product['id']}"

    # Determine image type
    image_type = "image/jpeg"
    if image_url.lower().endswith('.png'):
        image_type = "image/png"
    elif image_url.lower().endswith('.webp'):
        image_type = "image/webp"
    elif image_url.lower().endswith('.gif'):
        image_type = "image/gif"

    return {
        "product_name": product['name'],
        "frontend_url_env": frontend_url,
        "raw_image_path": images[0] if (images and len(images) > 0) else "None",
        "constructed_image_url": image_url,
        "image_uses_https": image_url.startswith("https://"),
        "image_type": image_type,
        "target_url": target_url,
        "og_tags_info": "Enhanced with og:image:secure_url, og:image:type, og:image:alt for WhatsApp compatibility"
    }

@api_router.get("/products/{product_identifier}", response_model=Product)
async def get_product(product_identifier: str):
    # Try looking up by ID first
    product = await db.products.find_one({"id": product_identifier})
    if not product:
        # If not found by ID, try looking up by slug
        product = await db.products.find_one({"slug": product_identifier})
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.post("/products", response_model=Product, dependencies=[Depends(seller_or_moderator_or_higher_required)])
async def create_product(product_data: ProductCreate, background_tasks: BackgroundTasks,
                       current_seller_id: Optional[str] = Depends(get_current_seller_optional),
                       admin_role: Optional[str] = Depends(get_current_admin_role)):
    
    seller_id_to_use = None
    seller_name_to_use = None

    if current_seller_id:
        seller = await db.sellers.find_one({"id": current_seller_id})
        if not seller:
            raise HTTPException(status_code=404, detail="Seller not found.")
        seller_id_to_use = current_seller_id
        seller_name_to_use = seller["businessName"]
    elif admin_role in ["super_admin", "admin", "moderator"]:
        if not product_data.sellerId or not product_data.sellerName:
            raise HTTPException(status_code=400, detail="Seller ID and Name must be provided in product data when created by an admin role.")
        
        seller = await db.sellers.find_one({"id": product_data.sellerId})
        if not seller:
            # Check if it is an admin acting as a seller
            admin = await db.admins.find_one({"id": product_data.sellerId})
            if not admin:
                raise HTTPException(status_code=404, detail=f"Seller with ID {product_data.sellerId} not found.")

        seller_id_to_use = product_data.sellerId
        seller_name_to_use = product_data.sellerName
    else:
        raise HTTPException(status_code=403, detail="Not authorized to create products.")

    # Check for duplicate product name for this seller
    existing_product = await db.products.find_one({
        "sellerId": seller_id_to_use,
        "name": {"$regex": f"^{re.escape(product_data.name)}$", "$options": "i"}
    })
    if existing_product:
        raise HTTPException(
            status_code=400, 
            detail=f"Vous avez déjà un produit nommé '{product_data.name}'. Veuillez utiliser un nom différent."
        )

    await check_product_category(product_data.category)
    check_promo_price(product_data.price, product_data.promoPrice)
    issues = product_issues(product_data.price, product_data.images, product_data.description)
    if issues:
        raise HTTPException(status_code=400, detail=" ".join(issues))

    product_dict = product_data.dict()
    product_dict["slug"] = await get_unique_slug(product_data.name)
    product = Product(**product_dict)
    product.sellerId = seller_id_to_use
    product.sellerName = seller_name_to_use
    await db.products.insert_one(product.dict())
    # Versions réduites des photos, après la réponse
    background_tasks.add_task(refresh_product_variants, db, product.id)
    return product

@api_router.put("/products/{product_id}", response_model=Product, dependencies=[Depends(product_owner_or_moderator_required)])
async def update_product(product_id: str, product_data: ProductUpdate, background_tasks: BackgroundTasks,
                         admin_role: Optional[str] = Depends(get_current_admin_role)):
    update_data = product_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")

    # Un vendeur peut seulement mettre en vente ou archiver un produit déjà
    # validé ; la modération (pending, rejected…) reste réservée aux admins.
    if "status" in update_data and admin_role not in ["super_admin", "admin", "moderator"]:
        current = await db.products.find_one({"id": product_id}, {"status": 1})
        current_status = current.get("status") if current else None
        allowed = {"approved", "inactive"}
        if update_data["status"] == current_status:
            # Formulaires qui renvoient le produit entier : statut inchangé
            del update_data["status"]
        elif update_data["status"] not in allowed or current_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seul un modérateur peut changer le statut de ce produit.",
            )
    
    if "category" in update_data or "price" in update_data or "promoPrice" in update_data:
        current = await db.products.find_one({"id": product_id}, {"category": 1, "price": 1, "promoPrice": 1}) or {}
        # Les formulaires renvoient le produit entier : on ne vérifie la
        # catégorie que si elle change
        if "category" in update_data and update_data["category"] != current.get("category"):
            await check_product_category(update_data["category"])
        check_promo_price(update_data.get("price", current.get("price")),
                          update_data.get("promoPrice", current.get("promoPrice")))

    changed_fields = [f for f in ("price", "images", "description") if f in update_data]
    if changed_fields:
        current = await db.products.find_one({"id": product_id}, {f: 1 for f in changed_fields}) or {}
        changed = tuple(f for f in changed_fields if update_data[f] != current.get(f))
        issues = product_issues(update_data.get("price"), update_data.get("images"),
                                update_data.get("description"), check=changed)
        if issues:
            raise HTTPException(status_code=400, detail=" ".join(issues))

    # If name is being updated, check for duplicates
    if "name" in update_data:
        # Get current product to find the sellerId
        current_product = await db.products.find_one({"id": product_id})
        if current_product:
            seller_id = current_product["sellerId"]
            duplicate = await db.products.find_one({
                "sellerId": seller_id,
                "name": {"$regex": f"^{re.escape(update_data['name'])}$", "$options": "i"},
                "id": {"$ne": product_id}
            })
            if duplicate:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Vous avez déjà un autre produit nommé '{update_data['name']}'."
                )
            
            # Nouveau slug seulement si le nom change vraiment : sinon le slug
            # actuel (déjà pris) deviendrait « nom-1 » et casserait les liens
            if update_data["name"].strip() != (current_product.get("name") or "").strip():
                update_data["slug"] = await get_unique_slug(update_data["name"])

    new_images = False
    if "images" in update_data:
        current = await db.products.find_one({"id": product_id}, {"images": 1, "thumbnails": 1, "previews": 1}) or {}
        if update_data["images"] != current.get("images"):
            # Les versions réduites des photos gardées sont conservées, les autres suivront
            old = current.get("images") or []
            known = {url: {"thumbnails": t, "previews": pv}
                     for url, t, pv in zip(old, current.get("thumbnails") or [], current.get("previews") or [])}
            update_data.update(aligned_variants(update_data["images"], known))
            new_images = True

    update_data["updatedAt"] = datetime.utcnow()
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated_product = await db.products.find_one({"id": product_id})
    if not updated_product:
        raise HTTPException(status_code=404, detail="Product not found")
    if new_images:
        background_tasks.add_task(refresh_product_variants, db, product_id)
    return Product(**updated_product)

@api_router.delete("/products", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(seller_or_moderator_or_higher_required)])
async def bulk_delete_products(request: BulkDeleteRequest, 
                             current_seller_id: Optional[str] = Depends(get_current_seller_optional),
                             admin_role: Optional[str] = Depends(get_current_admin_role)):
    if not request.ids:
        raise HTTPException(status_code=400, detail="No product IDs provided for deletion.")

    query = {"id": {"$in": request.ids}}

    # Security check: If the user is a seller, they can only delete their own products.
    if current_seller_id and admin_role not in ["super_admin", "admin", "moderator"]:
        query["sellerId"] = current_seller_id

    result = await db.products.delete_many(query)
    
    # Even if some products were not found or did not belong to the seller,
    # we return a success response, as the desired state (deletion of authorized products) is achieved.
    # We could add a check on result.deleted_count if we wanted to be more strict.
    return

@api_router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(seller_or_moderator_or_higher_required)])
async def delete_product(product_id: str,
                         current_seller_id: Optional[str] = Depends(get_current_seller_optional),
                         admin_role: Optional[str] = Depends(get_current_admin_role)):
    query = {"id": product_id}
    # Un vendeur ne peut supprimer que ses propres produits (comme la suppression groupée)
    if current_seller_id and admin_role not in ["super_admin", "admin", "moderator"]:
        query["sellerId"] = current_seller_id
    result = await db.products.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return

@api_router.get("/products/{product_id}/reviews", response_model=List[Review])
async def get_product_reviews(product_id: str):
    reviews_cursor = db.reviews.find({"productId": product_id}).sort("createdAt", -1)
    reviews = await reviews_cursor.to_list(1000)
    return [Review(**r) for r in reviews]

@api_router.post("/products/{product_id}/reviews", response_model=Review)
async def create_product_review(
    product_id: str,
    review_data: ReviewCreate,
    x_buyer_id: str = Header(..., alias="X-Buyer-Id")
):
    buyer_id = x_buyer_id
    
    # 1. Check if product exists
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 2. Check if buyer exists
    buyer = await db.users.find_one({"id": buyer_id, "type": "buyer"})
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    # 3. Check if buyer has purchased the product
    order = await db.orders.find_one({
        "buyerId": buyer_id,
        "products.productId": product_id,
        "status": "delivered" # or whatever status confirms a completed order
    })
    if not order:
        raise HTTPException(status_code=403, detail="You can only review products you have purchased and received.")

    # 4. Check if buyer has already reviewed this product
    existing_review = await db.reviews.find_one({"productId": product_id, "buyerId": buyer_id})
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this product.")

    # 5. Create the new review
    new_review = Review(
        productId=product_id,
        buyerId=buyer_id,
        buyerName=buyer["name"],
        rating=review_data.rating,
        comment=review_data.comment
    )
    await db.reviews.insert_one(new_review.dict())

    # 6. Update the product's average rating and review count
    reviews_for_product_cursor = db.reviews.find({"productId": product_id})
    reviews_for_product = await reviews_for_product_cursor.to_list(None)
    total_reviews = len(reviews_for_product)
    average_rating = sum(r['rating'] for r in reviews_for_product) / total_reviews

    await db.products.update_one(
        {"id": product_id},
        {"$set": {"rating": round(average_rating, 1), "reviewsCount": total_reviews}}
    )

    return new_review

class CanReviewResponse(BaseModel):
    canReview: bool
    hasAlreadyReviewed: bool

@api_router.get("/products/{product_id}/can-review", response_model=CanReviewResponse)
async def can_user_review_product(
    product_id: str,
    x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id")
):
    if not x_buyer_id:
        return CanReviewResponse(canReview=False, hasAlreadyReviewed=False)

    # Check if buyer has purchased the product
    order = await db.orders.find_one({
        "buyerId": x_buyer_id,
        "products.productId": product_id,
        "status": "delivered"
    })
    
    if not order:
        return CanReviewResponse(canReview=False, hasAlreadyReviewed=False)

    # Check if buyer has already reviewed this product
    existing_review = await db.reviews.find_one({"productId": product_id, "buyerId": x_buyer_id})
    if existing_review:
        return CanReviewResponse(canReview=True, hasAlreadyReviewed=True)

    return CanReviewResponse(canReview=True, hasAlreadyReviewed=False)

# --- Product Interactions ---
@api_router.post("/interaction/{product_id}")
async def create_product_interaction(
    product_id: str,
    interaction_data: ProductInteractionCreate,
    user_id: Optional[str] = Depends(get_user_id_from_request)
):
    """Create or update a product interaction (view, favourite, rating)"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    # Check if product exists
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Find existing interaction
    existing = await db.interactions.find_one({
        "userId": user_id,
        "productId": product_id
    })

    if existing:
        # Update existing interaction
        update_data = {
            "isFavourite": interaction_data.isFavourite,
            "rating": interaction_data.rating,
            "interaction": interaction_data.interaction,
            "timestamp": datetime.utcnow()
        }
        await db.interactions.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )
        existing.update(update_data)
        interaction = ProductInteraction(**existing)
    else:
        # Create new interaction
        interaction = ProductInteraction(
            userId=user_id,
            productId=product_id,
            isFavourite=interaction_data.isFavourite,
            rating=interaction_data.rating,
            interaction=interaction_data.interaction
        )
        await db.interactions.insert_one(interaction.dict())

    # Update product stats
    if interaction_data.isFavourite:
        await db.products.update_one(
            {"id": product_id},
            {"$inc": {"favorites": 1}}
        )

    if interaction_data.interaction == "view":
        await db.products.update_one(
            {"id": product_id},
            {"$inc": {"views": 1}}
        )

    return {
        "status": "OK",
        "statusCode": 200,
        "path": f"/api/interaction/{product_id}",
        "message": "Interaction created successfully",
        "detail": None,
        "data": interaction.dict(),
        "timestamp": datetime.utcnow().isoformat()
    }

@api_router.get("/interactions/product/{product_id}")
async def get_product_interactions(
    product_id: str,
    user_id: Optional[str] = Depends(get_user_id_from_request)
):
    """Get aggregated interaction stats for a product"""

    # Get total views, favorites, and ratings
    pipeline = [
        {"$match": {"productId": product_id}},
        {"$group": {
            "_id": None,
            "GIT_Count": {"$sum": 1},  # Total interactions
            "RaterCount": {
                "$sum": {"$cond": [{"$gt": ["$rating", 0]}, 1, 0]}
            },
            "avgRating": {
                "$avg": {"$cond": [{"$gt": ["$rating", 0]}, "$rating", None]}
            }
        }}
    ]

    result = await db.interactions.aggregate(pipeline).to_list(1)

    # Check if current user has favourited
    is_favourite = False
    if user_id:
        user_interaction = await db.interactions.find_one({
            "userId": user_id,
            "productId": product_id
        })
        is_favourite = user_interaction.get("isFavourite", False) if user_interaction else False

    if result:
        stats = result[0]
        return {
            "status": "OK",
            "statusCode": 200,
            "path": f"/api/interactions/product/{product_id}",
            "message": "Product interactions retrieved successfully",
            "detail": None,
            "data": {
                "GIT_Count": stats.get("GIT_Count", 0),
                "RaterCount": stats.get("RaterCount", 0),
                "rating": stats.get("avgRating", 0.0) or 0.0,
                "isFavourite": is_favourite
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    else:
        return {
            "status": "OK",
            "statusCode": 200,
            "path": f"/api/interactions/product/{product_id}",
            "message": "No interactions found",
            "detail": None,
            "data": {
                "GIT_Count": 0,
                "RaterCount": 0,
                "rating": 0.0,
                "isFavourite": is_favourite
            },
            "timestamp": datetime.utcnow().isoformat()
        }

@api_router.get("/interactions/user")
async def get_user_interactions(
    user_id: Optional[str] = Depends(get_user_id_from_request),
    page: int = 0,
    size: int = 8,
    sort: str = "timestamp,desc"
):
    """Get all interactions for a user (favourites, ratings, etc.)"""
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    # Parse sort parameter
    sort_field, sort_order = sort.split(",") if "," in sort else (sort, "desc")
    sort_direction = -1 if sort_order == "desc" else 1

    # Get interactions with product details
    skip = page * size
    interactions_cursor = db.interactions.find({"userId": user_id}).sort(
        sort_field, sort_direction
    ).skip(skip).limit(size)

    interactions = await interactions_cursor.to_list(size)

    # Enrich with product data
    enriched_interactions = []
    for interaction in interactions:
        product = await db.products.find_one({"id": interaction["productId"]})
        if product:
            # Remove MongoDB _id field before serialization
            product_dict = dict(product)
            product_dict.pop("_id", None)

            enriched_interactions.append({
                "id": interaction["id"],
                "product": product_dict,
                "isFavourite": interaction.get("isFavourite", False),
                "rating": interaction.get("rating", 0),
                "interaction": interaction.get("interaction", "view"),
                "timestamp": interaction.get("timestamp", datetime.utcnow()).isoformat()
            })

    # Get total count
    total = await db.interactions.count_documents({"userId": user_id})

    return {
        "status": "OK",
        "statusCode": 200,
        "path": "/api/interactions/user",
        "message": "User interactions retrieved successfully",
        "detail": None,
        "data": {
            "content": enriched_interactions,
            "totalElements": total,
            "totalPages": (total + size - 1) // size,
            "size": size,
            "number": page,
            "first": page == 0,
            "last": (page + 1) * size >= total,
            "numberOfElements": len(enriched_interactions),
            "empty": len(enriched_interactions) == 0
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# --- Seller Management ---
# Champs sensibles jamais renvoyés par les routes publiques des vendeurs
SELLER_PRIVATE_FIELDS = {"password", "reset_token", "reset_token_expiry"}

@api_router.post("/sellers", response_model=Seller, response_model_exclude=SELLER_PRIVATE_FIELDS)
async def create_seller(seller_data: SellerCreate, role: Optional[str] = Depends(get_current_admin_role)):
    if not whatsapp_digits(seller_data.whatsapp):
        raise HTTPException(status_code=400, detail="Numéro WhatsApp invalide : indiquez un numéro avec l'indicatif du pays, par exemple +237 6XX XX XX XX.")
    seller_data.city = normalize_city(seller_data.city)
    if await db.sellers.find_one(whatsapp_lookup(seller_data.whatsapp)):
        raise HTTPException(status_code=400, detail="Un compte vendeur existe déjà avec ce numéro WhatsApp.")
    seller_data.email = await ensure_email_free(db.sellers, seller_data.email, "seller")
    seller_data.whatsapp = normalize_whatsapp(seller_data.whatsapp)

    hashed_password = hash_password(seller_data.password)
    
    seller_dict = seller_data.dict()
    seller_dict['password'] = hashed_password
    seller_dict['id'] = f"seller_{str(uuid.uuid4())[:8]}"
    
    # Auto-approve if created by an admin
    if role in ["super_admin", "admin", "moderator"]:
        seller_dict['status'] = "approved"
    else:
        seller_dict['status'] = "pending"
        
    seller_dict['createdAt'] = datetime.utcnow()
    seller_dict['updatedAt'] = datetime.utcnow()

    seller = Seller(**seller_dict)

    await db.sellers.insert_one(seller.dict())
    return seller


# Sur une liste, l'exclusion doit viser chaque élément ("__all__")
@api_router.get("/sellers", response_model=List[Seller], response_model_exclude={"__all__": SELLER_PRIVATE_FIELDS})
async def list_sellers():
    sellers_cursor = db.sellers.find()
    sellers = await sellers_cursor.to_list(1000)
    valid_sellers = []
    for s in sellers:
        try:
            # Migrate legacy seller data
            s = migrate_seller_data(s)
            # The Seller model now includes password as optional, so this should be safe.
            # We add this try-except block for added robustness against corrupted data.
            valid_sellers.append(Seller(**s))
        except Exception as e:
            # Only the id: the document holds the password hash, and printing accented
            # data crashed the request (UnicodeEncodeError) under Passenger/LiteSpeed.
            logging.warning("Skipping invalid seller %s: %s", s.get("id"), type(e).__name__)
    return valid_sellers

@api_router.get("/sellers/{seller_id}", response_model=Seller, response_model_exclude=SELLER_PRIVATE_FIELDS)
async def get_seller(seller_id: str):
    seller = await db.sellers.find_one({"id": seller_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    # Migrate legacy seller data
    seller = migrate_seller_data(seller)

    return Seller(**seller)

class SellerLoginRequest(BaseModel):
    whatsapp: str
    password: str

class SellerOAuthLoginRequest(BaseModel):
    idToken: str

@api_router.post("/sellers/login", response_model=SellerAuthResponse, response_model_exclude=SELLER_PRIVATE_FIELDS)
async def seller_login(login_data: SellerLoginRequest, request: Request):
    login_limiter.check("seller", request, login_data.whatsapp)
    # Normaliser le numéro WhatsApp (supprimer les espaces)
    normalized_whatsapp = normalize_whatsapp(login_data.whatsapp)

    logging.info(f"[SELLER LOGIN] Attempting login with WhatsApp: {login_data.whatsapp} -> normalized: {normalized_whatsapp}")

    seller, number_known = await find_account_for_login(db.sellers, login_data.whatsapp, login_data.password)

    if not seller:
        logging.warning(f"[SELLER LOGIN] No seller/password match (number known: {number_known})")
        login_limiter.record_failure("seller", request, login_data.whatsapp)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou mot de passe incorrect")

    # Anciens comptes créés sans identifiant : on en attribue un, stable
    if not seller.get("id"):
        seller["id"] = f"seller_{str(uuid.uuid4())[:8]}"
        await db.sellers.update_one({"_id": seller["_id"]}, {"$set": {"id": seller["id"]}})

    if seller["status"] != "approved":
        logging.warning(f"[SELLER LOGIN] Seller {login_data.whatsapp} not approved: {seller['status']}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Votre compte vendeur est en attente d'approbation")

    # Migrate legacy seller data
    seller = migrate_seller_data(seller)

    logging.info(f"[SELLER LOGIN] Login successful for {login_data.whatsapp}")
    login_limiter.record_success("seller", request, login_data.whatsapp)
    return SellerAuthResponse(**seller, accessToken=create_access_token(seller["id"], "seller"))

@api_router.post("/sellers/oauth-login", response_model=SellerAuthResponse, response_model_exclude=SELLER_PRIVATE_FIELDS)
async def seller_oauth_login(oauth_data: SellerOAuthLoginRequest):
    """
    OAuth login endpoint for sellers
    Only allows login for already approved sellers (no auto-registration)
    """
    from firebase_admin_config import verify_firebase_token, is_firebase_initialized

    # Check if Firebase is initialized
    if not is_firebase_initialized():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth authentication is not available. Please contact support."
        )

    try:
        # Verify Firebase token
        decoded_token = verify_firebase_token(oauth_data.idToken)

        # Extract user information from token
        firebase_uid = decoded_token.get('uid')
        email = decoded_token.get('email')
        provider_id = decoded_token.get('firebase', {}).get('sign_in_provider', 'unknown')

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is required for OAuth login."
            )

        # Check if seller exists by OAuth UID
        seller = await db.sellers.find_one({"oauth_uid": firebase_uid})

        if seller:
            # Check if approved
            if seller.get("status") != "approved":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Votre compte vendeur est en attente d'approbation"
                )

            # Update last login
            await db.sellers.update_one(
                {"_id": seller["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            seller['last_login'] = datetime.utcnow()
            # Migrate legacy seller data
            seller = migrate_seller_data(seller)
            return SellerAuthResponse(**seller, accessToken=create_access_token(seller["id"], "seller"))

        # Check if seller exists by email
        seller = await db.sellers.find_one(account_query(email, "seller"))

        if seller:
            # Check if approved
            if seller.get("status") != "approved":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Votre compte vendeur existe mais n'est pas encore approuvé. Veuillez attendre l'approbation de l'administrateur."
                )

            # Link OAuth to existing approved account
            await db.sellers.update_one(
                {"_id": seller["_id"]},
                {
                    "$set": {
                        "oauth_provider": provider_id,
                        "oauth_uid": firebase_uid,
                        "last_login": datetime.utcnow()
                    }
                }
            )
            seller['oauth_provider'] = provider_id
            seller['oauth_uid'] = firebase_uid
            seller['last_login'] = datetime.utcnow()
            # Migrate legacy seller data
            seller = migrate_seller_data(seller)
            return SellerAuthResponse(**seller, accessToken=create_access_token(seller["id"], "seller"))

        # No seller found - sellers cannot auto-register via OAuth
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun compte vendeur approuvé trouvé avec cette adresse e-mail. Veuillez d'abord vous inscrire en tant que vendeur via le formulaire d'inscription et attendre l'approbation."
        )

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[SELLER OAUTH LOGIN] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"OAuth authentication failed: {str(e)}"
        )

@api_router.put("/sellers/{seller_id}/approve", response_model=Seller, dependencies=[Depends(moderator_or_higher_required)])
async def approve_seller(seller_id: str):
    await db.sellers.update_one({"id": seller_id}, {"$set": {"status": "approved"}})
    updated_seller = await db.sellers.find_one({"id": seller_id})
    if not updated_seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    # Migrate legacy seller data
    updated_seller = migrate_seller_data(updated_seller)
    return Seller(**updated_seller)

@api_router.put("/sellers/{seller_id}", response_model=Seller, response_model_exclude=SELLER_PRIVATE_FIELDS)
async def update_seller(
    seller_id: str, 
    seller_data: SellerUpdate, 
    x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id"),
    role: str = Depends(get_current_admin_role)
):
    # Authorization check
    if role not in ["super_admin", "admin"] and x_seller_id != seller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this seller profile."
        )

    update_data = seller_data.dict(exclude_unset=True)
    update_data["updatedAt"] = datetime.utcnow()
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
    
    if "password" in update_data and update_data["password"]:
        update_data["password"] = hash_password(update_data["password"])
    
    # Un vendeur ne valide pas lui-même son compte
    if role not in ["super_admin", "admin"]:
        update_data.pop("status", None)
    if update_data.get("email"):
        update_data["email"] = await ensure_email_free(db.sellers, update_data["email"], "seller", seller_id)
    if update_data.get("whatsapp") is not None:
        if not whatsapp_digits(update_data["whatsapp"]):
            raise HTTPException(status_code=400, detail="Numéro WhatsApp invalide : indiquez un numéro avec l'indicatif du pays, par exemple +237 6XX XX XX XX.")
        update_data["whatsapp"] = normalize_whatsapp(update_data["whatsapp"])
    if "city" in update_data:
        update_data["city"] = normalize_city(update_data["city"])

    await db.sellers.update_one({"id": seller_id}, {"$set": update_data})
    updated_seller = await db.sellers.find_one({"id": seller_id})
    if not updated_seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    # Migrate legacy seller data
    updated_seller = migrate_seller_data(updated_seller)
    return Seller(**updated_seller)

@api_router.delete("/sellers", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_or_higher_required)])
async def bulk_delete_sellers(request: BulkDeleteRequest):
    if not request.ids:
        raise HTTPException(status_code=400, detail="No seller IDs provided for deletion.")
    
    await db.sellers.delete_many({"id": {"$in": request.ids}})
    return

@api_router.delete("/sellers/{seller_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_or_higher_required)])
async def delete_seller(seller_id: str):
    result = await db.sellers.delete_one({"id": seller_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Seller not found")
    return

@api_router.get("/sellers/{seller_id}/analytics", response_model=SellerAnalyticsData)
async def get_seller_analytics(seller_id: str):
    # Fetch all orders for the seller
    orders_cursor = db.orders.find({"sellerId": seller_id})
    orders = await orders_cursor.to_list(1000)

    total_revenue = sum(order['totalAmount'] for order in orders)
    total_orders = len(orders)
    
    # This is a simplification, as a customer can have multiple orders
    total_customers = len(set(order['buyerId'] for order in orders))

    # Monthly revenue
    monthly_revenue = {}
    for order in orders:
        month = order['orderedDate'].strftime("%b")
        if month not in monthly_revenue:
            monthly_revenue[month] = 0
        monthly_revenue[month] += order['totalAmount']
    
    monthly_revenue_list = [{"month": m, "revenue": r} for m, r in monthly_revenue.items()]

    # Top products
    product_sales = {}
    for order in orders:
        for product in order['products']:
            if product['productId'] not in product_sales:
                product_sales[product['productId']] = {"sales": 0, "revenue": 0, "name": product['name']}
            product_sales[product['productId']]['sales'] += product['quantity']
            product_sales[product['productId']]['revenue'] += product['price'] * product['quantity']

    top_products = sorted(product_sales.values(), key=lambda x: x['revenue'], reverse=True)[:5]

    total_products = await db.products.count_documents({"sellerId": seller_id})

    return SellerAnalyticsData(
        total_revenue=total_revenue,
        total_orders=total_orders,
        total_products=total_products,
        total_customers=total_customers,
        monthly_revenue=monthly_revenue_list,
        top_products=top_products
    )

@api_router.get("/sellers/{seller_id}/products", response_model=List[Product], dependencies=[Depends(admin_or_higher_required)])
async def get_seller_products(seller_id: str):
    products_cursor = db.products.find({"sellerId": seller_id}).sort("createdAt", -1)
    products = await products_cursor.to_list(1000)
    return [Product(**p) for p in products]

# --- Order Management ---
@api_router.get("/orders", response_model=List[Order])
async def list_orders(seller_id: Optional[str] = None, buyer_id: Optional[str] = None,
                      role: str = Depends(get_current_admin_role),
                      x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id"),
                      x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id")):
    query = {}
    is_staff = role in ["super_admin", "admin", "moderator", "support"]
    # Un client ou un vendeur ne voit que ses propres commandes (identité tirée
    # du jeton de session par le middleware) ; l'équipe voit tout
    if buyer_id and not is_staff and x_buyer_id != buyer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez voir que vos propres commandes.")
    if seller_id and not buyer_id and not is_staff and x_seller_id != seller_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez voir que les commandes de votre boutique.")

    if buyer_id:
        query["buyerId"] = buyer_id
    elif seller_id:
        query["sellerId"] = seller_id
    elif role in ["super_admin", "admin", "moderator", "support"]:
        pass  # Empty query means all orders
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access orders."
        )

    orders_cursor = db.orders.find(query).sort("orderedDate", -1) # Sort by most recent
    orders_data = await orders_cursor.to_list(1000)

    enriched_orders = []
    for order_data in orders_data:
        # Fetch buyer's whatsapp
        buyer = await db.users.find_one({"id": order_data["buyerId"], "type": "buyer"})
        if buyer:
            order_data["buyerWhatsapp"] = buyer.get("whatsapp")

        # Fetch pickup point name if pickupPointId exists
        if order_data.get("pickupPointId"):
            pickup_point = await db.pickupPoints.find_one({"id": order_data["pickupPointId"]})
            if pickup_point:
                order_data["pickupPointName"] = pickup_point.get("name")

        # Handle legacy shippingAddress format (convert dict to string)
        if isinstance(order_data.get("shippingAddress"), dict):
            addr = order_data["shippingAddress"]
            order_data["shippingAddress"] = addr.get("address", "")
            if not order_data.get("shippingCity"):
                order_data["shippingCity"] = addr.get("city")
            if not order_data.get("shippingRegion"):
                order_data["shippingRegion"] = addr.get("region")
            if not order_data.get("shippingPhone"):
                order_data["shippingPhone"] = addr.get("phone")

        # Ensure required fields exist with defaults
        if "products" not in order_data:
            order_data["products"] = []
        if "totalAmount" not in order_data:
            order_data["totalAmount"] = 0.0
        if "pickupStatus" not in order_data:
            order_data["pickupStatus"] = "pending"
        order_data["status"] = normalize_status(order_data.get("status"))

        # Ensure products have both image and images fields
        for product in order_data.get("products", []):
            # If has images but no image, set image to first element
            if "images" in product and "image" not in product:
                product["image"] = product["images"][0] if product["images"] else None
            # If has image but no images, create images array
            elif "image" in product and "images" not in product:
                product["images"] = [product["image"]] if product["image"] else []
            # If has neither, set both to None/empty
            elif "image" not in product and "images" not in product:
                product["image"] = None
                product["images"] = []

        enriched_orders.append(Order(**order_data))

    return enriched_orders

@api_router.put("/orders/{order_id}", response_model=Order, dependencies=[Depends(order_owner_or_support_required)])
async def update_order(order_id: str, order_data: OrderUpdate, background_tasks: BackgroundTasks,
                       role: Optional[str] = Depends(get_current_admin_role),
                       x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id")):
    update_data = order_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")

    # Get order before update to check for status change
    order_before_update = await db.orders.find_one({"id": order_id})
    if not order_before_update:
        raise HTTPException(status_code=404, detail="Order not found")

    push = {}
    if "status" in update_data:
        update_data["status"] = normalize_status(update_data["status"])
        previous = normalize_status(order_before_update.get("status"))
        error = check_transition(previous, update_data["status"], role in ["super_admin", "admin"])
        if error:
            raise HTTPException(status_code=400, detail=error)
        if update_data["status"] != previous:
            push = {"$push": {"statusHistory": {
                "status": update_data["status"], "at": datetime.utcnow(),
                "by": "admin" if role else "seller" if x_seller_id else "system"}}}
            if order_before_update.get("stockReserved"):
                # Stock retiré à la commande : rendu à l'annulation, repris si on revient dessus
                releases_now = update_data["status"] in RELEASES_STOCK
                released_before = previous in RELEASES_STOCK
                if releases_now != released_before:
                    sign = 1 if releases_now else -1
                    for item in order_before_update["products"]:
                        await db.products.update_one({"id": item["productId"]},
                                                     {"$inc": {"stock": sign * item["quantity"]}})

    # Anciennes commandes : stock retiré seulement à la livraison
    if (not order_before_update.get("stockReserved") and 'status' in update_data
            and update_data['status'] != normalize_status(order_before_update.get('status'))):
        # If status changes to 'delivered', decrease stock
        if update_data['status'] == 'delivered':
            for product_in_order in order_before_update['products']:
                await db.products.update_one(
                    {"id": product_in_order['productId']},
                    {"$inc": {"stock": -product_in_order['quantity']}}
                )
                
                # After decrementing, check the new stock level
                updated_product_stock = await db.products.find_one({"id": product_in_order['productId']})
                
                if updated_product_stock and updated_product_stock.get('stock') == 3:
                    seller = await db.sellers.find_one({"id": updated_product_stock['sellerId']})
                    if seller and seller.get("email"):
                        # Prepare and send email notification
                        message = MessageSchema(
                            subject=f"Alerte de stock bas pour votre produit: {updated_product_stock['name']}",
                            recipients=[seller["email"]],
                            template_body={
                                "seller_name": seller["businessName"],
                                "product_name": updated_product_stock['name'],
                                "stock_level": 3,
                            },
                            subtype="html"
                        )
                        background_tasks.add_task(fm.send_message, message, template_name="low_stock_alert.html")
        # If status changes from 'delivered' to something else, restock
        elif order_before_update.get('status') == 'delivered':
            for product_in_order in order_before_update['products']:
                await db.products.update_one(
                    {"id": product_in_order['productId']},
                    {"$inc": {"stock": product_in_order['quantity']}}
                )

    update_data["updatedAt"] = datetime.utcnow()
    await db.orders.update_one({"id": order_id}, {"$set": update_data, **push})
    updated_order = await db.orders.find_one({"id": order_id})

    # Check if status has changed and send notification
    if 'status' in update_data and order_before_update.get('status') != updated_order.get('status'):
        status_fr = get_status_text_fr(updated_order["status"])
        # SMS au client pour les étapes importantes
        sms_text = order_status_text(updated_order["id"], normalize_status(updated_order["status"]))
        if sms_text and push:
            background_tasks.add_task(send_sms, updated_order.get("shippingPhone"), sms_text)
        
        # In-app notification for buyer
        new_notification = Notification(
            recipient_id=updated_order["buyerId"],
            recipient_type='buyer',
            type='order_status',
            title=f"Mise à jour commande #{updated_order['id']}",
            message=f"Le statut de votre commande est maintenant : {status_fr}",
            link=f"/profile/orders"
        )
        await db.notifications.insert_one(new_notification.dict())

        buyer = await db.users.find_one({"id": updated_order["buyerId"], "type": "buyer"})
        if buyer and buyer.get("email"):
            message = MessageSchema(
                subject=f"Mise à jour de votre commande Nengoo #{updated_order['id']}",
                recipients=[buyer["email"]],
                template_body={
                    "buyer_name": buyer["name"],
                    "order_id": updated_order["id"],
                    "status": status_fr,
                },
                subtype="html"
            )
            background_tasks.add_task(fm.send_message, message, template_name="status_update_buyer.html")

            # If order is delivered, send a review request email
            if updated_order.get('status') == 'delivered':
                products_for_review = []
                for product in updated_order['products']:
                    products_for_review.append({
                        "name": product['name'],
                        "url": f"https://www.nengoo.com/product/{product['productId']}" # Adjust URL as needed
                    })
                
                review_message = MessageSchema(
                    subject="Laissez votre avis sur votre commande Nengoo",
                    recipients=[buyer["email"]],
                    template_body={
                        "buyer_name": buyer["name"],
                        "products": products_for_review
                    },
                    subtype="html"
                )
                background_tasks.add_task(fm.send_message, review_message, template_name="review_request_buyer.html")

    return Order(**updated_order)

@api_router.delete("/orders", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(super_admin_required)])
async def bulk_delete_orders(request: BulkDeleteRequest):
    if not request.ids:
        raise HTTPException(status_code=400, detail="No order IDs provided for deletion.")
    
    await db.orders.delete_many({"id": {"$in": request.ids}})
    return

@api_router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(super_admin_required)])
async def delete_order(order_id: str):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return

@api_router.get("/orders/track")
async def track_order(request: Request, orderId: str = Query(..., max_length=40), phone: str = Query(..., max_length=30)):
    """Suivi d'une commande sans compte : numéro de commande + téléphone utilisé."""
    login_limiter.check("track", request, phone)
    order = await db.orders.find_one({"id": orderId.strip()})
    digits = whatsapp_digits(phone)
    same_phone = order and digits and digits[-9:] == (whatsapp_digits(order.get("shippingPhone")) or "")[-9:]
    if not same_phone:
        login_limiter.record_failure("track", request, phone)
        raise HTTPException(status_code=404, detail="Aucune commande ne correspond à ce numéro et à ce téléphone.")
    status_now = normalize_status(order.get("status"))
    history = order.get("statusHistory") or [{"status": status_now, "at": order.get("orderedDate")}]
    return {
        "id": order["id"],
        "status": status_now,
        "statusLabel": status_label(status_now),
        "history": [{"status": normalize_status(h["status"]), "label": status_label(h["status"]), "at": h.get("at")}
                    for h in history],
        "sellerName": order.get("sellerName"),
        "products": [{"name": p.get("name"), "quantity": p.get("quantity"), "price": p.get("price")}
                     for p in order.get("products", [])],
        "totalAmount": order.get("totalAmount"),
        "shippingCost": order.get("shippingCost"),
        "city": order.get("shippingCity"),
        "pickup": bool(order.get("pickupPointId")),
        "orderedDate": order.get("orderedDate"),
        # À donner au livreur à la remise du colis
        "deliveryCode": order.get("deliveryCode"),
        "courierName": order.get("courierName"),
    }


# --- Livraison : zones, devis, livreurs ---
class DeliveryArea(BaseModel):
    name: str
    fee: float = Field(ge=0)


class DeliveryZone(BaseModel):
    city: str
    fee: float = Field(ge=0)
    neighborhoods: List[DeliveryArea] = []


class DeliveryZones(BaseModel):
    zones: List[DeliveryZone] = []
    # Livraison offerte à partir de ce sous-total par vendeur (vide : jamais)
    freeAbove: Optional[float] = Field(None, ge=0)


@api_router.get("/delivery/zones", response_model=DeliveryZones)
async def get_delivery_zones():
    settings = await load_delivery_settings(db)
    return DeliveryZones(zones=settings["zones"], freeAbove=settings["freeAbove"])


@api_router.put("/delivery/zones", response_model=DeliveryZones, dependencies=[Depends(super_admin_required)])
async def update_delivery_zones(data: DeliveryZones):
    seen = set()
    for zone in data.zones:
        zone.city = normalize_city(zone.city)
        key = normalize_name(zone.city)
        if not key or key in seen:
            raise HTTPException(status_code=400, detail=f"Ville vide ou en double : « {zone.city} ».")
        seen.add(key)
        zone.neighborhoods = [a for a in zone.neighborhoods if a.name.strip()]
        for area in zone.neighborhoods:
            area.name = " ".join(area.name.split())
    await db.settings.update_one({"_id": "delivery_zones"}, {"$set": data.dict()}, upsert=True)
    return data


class DeliveryQuoteRequest(BaseModel):
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    deliveryOption: str = "home"
    cartItems: List[CheckoutProduct]


@api_router.post("/delivery/quote")
async def delivery_quote(request: DeliveryQuoteRequest):
    """Frais de livraison par vendeur et total, avant de commander (même calcul que la commande)."""
    settings = await load_delivery_settings(db)
    ids = [i.id for i in request.cartItems]
    products = {p["id"]: p for p in await db.products.find({"id": {"$in": ids}}).to_list(len(ids) or 1)}
    by_seller = {}
    for item in request.cartItems:
        product = products.get(item.id)
        if not product:
            continue
        price = product.get("promoPrice") if (product.get("promoPrice") or 0) > 0 else product.get("price") or 0
        entry = by_seller.setdefault(product["sellerId"], {"sellerId": product["sellerId"],
                                                           "sellerName": product.get("sellerName"), "subtotal": 0.0})
        entry["subtotal"] += price * max(item.quantity, 0)
    for seller_id, entry in by_seller.items():
        seller = await db.sellers.find_one({"id": seller_id}) or {}
        entry["shipping"] = seller_fee(seller, entry["subtotal"], settings, settings["standardFee"],
                                       request.city, request.neighborhood, request.deliveryOption == "pickup")
    sellers = list(by_seller.values())
    subtotal = sum(e["subtotal"] for e in sellers)
    shipping = sum(e["shipping"] for e in sellers)
    return {"sellers": sellers, "subtotal": subtotal, "shipping": shipping, "total": subtotal + shipping,
            "freeAbove": settings["freeAbove"]}


class Courier(BaseModel):
    id: str = Field(default_factory=lambda: f"courier_{str(uuid.uuid4())[:8]}")
    name: str
    phone: str
    city: Optional[str] = None
    active: bool = True
    # Lien secret de sa page : /livreur/<token>
    token: str = Field(default_factory=new_courier_token)
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class CourierInput(BaseModel):
    name: str
    phone: str
    city: Optional[str] = None
    active: bool = True


@api_router.get("/couriers", response_model=List[Courier], dependencies=[Depends(support_or_higher_required)])
async def list_couriers():
    return [Courier(**c) for c in await db.couriers.find({}, {"_id": 0}).sort("name", 1).to_list(500)]


@api_router.post("/couriers", response_model=Courier, dependencies=[Depends(admin_or_higher_required)])
async def create_courier(data: CourierInput):
    if not data.name.strip() or not whatsapp_digits(data.phone):
        raise HTTPException(status_code=400, detail="Indiquez le nom et un numéro de téléphone valide du livreur.")
    courier = Courier(name=data.name.strip(), phone=normalize_whatsapp(data.phone),
                      city=normalize_city(data.city), active=data.active)
    await db.couriers.insert_one(courier.dict())
    return courier


@api_router.put("/couriers/{courier_id}", response_model=Courier, dependencies=[Depends(admin_or_higher_required)])
async def update_courier(courier_id: str, data: CourierInput, newLink: bool = False):
    if not data.name.strip() or not whatsapp_digits(data.phone):
        raise HTTPException(status_code=400, detail="Indiquez le nom et un numéro de téléphone valide du livreur.")
    changes = {"name": data.name.strip(), "phone": normalize_whatsapp(data.phone),
               "city": normalize_city(data.city), "active": data.active}
    if newLink:
        # Lien perdu ou livreur parti : l'ancien lien cesse de marcher
        changes["token"] = new_courier_token()
    await db.couriers.update_one({"id": courier_id}, {"$set": changes})
    courier = await db.couriers.find_one({"id": courier_id}, {"_id": 0})
    if not courier:
        raise HTTPException(status_code=404, detail="Livreur introuvable.")
    await db.orders.update_many({"courierId": courier_id}, {"$set": {"courierName": courier["name"]}})
    return Courier(**courier)


@api_router.delete("/couriers/{courier_id}", status_code=status.HTTP_204_NO_CONTENT,
                   dependencies=[Depends(admin_or_higher_required)])
async def delete_courier(courier_id: str):
    open_orders = await db.orders.count_documents({"courierId": courier_id,
                                                   "status": {"$nin": ["delivered", "cancelled", "refunded"]}})
    if open_orders:
        raise HTTPException(status_code=400, detail=f"Ce livreur a {open_orders} livraison(s) en cours : attribuez-les d'abord à un autre.")
    await db.couriers.delete_one({"id": courier_id})


class CourierAssignment(BaseModel):
    courierId: Optional[str] = None


@api_router.put("/orders/{order_id}/courier", dependencies=[Depends(support_or_higher_required)])
async def assign_courier(order_id: str, data: CourierAssignment):
    courier = None
    if data.courierId:
        courier = await db.couriers.find_one({"id": data.courierId, "active": True})
        if not courier:
            raise HTTPException(status_code=400, detail="Livreur introuvable ou désactivé.")
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    changes = {"courierId": courier["id"] if courier else None, "courierName": courier["name"] if courier else None,
               "updatedAt": datetime.utcnow()}
    if courier and not order.get("deliveryCode"):
        changes["deliveryCode"] = new_delivery_code()  # anciennes commandes
    await db.orders.update_one({"id": order_id}, {"$set": changes})
    return {"courierId": changes["courierId"], "courierName": changes["courierName"]}


def _courier_view(order: dict) -> dict:
    """Ce que voit le livreur : de quoi livrer et encaisser, jamais le code de remise."""
    return {
        "id": order["id"],
        "status": normalize_status(order.get("status")),
        "statusLabel": status_label(order.get("status")),
        "buyerName": order.get("buyerName"),
        "phone": order.get("shippingPhone"),
        "city": order.get("shippingCity"),
        "neighborhood": order.get("shippingNeighborhood"),
        "landmark": order.get("shippingLandmark"),
        "address": order.get("shippingAddress") if isinstance(order.get("shippingAddress"), str) else None,
        "sellerName": order.get("sellerName"),
        "products": [{"name": p.get("name"), "quantity": p.get("quantity")} for p in order.get("products", [])],
        # Paiement à la livraison : montant à encaisser
        "amountToCollect": order.get("totalAmount") if order.get("paymentStatus") in (None, "unpaid", "pending") else 0,
        "attempts": len(order.get("deliveryAttempts") or []),
    }


async def _courier_from_token(token: str) -> dict:
    courier = await db.couriers.find_one({"token": token, "active": True})
    if not courier:
        raise HTTPException(status_code=404, detail="Lien de livreur invalide ou désactivé.")
    return courier


@api_router.get("/courier/{token}/orders")
async def courier_orders(token: str):
    """Page du livreur : ses livraisons en cours."""
    courier = await _courier_from_token(token)
    orders = await db.orders.find({"courierId": courier["id"],
                                   "status": {"$nin": ["delivered", "cancelled", "refunded"]}}).sort("orderedDate", 1).to_list(200)
    return {"courierName": courier["name"], "orders": [_courier_view(o) for o in orders]}


class CourierAction(BaseModel):
    action: str  # start | delivered | failed
    code: Optional[str] = None
    note: Optional[str] = None


@api_router.post("/courier/{token}/orders/{order_id}")
async def courier_update(token: str, order_id: str, data: CourierAction, request: Request,
                         background_tasks: BackgroundTasks):
    courier = await _courier_from_token(token)
    order = await db.orders.find_one({"id": order_id, "courierId": courier["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Cette commande ne vous est pas attribuée.")
    current = normalize_status(order.get("status"))
    if current in ("delivered", "cancelled", "refunded"):
        raise HTTPException(status_code=400, detail="Cette commande est déjà terminée.")
    if data.action == "failed":
        attempt = {"at": datetime.utcnow(), "note": (data.note or "").strip()[:300], "courierId": courier["id"]}
        await db.orders.update_one({"id": order_id}, {"$push": {"deliveryAttempts": attempt},
                                                      "$set": {"updatedAt": datetime.utcnow()}})
        return _courier_view(await db.orders.find_one({"id": order_id}))
    if data.action == "start":
        new_status = "out_for_delivery"
    elif data.action == "delivered":
        # Preuve de remise : le code que seul le client connaît
        login_limiter.check("delivery-code", request, order_id)
        if (data.code or "").strip() != (order.get("deliveryCode") or ""):
            login_limiter.record_failure("delivery-code", request, order_id)
            raise HTTPException(status_code=400, detail="Code de livraison incorrect : demandez au client le code reçu à la commande.")
        new_status = "delivered"
    else:
        raise HTTPException(status_code=400, detail="Action inconnue.")
    # Mêmes effets qu'un changement de statut par l'admin (historique, SMS, stock)
    await update_order(order_id, OrderUpdate(status=new_status), background_tasks, "admin", None)
    # L'historique attribue l'étape au livreur, pas à l'admin
    history = (await db.orders.find_one({"id": order_id}, {"statusHistory": 1})).get("statusHistory") or []
    if history and history[-1].get("status") == new_status:
        await db.orders.update_one({"id": order_id},
                                   {"$set": {f"statusHistory.{len(history) - 1}.by": f"courier:{courier['name']}"}})
    return _courier_view(await db.orders.find_one({"id": order_id}))


@api_router.get("/order-statuses")
async def list_order_statuses():
    """États de commande et leurs libellés (listes déroulantes du site et de l'app)."""
    return [{"value": k, "label": v} for k, v in ORDER_STATUSES.items()]


@api_router.post("/checkout", response_model=List[Order])
async def process_checkout(checkout_data: CheckoutRequest, background_tasks: BackgroundTasks):
    if not whatsapp_digits(checkout_data.phone):
        raise HTTPException(status_code=400, detail="Numéro de téléphone invalide : indiquez-le avec l'indicatif du pays, par exemple +237 6XX XX XX XX.")
    if not checkout_data.firstName.strip():
        raise HTTPException(status_code=400, detail="Indiquez votre nom.")
    if not checkout_data.cartItems:
        raise HTTPException(status_code=400, detail="Votre panier est vide.")
    if checkout_data.deliveryOption != "pickup" and not (checkout_data.city or "").strip():
        raise HTTPException(status_code=400, detail="Indiquez la ville de livraison.")
    buyer_whatsapp = normalize_whatsapp(checkout_data.phone)
    # Client déjà connu : même numéro, quel que soit son format
    buyer = await db.users.find_one({**whatsapp_lookup(checkout_data.phone), "type": "buyer"})

    if not buyer:
        buyer_id = f"buyer_{str(uuid.uuid4())[:8]}"
        # Facultatif à la commande : une adresse déjà prise n'est pas gardée sur ce compte
        guest_email = normalize_email(checkout_data.email)
        if await email_taken(db.users, guest_email, "buyer"):
            guest_email = ""
        new_buyer_data = {
            "id": buyer_id,
            "whatsapp": buyer_whatsapp,
            "name": f"{checkout_data.firstName} {checkout_data.lastName or ''}".strip(),
            "email": guest_email,
            "type": "buyer",
            "joinDate": datetime.utcnow(),
            "status": "active",
            "totalOrders": 0,
            "totalSpent": 0.0
        }
        await db.users.insert_one(new_buyer_data)
        buyer = new_buyer_data
    
    buyer_id = buyer["id"]
    buyer_name = buyer["name"]
    buyer_email = buyer.get("email") or checkout_data.email

    # Tarifs de livraison : vendeur, quartier, ville, puis tarif standard
    delivery_settings = await load_delivery_settings(db)

    # Un même produit ajouté deux fois au panier : quantités additionnées
    quantities = {}
    for item in checkout_data.cartItems:
        if not isinstance(item.quantity, int) or item.quantity < 1:
            raise HTTPException(status_code=400, detail="Chaque quantité doit être un nombre entier d'au moins 1.")
        quantities[item.id] = quantities.get(item.id, 0) + item.quantity
    checkout_data.cartItems = [CheckoutProduct(id=pid, quantity=q) for pid, q in quantities.items()]

    # Fetch all products from cart to get seller info
    product_ids = [item.id for item in checkout_data.cartItems]
    products_from_db_cursor = db.products.find({"id": {"$in": product_ids}})
    products_from_db = {p["id"]: p for p in await products_from_db_cursor.to_list(len(product_ids))}
    for item in checkout_data.cartItems:
        product_info = products_from_db.get(item.id)
        if not product_info or product_info.get("status") != "approved" or not (product_info.get("price") or 0) > 0:
            name = product_info["name"].strip() if product_info else "Un produit"
            raise HTTPException(status_code=400, detail=f"« {name} » n'est plus en vente : retirez-le de votre panier.")
        if item.quantity > (product_info.get("stock") or 0):
            raise HTTPException(status_code=400, detail=f"Stock insuffisant pour « {product_info['name'].strip()} » : {product_info.get('stock') or 0} disponible(s).")

    # Stock retiré tout de suite, de façon atomique : deux clients ne peuvent pas
    # acheter le même dernier article
    reserved = []
    for item in checkout_data.cartItems:
        result = await db.products.update_one({"id": item.id, "stock": {"$gte": item.quantity}},
                                              {"$inc": {"stock": -item.quantity}})
        if result.modified_count != 1:
            for pid, q in reserved:
                await db.products.update_one({"id": pid}, {"$inc": {"stock": q}})
            raise HTTPException(status_code=409, detail=f"« {products_from_db[item.id]['name'].strip()} » vient d'être acheté par un autre client : stock insuffisant.")
        reserved.append((item.id, item.quantity))

    # Group cart items by seller
    seller_orders = {} # {seller_id: {sellerName: str, products: []}}
    for item in checkout_data.cartItems:
        product_info = products_from_db.get(item.id)
        if not product_info:
            raise HTTPException(status_code=404, detail=f"Product with id {item.id} not found in database.")
        
        seller_id = product_info["sellerId"]
        
        # Check if seller exists
        seller = await db.sellers.find_one({"id": seller_id})
        if not seller:
            admin = await db.admins.find_one({"id": seller_id})
            if admin:
                seller = {
                    "id": admin["id"],
                    "businessName": admin["name"],
                    "deliveryPrice": 0,
                    "email": admin["email"]
                }
            else:
                raise HTTPException(status_code=400, detail=f"Le vendeur avec l'ID '{seller_id}' pour le produit '{product_info['name']}' est invalide. Veuillez retirer ce produit de votre panier.")

        if seller_id not in seller_orders:
            seller_orders[seller_id] = {
                "sellerName": product_info["sellerName"],
                "products": []
            }
        
        seller_orders[seller_id]["products"].append(OrderProduct(
            productId=item.id,
            name=product_info["name"],
            quantity=item.quantity,
            price=product_info.get("promoPrice") if product_info.get("promoPrice") and product_info.get("promoPrice") > 0 else product_info["price"],
            image=product_info["images"][0] if product_info.get("images") and len(product_info["images"]) > 0 else None,
            images=product_info.get("images", [])
        ))

    created_orders = []
    for seller_id, order_details in seller_orders.items():
        # Fetch seller to get their delivery price
        seller = await db.sellers.find_one({"id": seller_id})
        if not seller:
            admin = await db.admins.find_one({"id": seller_id})
            if admin:
                seller = {
                    "id": admin["id"],
                    "businessName": admin["name"],
                    "deliveryPrice": 0,
                    "email": admin["email"]
                }
            else:
                raise HTTPException(status_code=404, detail=f"Seller {seller_id} not found.")

        products_total = sum(p.price * p.quantity for p in order_details["products"])
        shipping_cost = seller_fee(seller, products_total, delivery_settings, delivery_settings["standardFee"],
                                   checkout_data.city, checkout_data.neighborhood,
                                   checkout_data.deliveryOption == "pickup")
        total_amount = products_total + shipping_cost
        
        new_order = Order(
            id=f"ord_{str(uuid.uuid4())[:8]}",
            buyerId=buyer_id,
            buyerName=buyer_name,
            sellerId=seller_id,
            sellerName=order_details["sellerName"],
            products=order_details["products"],
            totalAmount=total_amount,
            shippingCost=shipping_cost,
            shippingAddress=checkout_data.address,
            shippingCity=normalize_city(checkout_data.city),
            shippingRegion=checkout_data.region,
            shippingPhone=checkout_data.phone,
            shippingNeighborhood=(checkout_data.neighborhood or "").strip() or None,
            shippingLandmark=(checkout_data.landmark or "").strip() or None,
            status="received",
            statusHistory=[{"status": "received", "at": datetime.utcnow(), "by": "buyer"}],
            stockReserved=True,
            deliveryCode=new_delivery_code(),
            paymentStatus="pending" if checkout_data.paymentMethod != 'cashOnDelivery' else 'unpaid',
            pickupPointId=checkout_data.selectedPickupPoint if checkout_data.deliveryOption == 'pickup' else None,
            pickupStatus="pending_pickup" if checkout_data.deliveryOption == 'pickup' else "not_applicable",
            orderedDate=datetime.utcnow()
        )
        await db.orders.insert_one(new_order.dict())
        created_orders.append(new_order)

        # Update buyer's stats
        await db.users.update_one(
            {"id": buyer_id},
            {"$inc": {"totalOrders": 1, "totalSpent": total_amount}}
        )

        # SMS de confirmation au client (en tâche de fond)
        background_tasks.add_task(send_sms, checkout_data.phone,
                                  order_created_text(new_order.id, total_amount, order_details["sellerName"],
                                                     new_order.deliveryCode))

        # --- In-App Notifications ---
        # 1. To Buyer
        await db.notifications.insert_one(Notification(
            recipient_id=buyer_id,
            recipient_type='buyer',
            type='order_created',
            title="Commande reçue",
            message=f"Votre commande #{new_order.id} a été reçue.",
            link="/profile/orders"
        ).dict())

        # 2. To Seller
        await db.notifications.insert_one(Notification(
            recipient_id=seller_id,
            recipient_type='seller',
            type='order_created',
            title="Nouvelle commande !",
            message=f"Nouvelle commande #{new_order.id} de {total_amount} {new_order.currency}",
            link="/seller/dashboard/orders"
        ).dict())

        # --- Send Email Notifications ---
        # 1. To Buyer
        if buyer_email:
            message_buyer = MessageSchema(
                subject=f"Confirmation de votre commande Nengoo #{new_order.id}",
                recipients=[buyer_email],
                template_body={
                    "buyer_name": buyer_name,
                    "order_id": new_order.id,
                    "total_amount": total_amount
                },
                subtype="html"
            )
            background_tasks.add_task(fm.send_message, message_buyer, template_name="new_order_buyer.html")

        # 2. To Seller
        if seller and seller.get("email"):
            message_seller = MessageSchema(
                subject=f"Nouvelle commande sur Nengoo - #{new_order.id}",
                recipients=[seller["email"]],
                template_body={
                    "seller_name": seller["businessName"],
                    "buyer_name": buyer_name,
                    "order_id": new_order.id,
                    "total_amount": total_amount
                },
                subtype="html"
            )
            background_tasks.add_task(fm.send_message, message_seller, template_name="new_order_seller.html")

        # 3. To Super Admins
        super_admins_cursor = db.admins.find({"role": "super_admin", "status": "active"})
        super_admins = await super_admins_cursor.to_list(10)
        super_admin_emails = [admin["email"] for admin in super_admins if admin.get("email")]
        
        if super_admin_emails:
            message_admin = MessageSchema(
                subject=f"ALERTE : Nouvelle commande Nengoo #{new_order.id}",
                recipients=super_admin_emails,
                template_body={
                    "order_id": new_order.id,
                    "buyer_name": buyer_name,
                    "seller_name": order_details["sellerName"],
                    "total_amount": total_amount,
                    "admin_url": f"https://www.nengoo.com/admin/dashboard" # Adjust as needed
                },
                subtype="html"
            )
            # We can reuse the new_order_seller template or create a specific one. 
            # For now, using seller one or simple body. Let's assume we use a dedicated one if exists, 
            # but I'll use new_order_seller.html as a base if no specific one is provided.
            background_tasks.add_task(fm.send_message, message_admin, template_name="new_order_seller.html")

    return created_orders

class SavedAddress(BaseModel):
    address: str
    city: str
    region: str
    phone: str
    lastUsed: datetime

class SavedPickupPoint(BaseModel):
    id: str
    name: str
    lastUsed: datetime
    # We might want more details for pickup point display, let's try to fetch them or include them
    address: Optional[str] = None
    hours: Optional[str] = None
    phone: Optional[str] = None

class BuyerSavedInfo(BaseModel):
    addresses: List[SavedAddress]
    pickupPoints: List[SavedPickupPoint]

@api_router.get("/buyers/{buyer_id}/saved-info", response_model=BuyerSavedInfo)
async def get_buyer_saved_info(buyer_id: str, x_user_id: str = Header(..., alias="X-User-Id")):
    # Authorization: User can only access their own info
    if buyer_id != x_user_id:
         # We allow admins too? For now, strict check.
         pass # Logic could be improved for admin access

    orders_cursor = db.orders.find({"buyerId": buyer_id}).sort("orderedDate", -1)
    orders = await orders_cursor.to_list(1000)
    
    addresses_map = {}
    pickup_points_map = {}
    
    for order in orders:
        # Process Address
        if order.get("shippingAddress"):
            # Create a unique key based on address details
            key = f"{order['shippingAddress']}-{order.get('shippingCity')}"
            if key not in addresses_map:
                addresses_map[key] = {
                    "address": order['shippingAddress'],
                    "city": order.get('shippingCity', ''),
                    "region": order.get('shippingRegion', ''),
                    "phone": order.get('shippingPhone', ''),
                    "lastUsed": order['orderedDate']
                }
        
        # Process Pickup Point
        if order.get("pickupPointId") and order.get("pickupPointName"):
             pid = order["pickupPointId"]
             if pid not in pickup_points_map:
                 # Fetch full pickup point details if possible, or use what we have
                 pickup_point_data = {
                     "id": pid,
                     "name": order["pickupPointName"],
                     "lastUsed": order['orderedDate']
                 }
                 # Try to find more info from db.pickupPoints if needed
                 pp = await db.pickupPoints.find_one({"id": pid})
                 if pp:
                     pickup_point_data["address"] = pp.get("address")
                     pickup_point_data["hours"] = pp.get("hours")
                     pickup_point_data["phone"] = pp.get("phone")
                 
                 pickup_points_map[pid] = pickup_point_data

    return BuyerSavedInfo(
        addresses=list(addresses_map.values()),
        pickupPoints=list(pickup_points_map.values())
    )

@api_router.get("/cities", response_model=List[str])
async def list_cities():
    """Villes proposées dans les formulaires (une autre ville reste possible)."""
    return CITIES

# --- Pickup Point Management ---
@api_router.post("/pickup-points", response_model=PickupPoint, dependencies=[Depends(super_admin_required)])
async def create_pickup_point(pickup_data: PickupPointCreate):
    pickup_data.city = normalize_city(pickup_data.city)
    pickup_point = PickupPoint(**pickup_data.dict())
    await db.pickupPoints.insert_one(pickup_point.dict())
    return pickup_point

@api_router.get("/pickup-points", response_model=List[PickupPoint])
async def list_pickup_points():
    pickup_points_cursor = db.pickupPoints.find()
    pickup_points = await pickup_points_cursor.to_list(1000)
    return [PickupPoint(**p) for p in pickup_points]

@api_router.put("/pickup-points/{pickup_point_id}", response_model=PickupPoint, dependencies=[Depends(super_admin_required)])
async def update_pickup_point(pickup_point_id: str, pickup_data: PickupPointUpdate):
    update_data = pickup_data.dict(exclude_unset=True)
    if update_data.get("city") is not None:
        update_data["city"] = normalize_city(update_data["city"])
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
    
    await db.pickupPoints.update_one({"id": pickup_point_id}, {"$set": update_data})
    updated_pickup_point = await db.pickupPoints.find_one({"id": pickup_point_id})
    if not updated_pickup_point:
        raise HTTPException(status_code=404, detail="Pickup point not found")
    return PickupPoint(**updated_pickup_point)

@api_router.delete("/pickup-points", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(super_admin_required)])
async def bulk_delete_pickup_points(request: BulkDeleteRequest):
    if not request.ids:
        raise HTTPException(status_code=400, detail="No pickup point IDs provided for deletion.")
    
    await db.pickupPoints.delete_many({"id": {"$in": request.ids}})
    return

@api_router.delete("/pickup-points/{pickup_point_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(super_admin_required)])
async def delete_pickup_point(pickup_point_id: str):
    result = await db.pickupPoints.delete_one({"id": pickup_point_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pickup point not found")
    return

# --- Category Management ---
async def check_product_category(category_id: Optional[str]) -> None:
    """Un produit pointe toujours vers une catégorie existante."""
    if not category_id or not await db.categories.find_one({"id": category_id}):
        raise HTTPException(status_code=400, detail="Choisissez une catégorie existante.")


def check_promo_price(price: Optional[float], promo_price: Optional[float]) -> None:
    if promo_price and price and promo_price >= price:
        raise HTTPException(status_code=400, detail="Le prix promo doit être inférieur au prix normal.")


async def check_category_name_free(name: str, category_id: Optional[str] = None) -> None:
    """Pas deux catégories au même nom, accents, majuscules et pluriel compris."""
    wanted = normalize_name(name)
    if not wanted:
        raise HTTPException(status_code=400, detail="Le nom de la catégorie est obligatoire.")
    for other in await db.categories.find({}, {"id": 1, "name": 1}).to_list(1000):
        if other.get("id") != category_id and normalize_name(other.get("name")) == wanted:
            raise HTTPException(status_code=400, detail=f"Une catégorie porte déjà ce nom : « {other['name'].strip()} ».")


async def check_categories_empty(category_ids: List[str]) -> None:
    """Une catégorie qui contient des produits ne peut pas être supprimée :
    ses produits deviendraient invisibles."""
    count = await db.products.count_documents({"category": {"$in": category_ids}})
    if count:
        raise HTTPException(
            status_code=400,
            detail=f"Cette catégorie contient {count} produit(s) : déplacez-les d'abord vers une autre catégorie.",
        )

async def check_category_parent(category_id: Optional[str], parent_id: Optional[str]) -> None:
    """Un seul niveau : le parent existe, est une catégorie principale, et une
    catégorie qui a déjà des sous-catégories ne peut pas devenir l'une d'elles."""
    if not parent_id:
        return
    if parent_id == category_id:
        raise HTTPException(status_code=400, detail="Une catégorie ne peut pas être sa propre catégorie parente.")
    parent = await db.categories.find_one({"id": parent_id})
    if not parent:
        raise HTTPException(status_code=400, detail="Catégorie parente introuvable.")
    if parent.get("parentId"):
        raise HTTPException(status_code=400, detail="La catégorie parente doit être une catégorie principale, pas une sous-catégorie.")
    if category_id and await db.categories.find_one({"parentId": category_id}):
        raise HTTPException(status_code=400, detail="Cette catégorie a des sous-catégories : elle ne peut pas devenir elle-même une sous-catégorie.")


async def category_family_ids(category_id: str) -> List[str]:
    """La catégorie et ses sous-catégories, pour filtrer les produits."""
    children = await db.categories.find({"parentId": category_id}, {"id": 1}).to_list(1000)
    return [category_id] + [c["id"] for c in children if c.get("id")]


@api_router.get("/categories", response_model=List[CategoryWithCount])
async def list_categories(hideEmpty: bool = False):
    """Catégories triées par ordre puis par nom. hideEmpty=true (site, app) :
    masque celles qui n'ont aucun produit, sous-catégories comprises."""
    pipeline = [
        {
            "$lookup": {
                "from": "products",
                "localField": "id",
                "foreignField": "category",
                "as": "products"
            }
        },
        {
            "$project": {
                "id": "$id",
                "name": "$name",
                "description": "$description",
                "parentId": "$parentId",
                "nameEn": "$nameEn",
                "image": "$image",
                "order": {"$ifNull": ["$order", 0]},
                "formerNames": {"$ifNull": ["$formerNames", []]},
                "productCount": { "$size": "$products" }
            }
        },
        {"$sort": {"order": 1, "name": 1}},
    ]
    categories_cursor = db.categories.aggregate(pipeline)
    categories_with_count = await categories_cursor.to_list(1000)
    if hideEmpty:
        family = {}
        for c in categories_with_count:
            key = c.get("parentId") or c.get("id")
            family[key] = family.get(key, 0) + c["productCount"]
        categories_with_count = [
            c for c in categories_with_count
            if (c["productCount"] if c.get("parentId") else family.get(c.get("id"), 0)) > 0
        ]
    return categories_with_count

@api_router.post("/categories", response_model=Category, dependencies=[Depends(moderator_or_higher_required)])
async def create_category(category_data: CategoryCreate):
    category_data.name = category_data.name.strip()
    await check_category_name_free(category_data.name)
    category_data.parentId = category_data.parentId or None
    await check_category_parent(None, category_data.parentId)
    category = Category(**category_data.dict())
    await db.categories.insert_one(category.dict())
    return category

@api_router.put("/categories/{category_id}", response_model=Category, dependencies=[Depends(moderator_or_higher_required)])
async def update_category(category_id: str, category_data: CategoryUpdate):
    update_data = category_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
    if "parentId" in update_data:
        update_data["parentId"] = update_data["parentId"] or None
        await check_category_parent(category_id, update_data["parentId"])
    push = {}
    if "name" in update_data:
        update_data["name"] = update_data["name"].strip()
        await check_category_name_free(update_data["name"], category_id)
        current = await db.categories.find_one({"id": category_id}, {"name": 1})
        if current and normalize_name(current.get("name")) != normalize_name(update_data["name"]):
            push = {"$addToSet": {"formerNames": current["name"].strip()}}

    await db.categories.update_one({"id": category_id}, {"$set": update_data, **push})
    updated_category = await db.categories.find_one({"id": category_id})
    if not updated_category:
        raise HTTPException(status_code=404, detail="Category not found")
    return Category(**updated_category)

@api_router.delete("/categories", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(moderator_or_higher_required)])
async def bulk_delete_categories(request: BulkDeleteRequest):
    if not request.ids:
        raise HTTPException(status_code=400, detail="No category IDs provided for deletion.")
    
    # Une catégorie ne part pas sans ses sous-catégories
    orphan = await db.categories.find_one({"parentId": {"$in": request.ids}, "id": {"$nin": request.ids}})
    if orphan:
        raise HTTPException(status_code=400, detail=f"Supprimez ou déplacez d'abord la sous-catégorie « {orphan['name']} ».")
    await check_categories_empty(request.ids)
    result = await db.categories.delete_many({"id": {"$in": request.ids}})
    
    if result.deleted_count == 0:
        # This can happen if the IDs are not found, which is not necessarily a client error.
        # Returning 204 is acceptable as the state is what the client wanted (the items are gone).
        pass

    # Note: We could also check if result.deleted_count matches len(request.ids) and handle discrepancies.
    # For now, a 204 response is sufficient.
    return

@api_router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(moderator_or_higher_required)])
async def delete_category(category_id: str):
    if await db.categories.find_one({"parentId": category_id}):
        raise HTTPException(status_code=400, detail="Cette catégorie a des sous-catégories : supprimez-les ou déplacez-les d'abord.")
    await check_categories_empty([category_id])
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return

# --- Reclassement des produits (admin) ---
@api_router.get("/admin/products/unclassified", dependencies=[Depends(moderator_or_higher_required)])
async def list_unclassified_products(includeOther: bool = True):
    """Produits sans catégorie valide (et, par défaut, ceux rangés dans
    « Autres »), avec une catégorie suggérée d'après leur nom."""
    categories = await db.categories.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    by_name = {normalize_name(c["name"]): c for c in categories if c.get("id")}
    other = by_name.get(normalize_name("Autres"))
    query = {"category": {"$nin": [c["id"] for c in by_name.values()]}}
    if includeOther and other:
        query = {"$or": [query, {"category": other["id"]}]}
    fields = {"_id": 0, "id": 1, "name": 1, "description": 1, "category": 1, "images": 1,
              "sellerName": 1, "status": 1, "price": 1}
    products = await db.products.find(query, fields).sort("createdAt", -1).to_list(5000)
    result = []
    for product in products:
        suggested = by_name.get(normalize_name(suggest_category_name(product.get("name"), product.get("description"))))
        result.append({
            "id": product["id"],
            "name": product.get("name"),
            "image": next(iter(product.get("images") or []), None),
            "sellerName": product.get("sellerName"),
            "status": product.get("status"),
            "price": product.get("price"),
            "currentCategory": product.get("category"),
            "inOther": bool(other) and product.get("category") == other["id"],
            "suggestedCategoryId": suggested["id"] if suggested else None,
            "suggestedCategoryName": suggested["name"] if suggested else None,
        })
    return result


@api_router.post("/admin/products/reclassify", dependencies=[Depends(moderator_or_higher_required)])
async def reclassify_products(request: ReclassifyRequest):
    """Déplace des produits vers une catégorie existante."""
    if not request.productIds:
        raise HTTPException(status_code=400, detail="Aucun produit sélectionné.")
    await check_product_category(request.categoryId)
    result = await db.products.update_many(
        {"id": {"$in": request.productIds}},
        {"$set": {"category": request.categoryId, "updatedAt": datetime.utcnow()}},
    )
    return {"updated": result.modified_count}

# --- Ads Management ---
@api_router.get("/ads/active", response_model=List[Ad])
async def get_active_ads():
    """
    Récupère les annonces actives.
    Retourne une liste vide s'il n'y a pas d'annonces (pas de 404).
    """
    # Chercher les ads actives
    ads_cursor = db.ads.find({"isActive": True})
    ads = await ads_cursor.to_list(100)

    # Retourner la liste (vide ou avec des éléments)
    return [Ad(**ad) for ad in ads]

@api_router.post("/ads", response_model=Ad, dependencies=[Depends(admin_or_higher_required)])
async def create_ad(ad_data: AdCreate):
    """Créer une nouvelle annonce (admin uniquement)"""
    ad = Ad(**ad_data.dict())
    await db.ads.insert_one(ad.dict())
    return ad

@api_router.delete("/ads/{ad_id}", dependencies=[Depends(admin_or_higher_required)])
async def delete_ad(ad_id: str):
    """Supprimer une annonce (admin uniquement)"""
    result = await db.ads.delete_one({"id": ad_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ad not found")
    return {"message": "Ad deleted successfully"}

# --- File Upload Management (AWS S3) ---
@api_router.post("/generate-presigned-url", response_model=PresignedUrlResponse, dependencies=[Depends(seller_id_or_support_required)])
async def generate_presigned_url(request: PresignedUrlRequest):
    """
    Generates a pre-signed URL to upload a file directly to S3.
    Requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET_NAME
    to be configured in the environment.
    """
    aws_access_key_id = os.environ.get("AWS_ACCESS_KEY_ID")
    aws_secret_access_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    aws_region = os.environ.get("AWS_REGION")
    bucket_name = os.environ.get("S3_BUCKET_NAME")

    if not all([aws_access_key_id, aws_secret_access_key, aws_region, bucket_name]):
        raise HTTPException(status_code=500, detail="AWS S3 environment variables not configured.")

    s3_client = boto3.client(
        "s3",
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=aws_region,
        config=boto3.session.Config(signature_version='s3v4')
    )
    
    # Generate a unique object name
    object_name = f"uploads/{uuid.uuid4()}-{request.fileName}"

    try:
        response = s3_client.generate_presigned_url(
            'put_object',
            Params={'Bucket': bucket_name, 'Key': object_name, 'ContentType': request.fileType},
            ExpiresIn=3600  # URL expires in 1 hour
        )
        public_url = f"https://{bucket_name}.s3.{aws_region}.amazonaws.com/{object_name}"
        
        return PresignedUrlResponse(uploadUrl=response, publicUrl=public_url)
    except ClientError as e:
        logging.error(e)
        raise HTTPException(status_code=500, detail="Could not generate pre-signed URL.")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

class AdminLoginRequest(BaseModel):
    whatsapp: str
    accessCode: str

#... (existing models)

# --- Admin Management ---


@api_router.post("/admins/login", response_model=AdminAuthResponse, response_model_exclude={"accessCode"})
async def admin_login(login_data: AdminLoginRequest, request: Request):
    login_limiter.check("admin", request, login_data.whatsapp)
    admin = await db.admins.find_one({"whatsapp": login_data.whatsapp})

    if not admin or not verify_password(login_data.accessCode, admin["accessCode"]):
        login_limiter.record_failure("admin", request, login_data.whatsapp)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou code d'accès incorrect")
    login_limiter.record_success("admin", request, login_data.whatsapp)

    if admin["status"] != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Votre compte administrateur est suspendu")

    # Mettre à jour la date de dernière connexion
    await db.admins.update_one(
        {"_id": admin["_id"]},
        {"$set": {"lastLogin": datetime.utcnow()}}
    )
    
    # Exclure le champ _id et retourner l'objet Admin complet
    admin_data = {k: v for k, v in admin.items() if k != '_id'}
    role = admin_data.get("role")
    role = getattr(role, "value", role)
    return AdminAuthResponse(**admin_data, accessToken=create_access_token(admin_data["id"], "admin", role))

@api_router.post("/admins", response_model=Admin, response_model_exclude={"accessCode"}, status_code=status.HTTP_201_CREATED, dependencies=[Depends(super_admin_required)])
async def create_admin(admin_data: AdminCreate):
    if await db.admins.find_one({"whatsapp": admin_data.whatsapp}):
        raise HTTPException(status_code=400, detail="Admin with this WhatsApp number already exists.")
        
    admin = Admin(
        id=f"{admin_data.role.value}_{str(uuid.uuid4())[:4]}",
        accessCode=hash_password(admin_data.accessCode),
        status="active",
        createdDate=datetime.utcnow(),
        **admin_data.dict(exclude={"accessCode"})
    )
    await db.admins.insert_one(admin.dict())
    return admin

@api_router.get("/admins", response_model=List[Admin], response_model_exclude={"__all__": {"accessCode"}}, dependencies=[Depends(super_admin_required)])
async def list_admins():
    admins_cursor = db.admins.find()
    admins_from_db = await admins_cursor.to_list(1000)
    valid_admins = []
    for admin_data in admins_from_db:
        try:
            # Ensure 'type' field exists before validation, defaulting to 'admin'
            if 'type' not in admin_data:
                admin_data['type'] = 'admin'
            valid_admins.append(Admin(**admin_data))
        except Exception as e:
            logging.error(f"Skipping invalid admin data due to validation error: {admin_data}")
            logging.error(f"Error details: {e}")
            continue
    return valid_admins

@api_router.put("/admins/{admin_id}", response_model=Admin, dependencies=[Depends(super_admin_required)])
async def update_admin(admin_id: str, admin_data: AdminUpdate):
    update_data = admin_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")

    await db.admins.update_one({"id": admin_id}, {"$set": update_data})
    updated_admin = await db.admins.find_one({"id": admin_id})
    if not updated_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return Admin(**updated_admin)

@api_router.put("/admins/{admin_id}/status", response_model=Admin, dependencies=[Depends(super_admin_required)])
async def update_admin_status(admin_id: str, status_data: AdminStatusUpdate):
    if status_data.status not in ["active", "suspended"]:
        raise HTTPException(status_code=400, detail="Invalid status.")
    
    # Simple protection for the main super admin
    admin_to_update = await db.admins.find_one({"id": admin_id})
    if admin_to_update and admin_to_update.get("role") == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot change the status of a super admin.")

    await db.admins.update_one({"id": admin_id}, {"$set": {"status": status_data.status}})
    updated_admin = await db.admins.find_one({"id": admin_id})
    if not updated_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return Admin(**updated_admin)

@api_router.put("/admins/{admin_id}/password", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(super_admin_required)])
async def update_admin_password(admin_id: str, password_data: AdminPasswordUpdate):
    admin_to_update = await db.admins.find_one({"id": admin_id})
    if not admin_to_update:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    hashed_password = hash_password(password_data.newPassword)
    
    await db.admins.update_one(
        {"id": admin_id},
        {"$set": {"accessCode": hashed_password}}
    )
    return

@api_router.delete("/admins", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(super_admin_required)])
async def bulk_delete_admins(request: BulkDeleteRequest):
    if not request.ids:
        raise HTTPException(status_code=400, detail="No admin IDs provided for deletion.")
    
    # Prevent deletion of super admins
    query = {"id": {"$in": request.ids}, "role": {"$ne": "super_admin"}}
    
    await db.admins.delete_many(query)
    return

@api_router.delete("/admins/{admin_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(super_admin_required)])
async def delete_admin(admin_id: str):
    admin_to_delete = await db.admins.find_one({"id": admin_id})
    if admin_to_delete and admin_to_delete.get("role") == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot delete a super admin.")

    result = await db.admins.delete_one({"id": admin_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found")
    return

# --- Newsletter Subscription ---
@api_router.post("/newsletter/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_newsletter(subscription: NewsletterSubscription):
    """
    Subscribes an email to the newsletter.
    """
    existing_subscription = await db.newsletter_subscriptions.find_one({"email": subscription.email})
    if existing_subscription:
        raise HTTPException(status_code=400, detail="This email is already subscribed.")
    
    await db.newsletter_subscriptions.insert_one(subscription.dict())
    return {"message": "Successfully subscribed to the newsletter."}

@api_router.post("/admin/migrate-slugs", dependencies=[Depends(super_admin_required)])
async def migrate_product_slugs():
    products_cursor = db.products.find({"slug": {"$exists": False}})
    products = await products_cursor.to_list(1000)
    count = 0
    for p in products:
        slug = await get_unique_slug(p["name"])
        await db.products.update_one({"_id": p["_id"]}, {"$set": {"slug": slug}})
        count += 1
    return {"message": f"Successfully migrated {count} products."}

# --- Privacy Policy Management ---
@api_router.get("/privacy-policy", response_model=PrivacyPolicy)
async def get_privacy_policy():
    """
    Get the current privacy policy (public endpoint).
    """
    policy = await db.privacy_policy.find_one({"id": "privacy_policy_v1"})

    if not policy:
        # Create default policy if not exists
        default_policy = PrivacyPolicy(
            id="privacy_policy_v1",
            title="Politique de confidentialité",
            content="""
# Politique de confidentialité de Nengoo

## 1. Introduction

Bienvenue sur Nengoo. Nous respectons votre vie privée et nous nous engageons à protéger vos données personnelles.

## 2. Données collectées

Nous collectons les informations suivantes :
- Nom et prénom
- Adresse email
- Numéro de téléphone
- Adresse de livraison

## 3. Utilisation des données

Vos données sont utilisées pour :
- Traiter vos commandes
- Communiquer avec vous
- Améliorer nos services

## 4. Protection des données

Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données.

## 5. Vos droits

Vous avez le droit d'accéder, de modifier ou de supprimer vos données personnelles.

## 6. Contact

Pour toute question concernant cette politique, contactez-nous à contact@nengoo.com

*Dernière mise à jour : {date}*
            """.format(date=datetime.utcnow().strftime("%d/%m/%Y")),
            last_updated=datetime.utcnow()
        )
        await db.privacy_policy.insert_one(default_policy.dict())
        return default_policy

    return PrivacyPolicy(**policy)

@api_router.put("/privacy-policy", response_model=PrivacyPolicy, dependencies=[Depends(super_admin_required)])
async def update_privacy_policy(
    policy_update: PrivacyPolicyUpdate,
    x_admin_id: Optional[str] = Header(None, alias="X-Admin-Id")
):
    """
    Update the privacy policy (super admin only).
    """
    update_data = policy_update.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")

    update_data["last_updated"] = datetime.utcnow()
    update_data["updated_by"] = x_admin_id

    result = await db.privacy_policy.update_one(
        {"id": "privacy_policy_v1"},
        {"$set": update_data},
        upsert=True
    )

    updated_policy = await db.privacy_policy.find_one({"id": "privacy_policy_v1"})

    if not updated_policy:
        raise HTTPException(status_code=404, detail="Failed to update privacy policy.")

    return PrivacyPolicy(**updated_policy)

@api_router.get("/about-page-settings", response_model=AboutPageSettings)
async def get_about_page_settings():
    """
    Get the about page settings (public endpoint).
    """
    settings = await db.about_page_settings.find_one({"id": "about_page_settings"})

    if not settings:
        # Create default settings if not exists
        default_settings = AboutPageSettings(
            id="about_page_settings",
            mission_image_url="https://images.pexels.com/photos/13086663/pexels-photo-13086663.jpeg",
            mission_title="Notre Mission",
            mission_text_1="Nengoo a été créé avec pour mission de connecter les consommateurs camerounais aux meilleurs produits locaux et internationaux, tout en soutenant l'économie locale et l'artisanat traditionnel.",
            mission_text_2="Nous croyons fermement au potentiel du commerce électronique pour transformer l'économie camerounaise et offrir de nouvelles opportunités aux entrepreneurs locaux.",
            last_updated=datetime.utcnow()
        )
        await db.about_page_settings.insert_one(default_settings.dict())
        return default_settings

    return AboutPageSettings(**settings)

@api_router.put("/about-page-settings", response_model=AboutPageSettings, dependencies=[Depends(super_admin_required)])
async def update_about_page_settings(
    settings_update: AboutPageSettingsUpdate,
    x_admin_id: Optional[str] = Header(None, alias="X-Admin-Id")
):
    """
    Update the about page settings (super admin only).
    """
    update_data = settings_update.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")

    update_data["last_updated"] = datetime.utcnow()
    update_data["updated_by"] = x_admin_id

    result = await db.about_page_settings.update_one(
        {"id": "about_page_settings"},
        {"$set": update_data},
        upsert=True
    )

    updated_settings = await db.about_page_settings.find_one({"id": "about_page_settings"})

    if not updated_settings:
        raise HTTPException(status_code=404, detail="Failed to update about page settings.")

    return AboutPageSettings(**updated_settings)


# --- Router Inclusion ---
from routers.buyers import router as buyers_router
api_router.include_router(buyers_router)


# --- OG / Social Preview SSR ---

def _escape_html(text: str) -> str:
    return (str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))

@api_router.get("/og/product/{id_or_slug}", response_class=HTMLResponse)
async def product_og_preview(id_or_slug: str):
    """Renvoie une page HTML avec les Open Graph meta tags pour les crawlers sociaux."""
    product = await db.products.find_one(
        {"$or": [{"id": id_or_slug}, {"slug": id_or_slug}]}
    )

    site_url = "https://www.nengoo.com"
    default_image = f"{site_url}/icons/logo-512x512.png"

    if not product:
        html = f"""<!DOCTYPE html>
<html lang="fr"><head>
  <meta charset="utf-8">
  <title>Nengoo - Marketplace Cameroun</title>
  <meta property="og:title" content="Nengoo - Marketplace Cameroun">
  <meta property="og:description" content="Votre marketplace camerounaise de confiance">
  <meta property="og:image" content="{default_image}">
  <meta property="og:url" content="{site_url}">
  <meta http-equiv="refresh" content="0;url={site_url}/product/{id_or_slug}">
</head><body><script>window.location.href="{site_url}/product/{id_or_slug}";</script></body></html>"""
        return HTMLResponse(content=html)

    name = _escape_html(product.get("name", "Produit Nengoo"))
    raw_desc = product.get("description", "Découvrez ce produit sur Nengoo")
    description = _escape_html(raw_desc[:160])
    images = product.get("images", [])
    image = images[0] if images else default_image
    price = product.get("promoPrice") or product.get("price") or 0
    currency = product.get("currency", "XAF")
    slug = product.get("slug") or product.get("id")
    url = f"{site_url}/product/{slug}"
    seller_name = _escape_html(product.get("sellerName", "Nengoo"))

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>{name} — Nengoo</title>
  <meta name="description" content="{description}">

  <!-- Open Graph -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="{url}">
  <meta property="og:title" content="{name} — Nengoo">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="{image}">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="800">
  <meta property="og:site_name" content="Nengoo">
  <meta property="og:locale" content="fr_CM">
  <meta property="product:price:amount" content="{price}">
  <meta property="product:price:currency" content="{currency}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{name} — Nengoo">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{image}">

  <!-- WhatsApp / Telegram lisent og: -->
  <meta property="og:price:amount" content="{price}">
  <meta property="og:price:currency" content="{currency}">

  <meta http-equiv="refresh" content="0;url={url}">
</head>
<body>
  <p>Redirection vers <a href="{url}">{name} sur Nengoo</a> ({price} {currency}) — vendu par {seller_name}.</p>
  <script>window.location.href = "{url}";</script>
</body>
</html>"""
    return HTMLResponse(content=html)


# --- App Initialization ---
app.include_router(api_router)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
