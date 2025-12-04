from fastapi import FastAPI, APIRouter, HTTPException, status, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import uuid
from datetime import datetime
from enum import Enum
import bcrypt
import boto3
from botocore.exceptions import ClientError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# --- App and DB Setup ---
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- Security (Mock Authorization) ---

async def get_current_admin_role(x_admin_role: str = Header(None)) -> Optional[str]:
    return x_admin_role

async def super_admin_required(role: str = Depends(get_current_admin_role)):
    if role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required for this operation."
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

async def seller_id_or_support_required(seller_id: Optional[str] = None, role: str = Depends(get_current_admin_role)):
    if seller_id:
        return
    if role not in ["super_admin", "admin", "moderator", "support"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support, Moderator, Admin, or Super admin privileges required."
        )

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
    name: str
    description: str
    category: str
    price: float
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
    oldPrice: Optional[float] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None
    status: Optional[str] = None
    featured: Optional[bool] = None

class Seller(BaseModel):
    id: str = Field(default_factory=lambda: f"seller_{str(uuid.uuid4())[:8]}")
    whatsapp: str
    password: str  # Hashed
    name: str
    businessName: str
    email: str
    city: str
    region: str
    address: str
    categories: List[str]
    description: str
    status: str = "pending"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class SellerCreate(BaseModel):
    whatsapp: str
    password: str # Plain text
    name: str
    businessName: str
    email: str
    city: str
    region: str
    address: str
    categories: List[str]
    description: str

class OrderProduct(BaseModel):
    productId: str
    name: str
    quantity: int
    price: float

class Order(BaseModel):
    id: str
    buyerId: str
    buyerName: str
    sellerId: str
    sellerName: str
    products: List[OrderProduct]
    totalAmount: float
    currency: str = "XAF"
    status: str
    paymentStatus: str
    pickupPointId: str
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

class Coordinates(BaseModel):
    latitude: float
    longitude: float

class PickupPoint(BaseModel):
    id: str = Field(default_factory=lambda: f"pickup_{str(uuid.uuid4())[:8]}")
    name: str
    address: str
    city: str
    region: str
    coordinates: Coordinates
    managerId: str
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
    coordinates: Coordinates
    managerId: str
    managerName: str
    managerWhatsApp: str
    phone: str
    email: str
    hours: str
    description: str

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
    type: str = "buyer"
    joinDate: datetime
    status: str
    totalOrders: int = 0
    totalSpent: float = 0.0

class BuyerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None

class NewsletterSubscription(BaseModel):
    email: str
    subscribed_at: datetime = Field(default_factory=datetime.utcnow)

# --- API Endpoints ---
# ... (existing endpoints)

# --- File Upload Management (AWS S3) ---
@api_router.post("/generate-presigned-url", response_model=PresignedUrlResponse, dependencies=[Depends(super_admin_required)])
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

# --- Buyer Management ---
@api_router.get("/buyers", response_model=List[Buyer], dependencies=[Depends(super_admin_required)])
async def list_buyers():
    buyers_cursor = db.users.find({"type": "buyer"})
    buyers = await buyers_cursor.to_list(1000)
    return [Buyer(**b) for b in buyers]

@api_router.put("/buyers/{buyer_id}", response_model=Buyer, dependencies=[Depends(super_admin_required)])
async def update_buyer(buyer_id: str, buyer_data: BuyerUpdate):
    update_data = buyer_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
    
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
async def get_products():
    products = await db.products.find().to_list(1000)
    return [Product(**p) for p in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.post("/products", response_model=Product, dependencies=[Depends(super_admin_required)])
async def create_product(product_data: ProductCreate):
    product = Product(**product_data.dict())
    await db.products.insert_one(product.dict())
    return product

@api_router.put("/products/{product_id}", response_model=Product, dependencies=[Depends(moderator_or_higher_required)])
async def update_product(product_id: str, product_data: ProductUpdate):
    update_data = product_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated_product = await db.products.find_one({"id": product_id})
    if not updated_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**updated_product)

@api_router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(moderator_or_higher_required)])
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return

# --- Seller Management ---
@api_router.post("/sellers", response_model=Seller, dependencies=[Depends(super_admin_required)])
async def create_seller(seller_data: SellerCreate):
    if await db.sellers.find_one({"whatsapp": seller_data.whatsapp}):
        raise HTTPException(status_code=400, detail="Seller with this WhatsApp number already exists.")

    hashed_password = hash_password(seller_data.password)
    seller = Seller(password=hashed_password, **seller_data.dict(exclude={"password"}))

    await db.sellers.insert_one(seller.dict())
    return seller

@api_router.get("/sellers", response_model=List[Seller], dependencies=[Depends(super_admin_required)])
async def list_sellers():
    sellers_cursor = db.sellers.find()
    sellers = await sellers_cursor.to_list(1000)
    return [Seller(**s) for s in sellers]

@api_router.get("/sellers/{seller_id}", response_model=Seller)
async def get_seller(seller_id: str):
    seller = await db.sellers.find_one({"id": seller_id})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return Seller(**seller)

# --- Order Management ---
@api_router.get("/orders", response_model=List[Order])
async def list_orders(seller_id: Optional[str] = None, role: str = Depends(get_current_admin_role)):
    query = {}

    # If a seller_id is provided, fetch orders for that seller.
    # This is for the seller dashboard. A proper security check should be added.
    if seller_id:
        query["sellerId"] = seller_id
    # If a role is provided, check if it's an admin role.
    # If so, fetch all orders.
    elif role in ["super_admin", "admin", "moderator", "support"]:
        pass  # Empty query means all orders
    # Otherwise, it's an unauthorized request.
    else:
        # This part might not be strictly necessary if another mechanism prevents unauthorized access,
        # but it makes the endpoint self-contained and secure.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access orders."
        )

    orders_cursor = db.orders.find(query).sort("orderedDate", -1) # Sort by most recent
    orders = await orders_cursor.to_list(1000)
    return [Order(**o) for o in orders]

@api_router.put("/orders/{order_id}", response_model=Order, dependencies=[Depends(support_or_higher_required)])
async def update_order(order_id: str, order_data: OrderUpdate):
    update_data = order_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")

    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    updated_order = await db.orders.find_one({"id": order_id})
    if not updated_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**updated_order)

@api_router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(super_admin_required)])
async def delete_order(order_id: str):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return

@api_router.post("/checkout", response_model=List[Order])
async def process_checkout(checkout_data: CheckoutRequest):
    buyer_whatsapp = checkout_data.phone
    buyer = await db.users.find_one({"whatsapp": buyer_whatsapp, "type": "buyer"})

    if not buyer:
        buyer_id = f"buyer_{str(uuid.uuid4())[:8]}"
        new_buyer = {
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
        await db.users.insert_one(new_buyer)
        buyer = new_buyer
    
    buyer_id = buyer["id"]
    buyer_name = buyer["name"]

    # Fetch all products from cart to get seller info
    product_ids = [item.id for item in checkout_data.cartItems]
    products_from_db_cursor = db.products.find({"id": {"$in": product_ids}})
    products_from_db = {p["id"]: p for p in await products_from_db_cursor.to_list(len(product_ids))}

    # Group cart items by seller
    seller_orders = {} # {seller_id: [products]}
    for item in checkout_data.cartItems:
        product_info = products_from_db.get(item.id)
        if not product_info:
            raise HTTPException(status_code=404, detail=f"Product with id {item.id} not found in database.")
        
        seller_id = product_info["sellerId"]
        if seller_id not in seller_orders:
            seller_orders[seller_id] = {
                "sellerName": product_info["sellerName"],
                "products": []
            }
        
        seller_orders[seller_id]["products"].append(OrderProduct(
            productId=item.id,
            name=product_info["name"],
            quantity=item.quantity,
            price=product_info["price"]
        ))

    created_orders = []
    for seller_id, order_details in seller_orders.items():
        total_amount = sum(p.price * p.quantity for p in order_details["products"])
        
        new_order = Order(
            id=f"ord_{str(uuid.uuid4())[:8]}",
            buyerId=buyer_id,
            buyerName=buyer_name,
            sellerId=seller_id,
            sellerName=order_details["sellerName"],
            products=order_details["products"],
            totalAmount=total_amount,
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

    return created_orders

# --- Pickup Point Management ---
@api_router.post("/pickup-points", response_model=PickupPoint, dependencies=[Depends(super_admin_required)])
async def create_pickup_point(pickup_data: PickupPointCreate):
    pickup_point = PickupPoint(**pickup_data.dict())
    await db.pickupPoints.insert_one(pickup_point.dict())
    return pickup_point

@api_router.get("/pickup-points", response_model=List[PickupPoint], dependencies=[Depends(super_admin_required)])
async def list_pickup_points():
    pickup_points_cursor = db.pickupPoints.find()
    pickup_points = await pickup_points_cursor.to_list(1000)
    return [PickupPoint(**p) for p in pickup_points]

# --- Category Management ---
@api_router.get("/categories", response_model=List[Category])
async def list_categories():
    categories_cursor = db.categories.find()
    categories = await categories_cursor.to_list(1000)
    return [Category(**c) for c in categories]

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

@api_router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(moderator_or_higher_required)])
async def delete_category(category_id: str):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return

# --- File Upload Management (AWS S3) ---
@api_router.post("/generate-presigned-url", response_model=PresignedUrlResponse, dependencies=[Depends(super_admin_required)])
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

# --- App Initialization ---
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
