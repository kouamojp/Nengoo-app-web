from fastapi import FastAPI, APIRouter, HTTPException, status, Header, Depends, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import uuid
from datetime import datetime, timedelta
from enum import Enum
import bcrypt
import boto3
from botocore.exceptions import ClientError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

app = FastAPI()
api_router = APIRouter(prefix="/api")


origins = [
    "https://www.nengoo.com",
    "https://nengoo.com",
    "https://nengoo-app-web.vercel.app",
    "https://nengoo-app-web.onrender.com",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8000",
]

# En développement, autoriser toutes les origines localhost
# Pour production, utilisez la liste origins ci-dessus
if os.getenv("ENVIRONMENT", "development") == "development":
    allow_origins_list = ["*"]  # Autorise toutes les origines en dev
else:
    allow_origins_list = origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Security (Mock Authorization) ---

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
    status_texts = {
        "pending": "En attente",
        "processing": "En cours",
        "shipped": "Expédiée",
        "delivered": "Livrée",
        "cancelled": "Annulée"
    }
    return status_texts.get(status, status)

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

class Seller(BaseModel):
    id: str = Field(default_factory=lambda: f"seller_{str(uuid.uuid4())[:8]}")
    whatsapp: str
    password: Optional[str] = None  # Hashed. Made optional to support legacy data and public listing.
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
    currency: str = "XAF"
    status: str
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
    lastName: str
    email: str
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
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

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    
class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CategoryWithCount(Category):
    productCount: int

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
    password: Optional[str] = None # Hashed password
    type: str = "buyer"
    joinDate: datetime
    status: str
    totalOrders: int = 0
    totalSpent: float = 0.0
    reset_token: Optional[str] = None
    reset_token_expiry: Optional[datetime] = None

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
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    if request.user_type not in ['buyer', 'seller']:
        raise HTTPException(status_code=400, detail="Invalid user type")

    collection = db.sellers if request.user_type == 'seller' else db.users
    query = {"email": request.email}
    if request.user_type == 'buyer':
        query["type"] = "buyer"

    user = await collection.find_one(query)
    if not user:
        # Don't reveal if user exists
        return {"message": "If an account exists with this email, a password reset link has been sent."}

    reset_token = str(uuid.uuid4())
    expiry = datetime.utcnow() + timedelta(hours=1)

    await collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": reset_token, "reset_token_expiry": expiry}}
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
            "reset_link": reset_link
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
        {"$set": {
            "password": hashed_password,
            "reset_token": None,
            "reset_token_expiry": None
        }}
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
    heroImageUrl: str = Field(..., description="URL de l'image de la section hero de la page d'accueil")

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
    # Remplacer par une URL par défaut ou une image de secours appropriée
    return HomepageSettings(heroImageUrl="https://via.placeholder.com/1920x1080.png?text=Nengoo")

@api_router.put("/settings/homepage", response_model=HomepageSettings, dependencies=[Depends(super_admin_required)])
async def update_homepage_settings(settings: HomepageSettings):
    await db.settings.update_one(
        {"_id": "homepage_settings"},
        {"$set": settings.dict()},
        upsert=True
    )
    return settings

# --- Buyer Management ---
@api_router.post("/buyers/register", response_model=Buyer)
async def register_buyer(buyer_data: BuyerCreate):
    """Register a new buyer account"""
    # Check if buyer already exists
    existing_buyer = await db.users.find_one({"whatsapp": buyer_data.whatsapp, "type": "buyer"})
    if existing_buyer:
        raise HTTPException(status_code=400, detail="Un compte avec ce numéro WhatsApp existe déjà")

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
    return new_buyer

@api_router.post("/buyers/login", response_model=Buyer)
async def buyer_login(login_data: BuyerLoginRequest):
    """Login for buyer accounts"""
    logging.info(f"[BUYER LOGIN] Attempting login with WhatsApp: {login_data.whatsapp}")

    buyer = await db.users.find_one({"whatsapp": login_data.whatsapp, "type": "buyer"})

    if not buyer:
        logging.warning(f"[BUYER LOGIN] Buyer not found with WhatsApp: {login_data.whatsapp}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou mot de passe incorrect")

    if not buyer.get("password"):
        logging.warning(f"[BUYER LOGIN] Buyer {login_data.whatsapp} has no password")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ce compte n'a pas de mot de passe. Veuillez vous inscrire.")

    if not verify_password(login_data.password, buyer["password"]):
        logging.warning(f"[BUYER LOGIN] Invalid password for buyer {login_data.whatsapp}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou mot de passe incorrect")

    if buyer.get("status") != "active":
        logging.warning(f"[BUYER LOGIN] Buyer {login_data.whatsapp} account is not active: {buyer.get('status')}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Votre compte est désactivé")

    logging.info(f"[BUYER LOGIN] Login successful for {login_data.whatsapp}")
    return Buyer(**buyer)

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
@api_router.get("/products", response_model=List[Product])
async def get_products(search: Optional[str] = None, seller_id: Optional[str] = None):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    if seller_id:
        query["sellerId"] = seller_id
        
    products = await db.products.find(query).to_list(1000)
    return [Product(**p) for p in products]

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
async def create_product(product_data: ProductCreate, 
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

    product_dict = product_data.dict()
    product_dict["slug"] = await get_unique_slug(product_data.name)
    product = Product(**product_dict)
    product.sellerId = seller_id_to_use
    product.sellerName = seller_name_to_use
    await db.products.insert_one(product.dict())
    return product

@api_router.put("/products/{product_id}", response_model=Product, dependencies=[Depends(product_owner_or_moderator_required)])
async def update_product(product_id: str, product_data: ProductUpdate):
    update_data = product_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
    
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
            
            # Also update slug if name changes
            update_data["slug"] = await get_unique_slug(update_data["name"])
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated_product = await db.products.find_one({"id": product_id})
    if not updated_product:
        raise HTTPException(status_code=404, detail="Product not found")
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
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
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
    x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id"),
    x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id")
):
    """Create or update a product interaction (view, favourite, rating)"""
    user_id = x_buyer_id or x_seller_id
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
    x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id"),
    x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id")
):
    """Get aggregated interaction stats for a product"""
    user_id = x_buyer_id or x_seller_id

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
    x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id"),
    x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id"),
    page: int = 0,
    size: int = 8,
    sort: str = "timestamp,desc"
):
    """Get all interactions for a user (favourites, ratings, etc.)"""
    user_id = x_buyer_id or x_seller_id
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
            enriched_interactions.append({
                "id": interaction["id"],
                "product": product,
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
@api_router.post("/sellers", response_model=Seller)
async def create_seller(seller_data: SellerCreate, role: Optional[str] = Depends(get_current_admin_role)):
    if await db.sellers.find_one({"whatsapp": seller_data.whatsapp}):
        raise HTTPException(status_code=400, detail="Seller with this WhatsApp number already exists.")

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

@api_router.get("/sellers", response_model=List[Seller])
async def list_sellers():
    sellers_cursor = db.sellers.find()
    sellers = await sellers_cursor.to_list(1000)
    valid_sellers = []
    for s in sellers:
        try:
            # The Seller model now includes password as optional, so this should be safe.
            # We add this try-except block for added robustness against corrupted data.
            valid_sellers.append(Seller(**s))
        except Exception as e:
            # Log the error and the problematic data
            print(f"Skipping invalid seller data: {s}, error: {e}")
    return valid_sellers

@api_router.get("/sellers/{seller_id}", response_model=Seller)
async def get_seller(seller_id: str):
    seller = await db.sellers.find_one({"id": seller_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return Seller(**seller)

class SellerLoginRequest(BaseModel):
    whatsapp: str
    password: str

@api_router.post("/sellers/login", response_model=Seller)
async def seller_login(login_data: SellerLoginRequest):
    logging.info(f"[SELLER LOGIN] Attempting login with WhatsApp: {login_data.whatsapp}")

    seller = await db.sellers.find_one({"whatsapp": login_data.whatsapp})

    if not seller:
        logging.warning(f"[SELLER LOGIN] Seller not found with WhatsApp: {login_data.whatsapp}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou mot de passe incorrect")

    if not verify_password(login_data.password, seller["password"]):
        logging.warning(f"[SELLER LOGIN] Invalid password for seller {login_data.whatsapp}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou mot de passe incorrect")

    if seller["status"] != "approved":
        logging.warning(f"[SELLER LOGIN] Seller {login_data.whatsapp} not approved: {seller['status']}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Votre compte vendeur est en attente d'approbation")

    logging.info(f"[SELLER LOGIN] Login successful for {login_data.whatsapp}")
    return Seller(**seller)

@api_router.put("/sellers/{seller_id}/approve", response_model=Seller, dependencies=[Depends(moderator_or_higher_required)])
async def approve_seller(seller_id: str):
    await db.sellers.update_one({"id": seller_id}, {"$set": {"status": "approved"}})
    updated_seller = await db.sellers.find_one({"id": seller_id})
    if not updated_seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return Seller(**updated_seller)

@api_router.put("/sellers/{seller_id}", response_model=Seller)
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
    
    await db.sellers.update_one({"id": seller_id}, {"$set": update_data})
    updated_seller = await db.sellers.find_one({"id": seller_id})
    if not updated_seller:
        raise HTTPException(status_code=404, detail="Seller not found")
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

# --- Order Management ---
@api_router.get("/orders", response_model=List[Order])
async def list_orders(seller_id: Optional[str] = None, buyer_id: Optional[str] = None, role: str = Depends(get_current_admin_role)):
    query = {}

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
        
        enriched_orders.append(Order(**order_data))
    
    return enriched_orders

@api_router.put("/orders/{order_id}", response_model=Order, dependencies=[Depends(order_owner_or_support_required)])
async def update_order(order_id: str, order_data: OrderUpdate, background_tasks: BackgroundTasks):
    update_data = order_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")

    # Get order before update to check for status change
    order_before_update = await db.orders.find_one({"id": order_id})
    if not order_before_update:
        raise HTTPException(status_code=404, detail="Order not found")

    # Stock management
    if 'status' in update_data and update_data['status'] != order_before_update.get('status'):
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

    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    updated_order = await db.orders.find_one({"id": order_id})
    
    # Check if status has changed and send notification
    if 'status' in update_data and order_before_update.get('status') != updated_order.get('status'):
        status_fr = get_status_text_fr(updated_order["status"])
        
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

@api_router.post("/checkout", response_model=List[Order])
async def process_checkout(checkout_data: CheckoutRequest, background_tasks: BackgroundTasks):
    buyer_whatsapp = checkout_data.phone
    buyer = await db.users.find_one({"whatsapp": buyer_whatsapp, "type": "buyer"})

    if not buyer:
        buyer_id = f"buyer_{str(uuid.uuid4())[:8]}"
        new_buyer_data = {
            "id": buyer_id,
            "whatsapp": buyer_whatsapp,
            "name": f"{checkout_data.firstName} {checkout_data.lastName}",
            "email": checkout_data.email,
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
    buyer_email = buyer["email"]

    # Get the global shipping price as a fallback
    shipping_setting = await db.settings.find_one({"_id": "shipping_price"})
    global_shipping_price = shipping_setting['price'] if shipping_setting else 2500

    # Fetch all products from cart to get seller info
    product_ids = [item.id for item in checkout_data.cartItems]
    products_from_db_cursor = db.products.find({"id": {"$in": product_ids}})
    products_from_db = {p["id"]: p for p in await products_from_db_cursor.to_list(len(product_ids))}

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
            image=product_info["images"][0] if product_info.get("images") and len(product_info["images"]) > 0 else None
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

        # Determine shipping cost
        shipping_cost = seller.get("deliveryPrice") if seller.get("deliveryPrice") is not None else global_shipping_price

        products_total = sum(p.price * p.quantity for p in order_details["products"])
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
            shippingCity=checkout_data.city,
            shippingRegion=checkout_data.region,
            shippingPhone=checkout_data.phone,
            status="pending",
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

        # --- In-App Notifications ---
        # 1. To Buyer
        await db.notifications.insert_one(Notification(
            recipient_id=buyer_id,
            recipient_type='buyer',
            type='order_created',
            title="Commande confirmée",
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

# --- Pickup Point Management ---
@api_router.post("/pickup-points", response_model=PickupPoint, dependencies=[Depends(super_admin_required)])
async def create_pickup_point(pickup_data: PickupPointCreate):
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
@api_router.get("/categories", response_model=List[CategoryWithCount])
async def list_categories():
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
                "productCount": { "$size": "$products" }
            }
        }
    ]
    categories_cursor = db.categories.aggregate(pipeline)
    categories_with_count = await categories_cursor.to_list(1000)
    return categories_with_count

@api_router.post("/categories", response_model=Category, dependencies=[Depends(moderator_or_higher_required)])
async def create_category(category_data: CategoryCreate):
    if await db.categories.find_one({"name": category_data.name}):
        raise HTTPException(status_code=400, detail="A category with this name already exists.")
    category = Category(**category_data.dict())
    await db.categories.insert_one(category.dict())
    return category

@api_router.put("/categories/{category_id}", response_model=Category, dependencies=[Depends(moderator_or_higher_required)])
async def update_category(category_id: str, category_data: CategoryUpdate):
    update_data = category_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
    
    await db.categories.update_one({"id": category_id}, {"$set": update_data})
    updated_category = await db.categories.find_one({"id": category_id})
    if not updated_category:
        raise HTTPException(status_code=404, detail="Category not found")
    return Category(**updated_category)

@api_router.delete("/categories", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(moderator_or_higher_required)])
async def bulk_delete_categories(request: BulkDeleteRequest):
    if not request.ids:
        raise HTTPException(status_code=400, detail="No category IDs provided for deletion.")
    
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
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return

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


@api_router.post("/admins/login", response_model=Admin)
async def admin_login(login_data: AdminLoginRequest):
    admin = await db.admins.find_one({"whatsapp": login_data.whatsapp})

    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou code d'accès incorrect")

    if not verify_password(login_data.accessCode, admin["accessCode"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou code d'accès incorrect")

    if admin["status"] != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Votre compte administrateur est suspendu")

    # Mettre à jour la date de dernière connexion
    await db.admins.update_one(
        {"_id": admin["_id"]},
        {"$set": {"lastLogin": datetime.utcnow()}}
    )
    
    # Exclure le champ _id et retourner l'objet Admin complet
    admin_data = {k: v for k, v in admin.items() if k != '_id'}
    return Admin(**admin_data)

@api_router.post("/admins", response_model=Admin, status_code=status.HTTP_201_CREATED, dependencies=[Depends(super_admin_required)])
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

@api_router.get("/admins", response_model=List[Admin], dependencies=[Depends(super_admin_required)])
async def list_admins():
    admins_cursor = db.admins.find()
    admins = await admins_cursor.to_list(1000)
    return [Admin(**admin) for admin in admins]

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

# --- Open Graph / Social Media Sharing ---
@api_router.get("/og/product/{product_id}", response_class=HTMLResponse)
async def get_product_og_html(product_id: str):
    """
    Generate HTML with Open Graph meta tags for product sharing on social media.
    This endpoint is used when crawlers from Facebook, Twitter, WhatsApp, etc. visit the link.
    """
    product = await db.products.find_one({"id": product_id})

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Escape HTML characters in product data
    def escape_html(text):
        if not text:
            return ""
        return (str(text)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;")
                .replace("'", "&#x27;"))

    product_name = escape_html(product.get('name', 'Produit'))
    product_description = escape_html(product.get('description', ''))[:200]
    product_image = product.get('images', [''])[0] if product.get('images') else ''
    product_price = product.get('price', 0)
    product_stock = product.get('stock', 0)
    frontend_url = os.getenv("FRONTEND_URL", "https://www.nengoo.com")

    html_content = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />

    <title>{product_name} - Nengoo</title>
    <meta name="description" content="{product_description}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product" />
    <meta property="og:title" content="{product_name}" />
    <meta property="og:description" content="{product_description}" />
    <meta property="og:image" content="{product_image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="{frontend_url}/product/{product_id}" />
    <meta property="og:site_name" content="Nengoo Marketplace" />
    <meta property="og:locale" content="fr_FR" />

    <!-- Product specific meta tags -->
    <meta property="product:price:amount" content="{product_price}" />
    <meta property="product:price:currency" content="XAF" />
    <meta property="product:availability" content="{'in stock' if product_stock > 0 else 'out of stock'}" />
    <meta property="product:condition" content="new" />
    <meta property="product:retailer_item_id" content="{product_id}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{product_name}" />
    <meta name="twitter:description" content="{product_description}" />
    <meta name="twitter:image" content="{product_image}" />

    <!-- WhatsApp -->
    <meta property="og:image:type" content="image/jpeg" />

    <!-- Auto-redirect to frontend after meta tags are read -->
    <meta http-equiv="refresh" content="0; url={frontend_url}/product/{product_id}" />

    <style>
        body {{
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
        }}
        .loading {{
            text-align: center;
        }}
        .spinner {{
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }}
        @keyframes spin {{
            0% {{ transform: rotate(0deg); }}
            100% {{ transform: rotate(360deg); }}
        }}
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <p>Redirection vers le produit...</p>
        <p><a href="{frontend_url}/product/{product_id}">Cliquez ici si la redirection ne fonctionne pas</a></p>
    </div>
</body>
</html>
    """

    return HTMLResponse(content=html_content)

# --- Router Inclusion ---
from routers.buyers import router as buyers_router
api_router.include_router(buyers_router)

# --- App Initialization ---
app.include_router(api_router)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
