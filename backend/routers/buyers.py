from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
import bcrypt

from server import db, hash_password, verify_password, Buyer

# I am creating a new router here.
router = APIRouter(
    prefix="/buyers",
    tags=["buyers"],
)

class BuyerCreate(BaseModel):
    whatsapp: str
    password: str # Plain text
    name: str
    email: str

class BuyerLoginRequest(BaseModel):
    whatsapp: str
    password: str

@router.post("/signup", response_model=Buyer, status_code=status.HTTP_201_CREATED)
async def create_buyer(buyer_data: BuyerCreate):
    if await db.users.find_one({"whatsapp": buyer_data.whatsapp, "type": "buyer"}):
        raise HTTPException(status_code=400, detail="Buyer with this WhatsApp number already exists.")

    hashed_password = hash_password(buyer_data.password)
    
    buyer_dict = buyer_data.dict()
    buyer_dict['password'] = hashed_password
    buyer_dict['id'] = f"buyer_{str(uuid.uuid4())[:8]}"
    buyer_dict['status'] = "active"
    buyer_dict['joinDate'] = datetime.utcnow()
    buyer_dict['type'] = "buyer"
    
    buyer_dict['totalOrders'] = 0
    buyer_dict['totalSpent'] = 0.0

    new_buyer = Buyer(**buyer_dict)

    await db.users.insert_one(new_buyer.dict())
    return new_buyer

@router.post("/login", response_model=Buyer)
async def buyer_login(login_data: BuyerLoginRequest):
    buyer = await db.users.find_one({"whatsapp": login_data.whatsapp, "type": "buyer"})

    if not buyer:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou mot de passe incorrect")

    if not buyer.get("password") or not verify_password(login_data.password, buyer["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Numéro WhatsApp ou mot de passe incorrect")

    return Buyer(**buyer)