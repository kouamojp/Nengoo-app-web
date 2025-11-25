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
import bcrypt
import jwt
from bson import ObjectId
import shutil
import uuid
import hashlib
import base64
from s3_config import upload_file_to_s3, delete_file_from_s3, check_s3_configuration
from mail_utils import send_email, generate_seller_notification_email


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection - Support both local and production environments
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db_name = os.environ.get('DB_NAME', 'nengoo')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Create uploads directory if it doesn't exist
UPLOAD_DIR = ROOT_DIR / "uploads" / "products"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Password hashing
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") # Removed due to bcrypt compatibility issues

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

class OrderItem(BaseModel):
    productId: str
    productName: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    buyerId: str
    items: List[OrderItem]
    deliveryAddress: str
    deliveryCity: str
    deliveryPhone: str
    notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[str] = None  # pending, confirmed, shipped, delivered, cancelled
    notes: Optional[str] = None

class AdminSellerUpdate(BaseModel):
    whatsapp: Optional[str] = None
    name: Optional[str] = None
    businessName: Optional[str] = None
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    categories: Optional[List[str]] = None
    status: Optional[str] = None


class AdminBuyerUpdate(BaseModel):
    whatsapp: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class AdminPasswordUpdate(BaseModel):
    password: str


class SellerProfileUpdate(BaseModel):
    """Update seller profile by the seller themselves"""
    name: Optional[str] = None
    businessName: Optional[str] = None
    email: Optional[EmailStr] = None
    whatsapp: Optional[str] = None
    city: Optional[str] = None


class BuyerProfileUpdate(BaseModel):
    """Update buyer profile by the buyer themselves"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    whatsapp: Optional[str] = None


class MessageCreate(BaseModel):
    """Create a new message from buyer to seller"""
    sellerId: str
    subject: str
    message: str


class MessageReply(BaseModel):
    """Reply to a message"""
    message: str


class MessageResponse(BaseModel):
    """Message response model"""
    id: str
    senderId: str
    senderName: str
    senderType: str  # "buyer" or "seller"
    receiverId: str
    receiverName: str
    sellerId: str
    subject: str
    message: str
    createdDate: str
    read: bool
    parentMessageId: Optional[str] = None


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

def sha256_preprocess(password: str) -> str:
    """
    Pre-hashes a password with SHA-256 and encodes it to avoid bcrypt's 72-byte limit.
    """
    password_bytes = password.encode('utf-8')
    sha256_hash = hashlib.sha256(password_bytes).digest()
    # Use base64 encoding to get a predictable, URL-safe string.
    return base64.urlsafe_b64encode(sha256_hash).decode('ascii')


def hash_password(password: str) -> str:
    """
    Hashes a password using SHA-256 pre-processing followed by bcrypt.
    This approach avoids bcrypt's 72-byte limit.
    """
    validate_password(password)
    pre_hashed_password = sha256_preprocess(password)
    password_bytes = pre_hashed_password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a password against a hash.
    It first attempts to verify using the new SHA-256 + bcrypt method.
    If that fails, it falls back to the old, direct bcrypt method for backward
    compatibility with old passwords.
    """
    try:
        # 1. Try the new method (SHA-256 pre-hash + bcrypt)
        pre_hashed_plain = sha256_preprocess(plain_password)
        plain_bytes = pre_hashed_plain.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        if bcrypt.checkpw(plain_bytes, hashed_bytes):
            return True
    except (ValueError, TypeError):
        pass  # Fall through to legacy check

    try:
        # 2. Fallback for legacy passwords (direct bcrypt with flawed truncation)
        legacy_plain_bytes = plain_password.encode('utf-8')[:72]
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(legacy_plain_bytes, hashed_bytes)
    except (ValueError, TypeError):
        return False

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
    except Exception as e:
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def convert_objectid_to_str(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

async def find_buyer(buyer_id):
    """Find buyer in both buyers and clients collections"""
    buyer = await db.buyers.find_one({"_id": ObjectId(buyer_id)})
    if not buyer:
        buyer = await db.clients.find_one({"_id": ObjectId(buyer_id)})
    return buyer


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

    if not user or "password" not in user or not user["password"]:
        raise HTTPException(status_code=401, detail="Numéro WhatsApp ou mot de passe incorrect")

    # Verify password
    try:
        is_valid_password = verify_password(login_data.password, user["password"])
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la vérification du mot de passe pour {login_data.whatsapp}: {str(e)}")
        # Return a generic error to avoid leaking implementation details
        raise HTTPException(status_code=500, detail="Erreur interne du serveur lors de l'authentification.")

    if not is_valid_password:
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
    user_dict["type"] = login_data.userType

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


@api_router.put("/admin/sellers/{seller_id}", response_model=dict)
async def update_seller_by_admin(seller_id: str, seller_data: AdminSellerUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    update_data = seller_data.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    # Check for uniqueness constraints if whatsapp or email are being updated
    if "whatsapp" in update_data:
        existing = await db.sellers.find_one({"whatsapp": update_data["whatsapp"], "_id": {"$ne": ObjectId(seller_id)}})
        if existing:
            raise HTTPException(status_code=400, detail="Ce numéro WhatsApp est déjà utilisé par un autre vendeur.")
    
    if "email" in update_data:
        existing = await db.sellers.find_one({"email": update_data["email"], "_id": {"$ne": ObjectId(seller_id)}})
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé par un autre vendeur.")

    update_data["updatedDate"] = datetime.now(timezone.utc).isoformat()

    result = await db.sellers.update_one(
        {"_id": ObjectId(seller_id)},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        seller_exists = await db.sellers.find_one({"_id": ObjectId(seller_id)})
        if not seller_exists:
            raise HTTPException(status_code=404, detail="Vendeur non trouvé")
        return {"message": "Aucune modification détectée."}

    return {"message": "Vendeur mis à jour avec succès"}


@api_router.put("/admin/buyers/{buyer_id}", response_model=dict)
async def update_buyer_by_admin(buyer_id: str, buyer_data: AdminBuyerUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    update_data = buyer_data.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    # Check for uniqueness constraints if whatsapp or email are being updated
    if "whatsapp" in update_data:
        existing = await db.buyers.find_one({"whatsapp": update_data["whatsapp"], "_id": {"$ne": ObjectId(buyer_id)}})
        if existing:
            raise HTTPException(status_code=400, detail="Ce numéro WhatsApp est déjà utilisé par un autre client.")

    if "email" in update_data:
        existing = await db.buyers.find_one({"email": update_data["email"], "_id": {"$ne": ObjectId(buyer_id)}})
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé par un autre client.")

    update_data["updatedDate"] = datetime.now(timezone.utc).isoformat()

    result = await db.buyers.update_one(
        {"_id": ObjectId(buyer_id)},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        buyer_exists = await db.buyers.find_one({"_id": ObjectId(buyer_id)})
        if not buyer_exists:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        return {"message": "Aucune modification détectée."}

    return {"message": "Client mis à jour avec succès"}


@api_router.put("/admin/sellers/{seller_id}/password", response_model=dict)
async def update_seller_password_by_admin(seller_id: str, data: AdminPasswordUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    validate_password(data.password)
    hashed_password = hash_password(data.password)

    result = await db.sellers.update_one(
        {"_id": ObjectId(seller_id)},
        {"$set": {"password": hashed_password, "updatedDate": datetime.now(timezone.utc).isoformat()}}
    )

    if result.modified_count == 0:
        # This also handles the case where the seller is not found
        raise HTTPException(status_code=404, detail="Vendeur non trouvé ou le mot de passe est identique.")

    return {"message": "Mot de passe du vendeur mis à jour avec succès"}


@api_router.put("/admin/buyers/{buyer_id}/password", response_model=dict)
async def update_buyer_password_by_admin(buyer_id: str, data: AdminPasswordUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    validate_password(data.password)
    hashed_password = hash_password(data.password)

    result = await db.buyers.update_one(
        {"_id": ObjectId(buyer_id)},
        {"$set": {"password": hashed_password, "updatedDate": datetime.now(timezone.utc).isoformat()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé ou le mot de passe est identique.")

    return {"message": "Mot de passe du client mis à jour avec succès"}


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


# ==================== ORDERS ROUTES ====================

@api_router.post("/orders", response_model=dict)
async def create_order(order: OrderCreate, current_user: dict = Depends(get_current_user)):
    """Create a new order (buyer only)"""
    if current_user["type"] != "buyer":
        raise HTTPException(status_code=403, detail="Seuls les acheteurs peuvent créer des commandes")

    # Verify buyer exists
    buyer = await find_buyer(order.buyerId)
    if not buyer or str(buyer["_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez créer une commande que pour vous-même")

    # Calculate total and verify products
    total = 0
    order_items_with_seller = []
    sellers_to_notify = {}  # {seller_id: [product_item]}

    for item in order.items:
        product = await db.products.find_one({"_id": ObjectId(item.productId)})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {item.productId} non trouvé")

        if product.get("status") != "active":
            raise HTTPException(status_code=400, detail=f"Le produit {product.get('name')} n'est plus disponible")

        total += item.price * item.quantity
        
        seller_id = product.get("sellerId")
        
        # Add product to the main order item list
        order_items_with_seller.append({
            "productId": item.productId,
            "productName": item.productName,
            "quantity": item.quantity,
            "price": item.price,
            "sellerId": seller_id
        })

        # Group products by seller for notification
        if seller_id:
            if seller_id not in sellers_to_notify:
                sellers_to_notify[seller_id] = []
            sellers_to_notify[seller_id].append({
                "name": item.productName,
                "quantity": item.quantity
            })

    # Create order
    order_dict = {
        "buyerId": order.buyerId,
        "items": order_items_with_seller,
        "deliveryAddress": order.deliveryAddress,
        "deliveryCity": order.deliveryCity,
        "deliveryPhone": order.deliveryPhone,
        "notes": order.notes,
        "total": total,
        "status": "pending",
        "createdDate": datetime.now(timezone.utc).isoformat()
    }

    result = await db.orders.insert_one(order_dict)
    order_id = str(result.inserted_id)

    # --- Send email notifications to sellers ---
    for seller_id, products in sellers_to_notify.items():
        seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
        if seller and seller.get("email"):
            seller_name = seller.get("businessName") or seller.get("name")
            subject, body = generate_seller_notification_email(seller_name, order_id, products)
            
            # Run email sending in the background to not block the response
            # Note: For a more robust solution, consider a background task queue like Celery or ARQ.
            try:
                send_email(seller["email"], subject, body)
            except Exception as e:
                logger.error(f"Failed to send order notification email to seller {seller_id} for order {order_id}. Error: {e}")
        else:
            logger.warning(f"Could not notify seller {seller_id} for order {order_id}: seller not found or has no email.")


    return {
        "message": "Commande créée avec succès",
        "orderId": order_id,
        "total": total
    }


@api_router.get("/orders/my")
async def get_my_orders(current_user: dict = Depends(get_current_user)):
    """Get orders for the current buyer"""
    if current_user["type"] != "buyer":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    orders = await db.orders.find({"buyerId": current_user["id"]}).to_list(1000)

    # Enrich orders with seller information
    enriched_orders = []
    for order in orders:
        order_dict = convert_objectid_to_str(order)

        # Get buyer info
        buyer = await find_buyer(order["buyerId"])
        if buyer:
            order_dict["buyerName"] = buyer.get("name")
            order_dict["buyerWhatsapp"] = buyer.get("whatsapp")

        enriched_orders.append(order_dict)

    return enriched_orders


@api_router.get("/seller/orders")
async def get_seller_orders(current_user: dict = Depends(get_current_user)):
    """Get orders containing products from the current seller"""
    if current_user["type"] != "seller":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Find orders that contain products from this seller
    orders = await db.orders.find({"items.sellerId": current_user["id"]}).to_list(1000)

    enriched_orders = []
    for order in orders:
        order_dict = convert_objectid_to_str(order)

        # Get buyer info
        buyer = await find_buyer(order["buyerId"])
        if buyer:
            order_dict["buyerName"] = buyer.get("name")
            order_dict["buyerWhatsapp"] = buyer.get("whatsapp")

        # Filter items to only show this seller's products
        seller_items = [item for item in order["items"] if item.get("sellerId") == current_user["id"]]
        order_dict["items"] = seller_items

        # Recalculate total for seller's items only
        seller_total = sum(item["price"] * item["quantity"] for item in seller_items)
        order_dict["sellerTotal"] = seller_total

        enriched_orders.append(order_dict)

    return enriched_orders


@api_router.delete("/seller/orders/{order_id}")
async def delete_seller_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an order containing seller's products (seller only)"""
    if current_user["type"] != "seller":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Verify the order exists and contains seller's products
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    # Check if this order contains products from this seller
    has_seller_products = any(item.get("sellerId") == current_user["id"] for item in order.get("items", []))
    if not has_seller_products:
        raise HTTPException(status_code=403, detail="Cette commande ne contient pas vos produits")

    # Delete the order
    result = await db.orders.delete_one({"_id": ObjectId(order_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    return {"message": "Commande supprimée avec succès"}


# ==================== PROFILE ROUTES ====================

@api_router.put("/seller/profile")
async def update_seller_profile(profile_data: SellerProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update seller's own profile"""
    if current_user["type"] != "seller":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Build update dict with only provided fields
    update_data = {}
    if profile_data.name is not None:
        update_data["name"] = profile_data.name
    if profile_data.businessName is not None:
        update_data["businessName"] = profile_data.businessName
    if profile_data.email is not None:
        # Check if email already exists for another seller
        existing = await db.sellers.find_one({
            "email": profile_data.email,
            "_id": {"$ne": ObjectId(current_user["id"])}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        update_data["email"] = profile_data.email
    if profile_data.whatsapp is not None:
        # Check if whatsapp already exists for another seller
        existing = await db.sellers.find_one({
            "whatsapp": profile_data.whatsapp,
            "_id": {"$ne": ObjectId(current_user["id"])}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Ce numéro WhatsApp est déjà utilisé")
        update_data["whatsapp"] = profile_data.whatsapp
    if profile_data.city is not None:
        update_data["city"] = profile_data.city

    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    # Update seller
    result = await db.sellers.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé ou aucune modification")

    # Return updated seller
    updated_seller = await db.sellers.find_one({"_id": ObjectId(current_user["id"])})
    seller_dict = convert_objectid_to_str(updated_seller)
    if "password" in seller_dict:
        del seller_dict["password"]

    return seller_dict


@api_router.put("/buyer/profile")
async def update_buyer_profile(profile_data: BuyerProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update buyer's own profile"""
    if current_user["type"] != "buyer":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Build update dict with only provided fields
    update_data = {}
    if profile_data.name is not None:
        update_data["name"] = profile_data.name
    if profile_data.email is not None:
        # Check if email already exists for another buyer
        existing = await db.buyers.find_one({
            "email": profile_data.email,
            "_id": {"$ne": ObjectId(current_user["id"])}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        update_data["email"] = profile_data.email
    if profile_data.whatsapp is not None:
        # Check if whatsapp already exists for another buyer
        existing = await db.buyers.find_one({
            "whatsapp": profile_data.whatsapp,
            "_id": {"$ne": ObjectId(current_user["id"])}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Ce numéro WhatsApp est déjà utilisé")
        update_data["whatsapp"] = profile_data.whatsapp

    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    # Update buyer
    result = await db.buyers.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Acheteur non trouvé ou aucune modification")

    # Return updated buyer
    updated_buyer = await db.buyers.find_one({"_id": ObjectId(current_user["id"])})
    buyer_dict = convert_objectid_to_str(updated_buyer)
    if "password" in buyer_dict:
        del buyer_dict["password"]

    return buyer_dict


# ==================== ADMIN ORDERS ROUTES ====================

@api_router.get("/admin/orders")
async def get_all_orders(current_user: dict = Depends(get_current_user)):
    """Get all orders with buyer and seller information (admin only)"""
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    orders = await db.orders.find().sort("createdDate", -1).to_list(1000)

    enriched_orders = []
    for order in orders:
        order_dict = convert_objectid_to_str(order)

        # Get buyer info safely
        order_dict["buyerName"] = "Client non trouvé"
        order_dict["buyerWhatsapp"] = ""
        order_dict["buyerEmail"] = ""
        
        buyer_id = order.get("buyerId")
        if buyer_id:
            try:
                buyer = await find_buyer(buyer_id)
                if buyer:
                    order_dict["buyerName"] = buyer.get("name")
                    order_dict["buyerWhatsapp"] = buyer.get("whatsapp")
                    order_dict["buyerEmail"] = buyer.get("email")
            except Exception as e:
                logger.warning(f"Could not fetch buyer for order {order_dict['id']} with buyerId {buyer_id}. Error: {e}")

        # Enrich each item with seller info safely
        enriched_items = []
        for item in order.get("items", []):
            item_dict = item.copy()
            item_dict["sellerName"] = "Vendeur non trouvé"

            seller_id = item.get("sellerId")
            if seller_id:
                try:
                    seller = await db.sellers.find_one({"_id": ObjectId(seller_id)})
                    if seller:
                        item_dict["sellerName"] = seller.get("businessName") or seller.get("name")
                        item_dict["sellerBusinessName"] = seller.get("businessName")
                        item_dict["sellerWhatsapp"] = seller.get("whatsapp")
                except Exception as e:
                    logger.warning(f"Could not fetch seller for item {item.get('productId')} in order {order_dict['id']} with sellerId {seller_id}. Error: {e}")
            
            enriched_items.append(item_dict)

        order_dict["items"] = enriched_items
        enriched_orders.append(order_dict)

    return enriched_orders


@api_router.get("/admin/orders/{order_id}")
async def get_order_by_id(order_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific order with all details (admin only)"""
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    order = await db.orders.find_one({"_id": ObjectId(order_id)})

    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    order_dict = convert_objectid_to_str(order)

    # Get buyer info
    buyer = await find_buyer(order["buyerId"])
    if buyer:
        order_dict["buyer"] = {
            "id": str(buyer["_id"]),
            "name": buyer.get("name"),
            "whatsapp": buyer.get("whatsapp"),
            "email": buyer.get("email")
        }

    # Enrich items with seller info
    enriched_items = []
    for item in order.get("items", []):
        item_dict = item.copy()

        if item.get("sellerId"):
            seller = await db.sellers.find_one({"_id": ObjectId(item["sellerId"])})
            if seller:
                item_dict["seller"] = {
                    "id": str(seller["_id"]),
                    "name": seller.get("name"),
                    "businessName": seller.get("businessName"),
                    "whatsapp": seller.get("whatsapp")
                }

        enriched_items.append(item_dict)

    order_dict["items"] = enriched_items

    return order_dict


@api_router.put("/admin/orders/{order_id}")
async def update_order_status(order_id: str, order_update: OrderUpdate, current_user: dict = Depends(get_current_user)):
    """Update order status (admin only)"""
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    update_data = order_update.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    update_data["updatedDate"] = datetime.now(timezone.utc).isoformat()

    result = await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        order_exists = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order_exists:
            raise HTTPException(status_code=404, detail="Commande non trouvée")
        return {"message": "Aucune modification détectée"}

    return {"message": "Commande mise à jour avec succès"}


@api_router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an order (admin only)"""
    if current_user["type"] != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    result = await db.orders.delete_one({"_id": ObjectId(order_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    return {"message": "Commande supprimée avec succès"}


# ==================== UPLOAD ROUTES ====================

@api_router.post("/upload/product-image")
async def upload_product_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a product image to S3 and return the URL"""
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

    # Upload to S3
    try:
        result = upload_file_to_s3(
            file_content=content,
            filename=file.filename,
            content_type=file.content_type
        )
        return {"url": result["url"], "filename": result["filename"]}
    except Exception as e:
        logger.error(f"Error uploading to S3: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")


@api_router.delete("/upload/product-image/{filename}")
async def delete_product_image(filename: str, current_user: dict = Depends(get_current_user)):
    """Delete a product image from S3"""
    if current_user["type"] not in ["admin", "seller"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    try:
        delete_file_from_s3(filename)
        return {"message": "Image supprimée avec succès"}
    except Exception as e:
        logger.error(f"Error deleting from S3: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")


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


# ==================== MESSAGES ROUTES ====================

@api_router.post("/messages")
async def create_message(message_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    """Create a new message from buyer to seller"""
    if current_user["type"] != "buyer":
        raise HTTPException(status_code=403, detail="Seuls les acheteurs peuvent envoyer des messages")

    # Verify seller exists
    seller = await db.sellers.find_one({"_id": ObjectId(message_data.sellerId)})
    if not seller:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé")

    # Get sender info
    buyer = await db.buyers.find_one({"_id": ObjectId(current_user["id"])})
    if not buyer:
        raise HTTPException(status_code=404, detail="Acheteur non trouvé")

    message = {
        "senderId": current_user["id"],
        "senderName": buyer.get("name"),
        "senderType": "buyer",
        "receiverId": message_data.sellerId,
        "receiverName": seller.get("name"),
        "sellerId": message_data.sellerId,
        "subject": message_data.subject,
        "message": message_data.message,
        "createdDate": datetime.now(timezone.utc).isoformat(),
        "read": False,
        "parentMessageId": None
    }

    result = await db.messages.insert_one(message)
    message["id"] = str(result.inserted_id)
    del message["_id"]

    return message


@api_router.get("/seller/messages")
async def get_seller_messages(current_user: dict = Depends(get_current_user)):
    """Get all messages for current seller"""
    if current_user["type"] != "seller":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Find all messages where seller is the receiver
    messages = await db.messages.find({
        "sellerId": current_user["id"]
    }).sort("createdDate", -1).to_list(1000)

    return [convert_objectid_to_str(msg) for msg in messages]


@api_router.get("/buyer/messages")
async def get_buyer_messages(current_user: dict = Depends(get_current_user)):
    """Get all messages for current buyer"""
    if current_user["type"] != "buyer":
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Find all messages where buyer is the sender
    messages = await db.messages.find({
        "senderId": current_user["id"],
        "senderType": "buyer"
    }).sort("createdDate", -1).to_list(1000)

    return [convert_objectid_to_str(msg) for msg in messages]


@api_router.put("/messages/{message_id}/read")
async def mark_message_as_read(message_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a message as read"""
    message = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")

    # Check if user is the receiver
    if message["receiverId"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"read": True}}
    )

    return {"success": True}


@api_router.post("/messages/{message_id}/reply")
async def reply_to_message(message_id: str, reply_data: MessageReply, current_user: dict = Depends(get_current_user)):
    """Reply to a message (seller to buyer)"""
    if current_user["type"] != "seller":
        raise HTTPException(status_code=403, detail="Seuls les vendeurs peuvent répondre aux messages")

    # Get original message
    original_message = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not original_message:
        raise HTTPException(status_code=404, detail="Message non trouvé")

    # Verify seller is the receiver of the original message
    if original_message["receiverId"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    # Get seller info
    seller = await db.sellers.find_one({"_id": ObjectId(current_user["id"])})
    if not seller:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé")

    # Create reply message (seller to buyer)
    reply_message = {
        "senderId": current_user["id"],
        "senderName": seller.get("name"),
        "senderType": "seller",
        "receiverId": original_message["senderId"],
        "receiverName": original_message["senderName"],
        "sellerId": current_user["id"],
        "subject": f"RE: {original_message['subject']}",
        "message": reply_data.message,
        "createdDate": datetime.now(timezone.utc).isoformat(),
        "read": False,
        "parentMessageId": message_id
    }

    result = await db.messages.insert_one(reply_message)
    reply_message["id"] = str(result.inserted_id)
    del reply_message["_id"]

    return reply_message


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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()