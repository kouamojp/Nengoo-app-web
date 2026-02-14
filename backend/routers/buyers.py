from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
import bcrypt

from server import db, hash_password, verify_password, Buyer
from firebase_admin_config import verify_firebase_token, is_firebase_initialized

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

class BuyerOAuthLoginRequest(BaseModel):
    idToken: str

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

@router.post("/oauth-login", response_model=Buyer)
async def buyer_oauth_login(oauth_data: BuyerOAuthLoginRequest):
    """
    OAuth login endpoint for buyers
    Verifies Firebase token and creates/logs in buyer account
    """
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
        name = decoded_token.get('name') or decoded_token.get('display_name') or email.split('@')[0]
        provider_id = decoded_token.get('firebase', {}).get('sign_in_provider', 'unknown')

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is required for OAuth login. Please ensure your social account has an email address."
            )

        # Check if buyer exists by OAuth UID
        buyer = await db.users.find_one({"oauth_uid": firebase_uid, "type": "buyer"})

        if buyer:
            # Update last login
            await db.users.update_one(
                {"_id": buyer["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            buyer['last_login'] = datetime.utcnow()
            return Buyer(**buyer)

        # Check if buyer exists by email (linking existing account)
        buyer = await db.users.find_one({"email": email, "type": "buyer"})

        if buyer:
            # Link OAuth to existing account
            await db.users.update_one(
                {"_id": buyer["_id"]},
                {
                    "$set": {
                        "oauth_provider": provider_id,
                        "oauth_uid": firebase_uid,
                        "last_login": datetime.utcnow()
                    }
                }
            )
            buyer['oauth_provider'] = provider_id
            buyer['oauth_uid'] = firebase_uid
            buyer['last_login'] = datetime.utcnow()
            return Buyer(**buyer)

        # Create new buyer account (auto-registration)
        new_buyer_dict = {
            'id': f"buyer_{str(uuid.uuid4())[:8]}",
            'whatsapp': '',  # Empty for OAuth users, can be filled later
            'name': name,
            'email': email,
            'password': None,  # No password for OAuth users
            'type': 'buyer',
            'status': 'active',
            'joinDate': datetime.utcnow(),
            'totalOrders': 0,
            'totalSpent': 0.0,
            'oauth_provider': provider_id,
            'oauth_uid': firebase_uid,
            'last_login': datetime.utcnow()
        }

        new_buyer = Buyer(**new_buyer_dict)
        await db.users.insert_one(new_buyer.dict())

        return new_buyer

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"OAuth authentication failed: {str(e)}"
        )