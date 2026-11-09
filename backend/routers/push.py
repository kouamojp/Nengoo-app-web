"""
Jetons FCM des appareils (app mobile). Voir push.py pour l'envoi.
"""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from push import MAX_TOKENS_PER_ACCOUNT
from routers.support import current_account
from server import db

router = APIRouter(tags=["push"])


class PushTokenIn(BaseModel):
    token: str = Field(..., min_length=20, max_length=4096)
    platform: Literal["android", "ios", "web"] = "android"


class PushTokenOut(BaseModel):
    token: str = Field(..., min_length=1, max_length=4096)


@router.post("/push/tokens", status_code=status.HTTP_204_NO_CONTENT)
async def register_push_token(payload: PushTokenIn, account: tuple = Depends(current_account)):
    """Rattache l'appareil au compte connecté. Un téléphone passé d'un compte
    à un autre ne reçoit plus que les notifications du nouveau compte."""
    user_type, user_id = account
    now = datetime.utcnow()
    await db.push_tokens.update_one(
        {"token": payload.token},
        {"$set": {"userType": user_type, "userId": user_id, "platform": payload.platform, "updatedAt": now},
         "$setOnInsert": {"token": payload.token, "createdAt": now}},
        upsert=True,
    )
    # Au-delà de la limite, on oublie les appareils les plus anciens
    extra = await db.push_tokens.find({"userType": user_type, "userId": user_id}) \
        .sort("updatedAt", -1).skip(MAX_TOKENS_PER_ACCOUNT).to_list(100)
    if extra:
        await db.push_tokens.delete_many({"token": {"$in": [d["token"] for d in extra]}})


@router.post("/push/tokens/remove", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_push_token(payload: PushTokenOut):
    """À la déconnexion. Sans session : connaître le jeton de l'appareil suffit
    pour ne plus y recevoir de notifications."""
    await db.push_tokens.delete_many({"token": payload.token})
