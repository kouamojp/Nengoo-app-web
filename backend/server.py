from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from bson import ObjectId
import shutil
import uuid
import hashlib
import base64


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - Support both local and production environments
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db_name = os.environ.get('DB_NAME', 'nengoo')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Create uploads directory if it doesn't exist
UPLOAD_DIR = ROOT_DIR / "uploads" / "products"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Nengoo API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==================== MODELS ====================

class BuyerCreate(BaseModel):
    whatsapp: str
    name: str
    email: EmailStr
    password: str

class SellerCreate(BaseModel):
    whatsapp: str
    name: str
    businessName: str
    email: EmailStr
    city: str
    categories: List[str]
    password: str

class LoginRequest(BaseModel):
    whatsapp: str
    password: str
    userType: str  # "buyer" or "seller"

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    whatsapp: Optional[str] = ""
    name: str
    email: Optional[str] = ""
    type: str
    joinDate: Optional[str] = None
    businessName: Optional[str] = None
    city: Optional[str] = None
    categories: Optional[List[str]] = None
    status: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class AdminCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "admin"

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    sellerId: str
    images: Optional[List[str]] = []
    stock: Optional[int] = 0
    unit: Optional[str] = "unité"

class SellerProductCreate(BaseModel):
    """Product creation by seller (no sellerId needed)"""
    name: str
    description: str
    price: float
    category: str
    images: Optional[List[str]] = []
    stock: Optional[int] = 0
    unit: Optional[str] = "unité"

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    sellerId: Optional[str] = None
    images: Optional[List[str]] = None
    stock: Optional[int] = None
    unit: Optional[str] = None
    status: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def validate_password(password: str) -> None:
    """
    Validate password meets security requirements.
    Using SHA-256 preprocessing allows passwords of any length.
    """
    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Le mot de passe doit contenir au moins 6 caractères"
        )
    # Optionally limit max length for practical reasons (e.g., 1000 chars)
    if len(password) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Le mot de passe ne peut pas dépasser 1000 caractères"
        )

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt, truncating to 72 bytes.
    """
    validate_password(password)

    # Truncate password to 72 bytes to avoid bcrypt error
    password_bytes = password.encode('utf-8')[:72]
    
    return pwd_context.hash(password_bytes)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a bcrypt hash, truncating to 72 bytes.
    """
    # Truncate password to 72 bytes before verification
    password_bytes = plain_password.encode('utf-8')[:72]

    return pwd_context.verify(password_bytes, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("type")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return {"id": user_id, "type": user_type}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def convert_objectid_to_str(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


# ==================== AUTHENTICATION ROUTES ====================

@api_router.post("/auth/register/buyer", response_model=TokenResponse)
async def register_buyer(buyer: BuyerCreate):
    # Check if user already exists
    existing_user = await db.buyers.find_one({"whatsapp": buyer.whatsapp})
    if existing_user:
        raise HTTPException(status_code=400, detail="Numéro WhatsApp déjà enregistré")

    existing_email = await db.buyers.find_one({"email": buyer.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email déjà enregistré")

    # Create new buyer
    buyer_dict = {
        "whatsapp": buyer.whatsapp,
        "name": buyer.name,
        "email": buyer.email,
        "password": hash_password(buyer.password),
        "joinDate": datetime.now(timezone.utc).isoformat(),
        "type": "buyer"
    }

    result = await db.buyers.insert_one(buyer_dict)
    buyer_dict["id"] = str(result.inserted_id)

    # Create access token
    access_token = create_access_token(
        data={"sub": buyer_dict["id"], "type": "buyer"}
    )

    # Return response without password
    del buyer_dict["password"]
    del buyer_dict["_id"]

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**buyer_dict)
    }


@api_router.post("/auth/register/seller", response_model=dict)
async def register_seller(seller: SellerCreate):
    # Check if user already exists
    existing_user = await db.sellers.find_one({"whatsapp": seller.whatsapp})
    if existing_user:
        raise HTTPException(status_code=400, detail="Numéro WhatsApp déjà enregistré")

    existing_email = await db.sellers.find_one({"email": seller.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email déjà enregistré")

    # Create new seller with pending status
    seller_dict = {
        "whatsapp": seller.whatsapp,
        "name": seller.name,
        "businessName": seller.businessName,
        "email": seller.email,
        "city": seller.city,
        "categories": seller.categories,
        "password": hash_password(seller.password),
        "status": "pending",
        "submitDate": datetime.now(timezone.utc).isoformat(),
        "type": "seller"
    }

    result = await db.sellers.insert_one(seller_dict)
    seller_dict["id"] = str(result.inserted_id)

    return {
        "message": "Votre demande a été soumise. Elle sera examinée par un administrateur.",
        "status": "pending",
        "seller": {
            "id": seller_dict["id"],
            "name": seller.name,
            "businessName": seller.businessName,
            "status": "pending"
        }
    }


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    # Determine which collection to search
    collection = db.buyers if login_data.userType == "buyer" else db.sellers

    # Find user
    user = await collection.find_one({"whatsapp": login_data.whatsapp})

    if not user:
        raise HTTPException(status_code=401, detail="Numéro WhatsApp ou mot de passe incorrect")

    # Verify password
    if not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Numéro WhatsApp ou mot de passe incorrect")

    # Check if seller is approved
    if login_data.userType == "seller" and user.get("status") != "approved":
        raise HTTPException(
            status_code=403,
            detail="Votre compte n'est pas encore approuvé par un administrateur"
        )

    # Create access token
    user_id = str(user["_id"])
    access_token = create_access_token(
        data={"sub": user_id, "type": login_data.userType}
    )

    # Prepare user response
    user_dict = convert_objectid_to_str(user)
    del user_dict["password"]

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user_dict)
    }


@api_router.post("/auth/admin/login", response_model=TokenResponse)
async def admin_login(login_data: AdminLoginRequest):
    # Find admin
    admin = await db.admins.find_one({"username": login_data.username})

    if not admin:
        raise HTTPException(status_code=401, detail="Nom d'utilisateur ou mot de passe incorrect")

    # Check if password field exists
    if "password" not in admin or not admin["password"]:
        raise HTTPException(
            status_code=500,
            detail="Erreur: Le compte admin est mal configuré. Exécutez 'python fix_admin.py' pour corriger."
        )

    # Verify password
    try:
        if not verify_password(login_data.password, admin["password"]):
            raise HTTPException(status_code=401, detail="Nom d'utilisateur ou mot de passe incorrect")
    except Exception as e:
        logger.error(f"Erreur lors de la vérification du mot de passe: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la vérification du mot de passe. Exécutez 'python fix_admin.py' pour corriger."
        )

    # Create access token
    admin_id = str(admin["_id"])
    access_token = create_access_token(
        data={"sub": admin_id, "type": "admin"}
    )

    # Prepare admin response
    admin_dict = {
        "id": admin_id,
        "whatsapp": "",
        "name": admin.get("username"),
        "email": admin.get("email", ""),
        "type": "admin",
        "role": admin.get("role", "admin")
    }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**admin_dict)
    }


# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/sellers/pending")
async def get_pending_sellers(current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    sellers = await db.sellers.find({"status": "pending"}).to_list(1000)
    return [convert_objectid_to_str(seller) for seller in sellers]


@api_router.get("/admin/sellers")
async def get_all_sellers(current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    sellers = await db.sellers.find().to_list(1000)
    return [convert_objectid_to_str(seller) for seller in sellers]


@api_router.put("/admin/sellers/{seller_id}/approve")
async def approve_seller(seller_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    result = await db.sellers.update_one(
        {"_id": ObjectId(seller_id)},
        {"$set": {"status": "approved", "approvedDate": datetime.now(timezone.utc).isoformat()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé")

    return {"message": "Vendeur approuvé avec succès"}


@api_router.put("/admin/sellers/{seller_id}/reject")
async def reject_seller(seller_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    result = await db.sellers.update_one(
        {"_id": ObjectId(seller_id)},
        {"$set": {"status": "rejected", "rejectedDate": datetime.now(timezone.utc).isoformat()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé")

    return {"message": "Vendeur rejeté"}


@api_router.get("/admin/buyers")
async def get_all_buyers(current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    buyers = await db.buyers.find().to_list(1000)
    return [convert_objectid_to_str(buyer) for buyer in buyers]


@api_router.delete("/admin/buyers/{buyer_id}")
async def delete_buyer(buyer_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    result = await db.buyers.delete_one({"_id": ObjectId(buyer_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")

    return {"message": "Client supprimé avec succès"}


@api_router.delete("/admin/sellers/{seller_id}")
async def delete_seller(seller_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    result = await db.sellers.delete_one({"_id": ObjectId(seller_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé")

    return {"message": "Vendeur supprimé avec succès"}


@api_router.post("/admin/sellers", response_model=dict)
async def create_seller_by_admin(seller: SellerCreate, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Check if user already exists
    existing_user = await db.sellers.find_one({"whatsapp": seller.whatsapp})
    if existing_user:
        raise HTTPException(status_code=400, detail="Numéro WhatsApp déjà enregistré")

    existing_email = await db.sellers.find_one({"email": seller.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email déjà enregistré")

    # Create new seller with approved status (since created by admin)
    seller_dict = {
        "whatsapp": seller.whatsapp,
        "name": seller.name,
        "businessName": seller.businessName,
        "email": seller.email,
        "city": seller.city,
        "categories": seller.categories,
        "password": hash_password(seller.password),
        "status": "approved",
        "submitDate": datetime.now(timezone.utc).isoformat(),
        "approvedDate": datetime.now(timezone.utc).isoformat(),
        "type": "seller"
    }

    result = await db.sellers.insert_one(seller_dict)

    return {
        "message": "Vendeur créé et approuvé avec succès",
        "id": str(result.inserted_id),
        "seller": convert_objectid_to_str(seller_dict)
    }


@api_router.post("/admin/create", response_model=dict)
async def create_admin(admin: AdminCreate):
    # Check if admin already exists
    existing_admin = await db.admins.find_one({"username": admin.username})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà utilisé")

    existing_email = await db.admins.find_one({"email": admin.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    # Create new admin
    admin_dict = {
        "username": admin.username,
        "email": admin.email,
        "password": hash_password(admin.password),
        "role": admin.role,
        "createdDate": datetime.now(timezone.utc).isoformat()
    }

    result = await db.admins.insert_one(admin_dict)

    return {
        "message": "Administrateur créé avec succès",
        "id": str(result.inserted_id)
    }


@api_router.post("/admin/init-default", response_model=dict)
async def init_default_admin():
    """Create default admin if no admin exists (for easy setup)"""

    # Check if any admin exists
    admin_count = await db.admins.count_documents({})

    if admin_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Des administrateurs existent déjà ({admin_count}). Utilisez le script create_admin.py pour en créer d'autres."
        )

    # Create default admin
    default_admin = {
        "username": "admin",
        "email": "admin@nengoo.com",
        "password": hash_password("admin123"),
        "role": "admin",
        "createdDate": datetime.now(timezone.utc).isoformat()
    }

    result = await db.admins.insert_one(default_admin)

    return {
        "message": "Administrateur par défaut créé avec succès!",
        "id": str(result.inserted_id),
        "credentials": {
            "username": "admin",
            "password": "admin123",
            "warning": "⚠️ IMPORTANT: Changez ce mot de passe immédiatement après la première connexion!"
        }
    }


@api_router.post("/admin/init-system-seller", response_model=dict)
async def init_system_seller(current_user: dict = Depends(get_current_user)):
    """Create a system seller account for Nengoo (used when admin creates products)"""
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Check if system seller already exists
    existing_seller = await db.sellers.find_one({"whatsapp": "SYSTEM_NENGOO"})

    if existing_seller:
        return {
            "message": "Le vendeur système existe déjà",
            "id": str(existing_seller["_id"]),
            "seller": convert_objectid_to_str(existing_seller)
        }

    # Get all categories
    categories = await db.categories.find().to_list(1000)
    category_names = [cat["name"] for cat in categories] if categories else ["Général"]

    # Create system seller
    system_seller = {
        "whatsapp": "SYSTEM_NENGOO",
        "name": "Nengoo",
        "businessName": "Nengoo Marketplace",
        "email": "marketplace@nengoo.com",
        "city": "Plateforme",
        "categories": category_names,
        "password": hash_password("system_password_" + str(datetime.now().timestamp())),
        "status": "approved",
        "submitDate": datetime.now(timezone.utc).isoformat(),
        "approvedDate": datetime.now(timezone.utc).isoformat(),
        "type": "seller",
        "isSystemSeller": True
    }

    result = await db.sellers.insert_one(system_seller)

    return {
        "message": "Vendeur système Nengoo créé avec succès",
        "id": str(result.inserted_id),
        "seller": convert_objectid_to_str(system_seller)
    }


@api_router.post("/admin/fix-products-status", response_model=dict)
async def fix_products_status(current_user: dict = Depends(get_current_user)):
    """Fix all products to have active status"""
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Update all products without status or with inactive status to active
    result = await db.products.update_many(
        {
            "$or": [
                {"status": {"$exists": False}},
                {"status": None},
                {"status": "inactive"},
                {"status": ""}
            ]
        },
        {"$set": {"status": "active"}}
    )

    return {
        "message": f"Statut des produits corrigé avec succès",
        "updated_count": result.modified_count,
        "total_products": await db.products.count_documents({})
    }


# ==================== CATEGORIES ROUTES ====================

@api_router.get("/admin/categories")
async def get_all_categories(current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    categories = await db.categories.find().to_list(1000)
    return [convert_objectid_to_str(category) for category in categories]


@api_router.post("/admin/categories", response_model=dict)
async def create_category(category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Check if category already exists
    existing_category = await db.categories.find_one({"name": category.name})
    if existing_category:
        raise HTTPException(status_code=400, detail="Cette catégorie existe déjà")

    category_dict = {
        "name": category.name,
        "description": category.description,
        "icon": category.icon,
        "createdDate": datetime.now(timezone.utc).isoformat()
    }

    result = await db.categories.insert_one(category_dict)

    return {
        "message": "Catégorie créée avec succès",
        "id": str(result.inserted_id),
        "category": convert_objectid_to_str(category_dict)
    }


@api_router.put("/admin/categories/{category_id}", response_model=dict)
async def update_category(category_id: str, category: CategoryUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    update_data = {k: v for k, v in category.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    update_data["updatedDate"] = datetime.now(timezone.utc).isoformat()

    result = await db.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")

    return {"message": "Catégorie mise à jour avec succès"}


@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    result = await db.categories.delete_one({"_id": ObjectId(category_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")

    return {"message": "Catégorie supprimée avec succès"}


# ==================== PRODUCTS ROUTES ====================

@api_router.get("/admin/products")
async def get_all_products(current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    products = await db.products.find().to_list(1000)

    # Enrich products with seller information
    enriched_products = []
    for product in products:
        product_dict = convert_objectid_to_str(product)

        # Get seller_id: prioritize 'sellerId' from MongoDB, fallback to 'seller_id'
        # Note: product is the original MongoDB document, product_dict is after conversion
        seller_id = product.get('sellerId') or product.get('seller_id')

        if seller_id:
            # Normalize to string and store in product_dict
            seller_id_str = str(seller_id) if not isinstance(seller_id, str) else seller_id
            product_dict['sellerId'] = seller_id_str

            try:
                # Fetch seller information from database
                seller = await db.sellers.find_one({"_id": ObjectId(seller_id_str)})

                if seller:
                    product_dict["sellerName"] = seller.get("businessName") or seller.get("name") or "N/A"
                    product_dict["sellerWhatsapp"] = seller.get("whatsapp")
                else:
                    product_dict["sellerName"] = "Vendeur introuvable"
                    logger.warning(f"Seller not found for product {product_dict.get('name')}, sellerId: {seller_id}")
            except Exception as e:
                logger.error(f"Error fetching seller for product {product_dict.get('name')}: {type(e).__name__}: {str(e)}")
                print(f"DEBUG: Error for product {product_dict.get('name')}: {e}")
                product_dict["sellerName"] = f"Erreur: {str(e)}"
        else:
            product_dict["sellerName"] = "Aucun vendeur"
            product_dict["sellerId"] = None

        enriched_products.append(product_dict)

    return enriched_products


# ==================== SELLER PRODUCTS ROUTES ====================

@api_router.get("/seller/products")
async def get_seller_own_products(current_user: dict = Depends(get_current_user)):
    """Get all products of the current seller"""
    if current_user["type"] != "seller":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    products = await db.products.find({"sellerId": current_user["id"]}).to_list(1000)
    return [convert_objectid_to_str(product) for product in products]


@api_router.post("/seller/products", response_model=dict)
async def create_product_by_seller(product: SellerProductCreate, current_user: dict = Depends(get_current_user)):
    """Seller creates a new product"""
    if current_user["type"] != "seller":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Verify seller is approved
    seller = await db.sellers.find_one({"_id": ObjectId(current_user["id"])})
    if not seller or seller.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Votre compte vendeur n'est pas approuvé")

    # Verify category exists
    category = await db.categories.find_one({"name": product.category})
    if not category:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")

    # Use the current seller's ID
    product_dict = {
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "category": product.category,
        "sellerId": current_user["id"],  # Use authenticated seller's ID
        "images": product.images,
        "stock": product.stock,
        "unit": product.unit,
        "status": "active",
        "createdDate": datetime.now(timezone.utc).isoformat()
    }

    result = await db.products.insert_one(product_dict)

    return {
        "message": "Produit créé avec succès",
        "id": str(result.inserted_id),
        "product": convert_objectid_to_str(product_dict)
    }


@api_router.put("/seller/products/{product_id}", response_model=dict)
async def update_seller_product(product_id: str, product: ProductUpdate, current_user: dict = Depends(get_current_user)):
    """Seller updates their own product"""
    if current_user["type"] != "seller":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Verify the product belongs to this seller
    existing_product = await db.products.find_one({
        "_id": ObjectId(product_id),
        "sellerId": current_user["id"]
    })

    if not existing_product:
        raise HTTPException(status_code=404, detail="Produit non trouvé ou vous n'avez pas l'autorisation")

    update_data = {k: v for k, v in product.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    update_data["updatedDate"] = datetime.now(timezone.utc).isoformat()

    result = await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")

    return {"message": "Produit mis à jour avec succès"}


@api_router.delete("/seller/products/{product_id}")
async def delete_seller_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Seller deletes their own product"""
    if current_user["type"] != "seller":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Verify the product belongs to this seller
    result = await db.products.delete_one({
        "_id": ObjectId(product_id),
        "sellerId": current_user["id"]
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé ou vous n'avez pas l'autorisation")

    return {"message": "Produit supprimé avec succès"}


@api_router.post("/admin/products", response_model=dict)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Verify seller exists
    seller = await db.sellers.find_one({"_id": ObjectId(product.sellerId)})
    if not seller:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé")

    # Verify category exists
    category = await db.categories.find_one({"name": product.category})
    if not category:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")

    product_dict = {
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "category": product.category,
        "sellerId": product.sellerId,
        "images": product.images,
        "stock": product.stock,
        "unit": product.unit,
        "status": "active",
        "createdDate": datetime.now(timezone.utc).isoformat()
    }

    result = await db.products.insert_one(product_dict)

    return {
        "message": "Produit créé avec succès",
        "id": str(result.inserted_id),
        "product": convert_objectid_to_str(product_dict)
    }


@api_router.put("/admin/products/{product_id}", response_model=dict)
async def update_product(product_id: str, product: ProductUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    update_data = {k: v for k, v in product.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    update_data["updatedDate"] = datetime.now(timezone.utc).isoformat()

    # Si sellerId est mis à jour, supprimer l'ancien champ seller_id pour éviter les conflits
    update_operations = {"$set": update_data}
    if "sellerId" in update_data:
        update_operations["$unset"] = {"seller_id": ""}

    result = await db.products.update_one(
        {"_id": ObjectId(product_id)},
        update_operations
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")

    return {"message": "Produit mis à jour avec succès"}


@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    result = await db.products.delete_one({"_id": ObjectId(product_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")

    return {"message": "Produit supprimé avec succès"}


# ==================== UPLOAD ROUTES ====================

@api_router.post("/upload/product-image")
async def upload_product_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a product image and return the file path"""
    if current_user["type"] not in ["admin", "seller"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non supporté. Formats acceptés: {', '.join(allowed_extensions)}"
        )

    # Validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Le fichier est trop volumineux (max 5MB)")

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        logger.error(f"Error saving file: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de la sauvegarde du fichier")

    # Return the URL path
    image_url = f"/uploads/products/{unique_filename}"
    return {"url": image_url, "filename": unique_filename}


@api_router.delete("/upload/product-image/{filename}")
async def delete_product_image(filename: str, current_user: dict = Depends(get_current_user)):
    """Delete a product image"""
    if current_user["type"] not in ["admin", "seller"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    file_path = UPLOAD_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")

    try:
        file_path.unlink()
        return {"message": "Image supprimée avec succès"}
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression du fichier")


# ==================== PUBLIC ROUTES (No Auth Required) ====================

@api_router.get("/categories")
async def get_public_categories():
    """Get all categories (public endpoint)"""
    categories = await db.categories.find().to_list(1000)
    return [convert_objectid_to_str(category) for category in categories]


@api_router.get("/products")
async def get_public_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    seller_id: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all active products with optional filters (public endpoint)"""
    query = {"status": "active"}

    # Filter by category
    if category:
        query["category"] = category

    # Filter by seller
    if seller_id:
        query["sellerId"] = seller_id

    # Search in name and description
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]

    # Get products with pagination
    products = await db.products.find(query).skip(skip).limit(limit).to_list(limit)

    # Enrich products with seller information
    enriched_products = []
    for product in products:
        product_dict = convert_objectid_to_str(product)

        # Get seller info - handle both string and ObjectId sellerId
        seller_id = product.get("sellerId")
        if seller_id:
            try:
                # Try to convert to ObjectId if it's a valid ObjectId string
                if isinstance(seller_id, str):
                    seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
                else:
                    seller = await db.sellers.find_one({"_id": seller_id})

                if seller:
                    product_dict["seller"] = {
                        "id": str(seller["_id"]),
                        "businessName": seller.get("businessName"),
                        "name": seller.get("name"),
                        "city": seller.get("city"),
                        "whatsapp": seller.get("whatsapp")
                    }
            except Exception as e:
                logger.error(f"Error fetching seller for product {product.get('_id')}: {str(e)}")

        enriched_products.append(product_dict)

    return enriched_products


@api_router.get("/products/{product_id}")
async def get_public_product(product_id: str):
    """Get a single product by ID (public endpoint)"""
    product = await db.products.find_one({"_id": ObjectId(product_id), "status": "active"})

    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")

    product_dict = convert_objectid_to_str(product)

    # Get seller info - handle both string and ObjectId sellerId
    seller_id = product.get("sellerId")
    if seller_id:
        try:
            if isinstance(seller_id, str):
                seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
            else:
                seller = await db.sellers.find_one({"_id": seller_id})

            if seller:
                product_dict["seller"] = {
                    "id": str(seller["_id"]),
                    "businessName": seller.get("businessName"),
                    "name": seller.get("name"),
                    "city": seller.get("city"),
                    "whatsapp": seller.get("whatsapp"),
                    "email": seller.get("email")
                }
        except Exception as e:
            logger.error(f"Error fetching seller for product {product_id}: {str(e)}")

    return product_dict


@api_router.get("/sellers/{seller_id}/products")
async def get_seller_products(seller_id: str):
    """Get all products from a specific seller (public endpoint)"""
    # Check if seller exists and is approved
    seller = await db.sellers.find_one({"_id": ObjectId(seller_id), "status": "approved"})

    if not seller:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé ou non approuvé")

    # Get all active products from this seller
    products = await db.products.find({
        "sellerId": seller_id,
        "status": "active"
    }).to_list(1000)

    enriched_products = []
    seller_info = {
        "id": str(seller["_id"]),
        "businessName": seller.get("businessName"),
        "name": seller.get("name"),
        "city": seller.get("city"),
        "categories": seller.get("categories", [])
    }

    for product in products:
        product_dict = convert_objectid_to_str(product)
        product_dict["seller"] = seller_info
        enriched_products.append(product_dict)

    return {
        "seller": seller_info,
        "products": enriched_products,
        "count": len(enriched_products)
    }


# ==================== GENERAL ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Nengoo API - Bienvenue!"}

@api_router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user_type = current_user["type"]

    if user_type == "buyer":
        user = await db.buyers.find_one({"_id": ObjectId(user_id)})
    elif user_type == "seller":
        user = await db.sellers.find_one({"_id": ObjectId(user_id)})
    elif user_type == "admin":
        user = await db.admins.find_one({"_id": ObjectId(user_id)})
    else:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    user_dict = convert_objectid_to_str(user)
    if "password" in user_dict:
        del user_dict["password"]

    return user_dict


# Include the router in the main app
app.include_router(api_router)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
