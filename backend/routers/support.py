"""
Messagerie entre l'équipe Nengoo (admins) et chaque vendeur ou acheteur.

Un seul fil par compte (comme une conversation WhatsApp avec le support) :
l'admin comme l'utilisateur peuvent l'ouvrir. Distinct des échanges
acheteur ↔ vendeur sur les produits (/messages, /conversations).

Identité : le compte vient du seul jeton de session (session_auth), jamais
d'un en-tête ; les droits admin (X-Admin-Role) sont posés par
IdentityMiddleware à partir du jeton, jamais par le client.

Alertes par e-mail, sans inonder : l'équipe est prévenue quand un compte écrit
alors que sa conversation n'avait rien en attente ; le compte, quand l'équipe
répond alors qu'il avait tout lu. Les messages suivants s'ajoutent au même fil
sans nouvel e-mail tant que personne ne l'a ouvert.
"""
import logging
import os
import re
import uuid
from datetime import datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request, status
from fastapi_mail import MessageSchema
from pydantic import BaseModel, Field, field_validator
from pymongo import ReturnDocument

from push import notify
from server import SITE_URL, db, fm, support_or_higher_required
from session_auth import require_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["support"])

MAX_LENGTH = 2000
HISTORY_LIMIT = 300  # derniers messages renvoyés pour un fil

UserType = Literal["buyer", "seller"]

TEAM_NAME = "Équipe Nengoo"
USER_LINKS = {"buyer": "/profile?tab=support", "seller": "/seller/support"}


class SupportMessageIn(BaseModel):
    body: str

    @field_validator("body")
    @classmethod
    def clean_body(cls, body):
        body = (body or "").strip()
        if not body:
            raise ValueError("Le message est vide")
        if len(body) > MAX_LENGTH:
            raise ValueError(f"Message trop long ({MAX_LENGTH} caractères au plus)")
        return body


class SupportMessage(BaseModel):
    id: str
    threadId: str
    senderType: Literal["admin", "buyer", "seller"]
    senderId: str
    senderName: str
    body: str
    createdAt: datetime


class SupportThread(BaseModel):
    id: str
    userId: str
    userType: UserType
    userName: str
    userWhatsapp: Optional[str] = None
    lastMessageAt: Optional[datetime] = None
    lastMessagePreview: str = ""
    lastSenderType: Optional[str] = None
    unreadByAdmin: int = 0
    unreadByUser: int = 0


class ThreadWithMessages(BaseModel):
    thread: SupportThread
    messages: List[SupportMessage]


# --- Comptes ----------------------------------------------------------------

async def _account(user_type: str, user_id: str) -> Optional[dict]:
    if user_type == "seller":
        return await db.sellers.find_one({"id": user_id})
    return await db.users.find_one({"id": user_id, "type": "buyer"})


def _display_name(user_type: str, account: dict) -> str:
    if user_type == "seller":
        return account.get("businessName") or account.get("name") or account["id"]
    return account.get("name") or account["id"]


def _thread_id(user_type: str, user_id: str) -> str:
    # Déterministe : un seul fil par compte, même si deux messages arrivent en même temps
    return f"sup_{user_type}_{user_id}"


async def _ensure_thread(user_type: str, user_id: str) -> dict:
    account = await _account(user_type, user_id)
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    thread_id = _thread_id(user_type, user_id)
    # Nom et numéro rafraîchis à chaque passage : l'admin voit le nom actuel
    await db.support_threads.update_one(
        {"id": thread_id},
        {
            "$set": {
                "userName": _display_name(user_type, account),
                "userWhatsapp": account.get("whatsapp"),
            },
            "$setOnInsert": {
                "id": thread_id,
                "userId": user_id,
                "userType": user_type,
                "lastMessageAt": None,
                "lastMessagePreview": "",
                "lastSenderType": None,
                "unreadByAdmin": 0,
                "unreadByUser": 0,
                "createdAt": datetime.utcnow(),
            },
        },
        upsert=True,
    )
    return await db.support_threads.find_one({"id": thread_id})


async def _messages(thread_id: str) -> List[SupportMessage]:
    cursor = db.support_messages.find({"threadId": thread_id}).sort("createdAt", -1).limit(HISTORY_LIMIT)
    items = await cursor.to_list(HISTORY_LIMIT)
    return [SupportMessage(**m) for m in reversed(items)]


# Rôles qui répondent aux messages (les modérateurs gèrent le catalogue)
ALERT_ROLES = ["super_admin", "admin", "support"]


async def team_alert_emails() -> List[str]:
    """SUPPORT_ALERT_EMAILS (séparés par des virgules) s'il est défini, sinon
    les admins actifs qui répondent aux messages."""
    configured = [e.strip() for e in os.environ.get("SUPPORT_ALERT_EMAILS", "").split(",") if e.strip()]
    if configured:
        return configured
    admins = await db.admins.find({"status": "active", "role": {"$in": ALERT_ROLES}}).to_list(50)
    return sorted({a["email"].strip() for a in admins if (a.get("email") or "").strip()})


async def _send_email(message: MessageSchema, template: str):
    # En tâche de fond : un SMTP en panne ne doit ni bloquer ni faire échouer l'envoi du message
    try:
        await fm.send_message(message, template_name=template)
    except Exception:
        logger.exception("Alerte de messagerie non envoyée (%s)", template)


async def _alert(background_tasks: BackgroundTasks, thread: dict, message: "SupportMessage"):
    excerpt = message.body if len(message.body) <= 600 else message.body[:600] + "…"
    if message.senderType == "admin":
        account = await _account(thread["userType"], thread["userId"])
        email = (account or {}).get("email")
        if not email or "@" not in email:
            return
        mail = MessageSchema(
            subject="L'équipe Nengoo vous a répondu",
            recipients=[email],
            template_body={
                "name": thread["userName"],
                "message": excerpt,
                "url": SITE_URL + USER_LINKS[thread["userType"]],
            },
            subtype="html",
        )
        background_tasks.add_task(_send_email, mail, "support_message_user.html")
    else:
        recipients = await team_alert_emails()
        if not recipients:
            return
        kind = "Vendeur" if thread["userType"] == "seller" else "Acheteur"
        mail = MessageSchema(
            subject=f"Nouveau message de {thread['userName']} ({kind.lower()})",
            recipients=recipients,
            template_body={
                "name": thread["userName"],
                "kind": kind,
                "whatsapp": thread.get("userWhatsapp") or "",
                "message": excerpt,
                "url": f"{SITE_URL}/admin/dashboard?section=support&to={thread['userType']}:{thread['userId']}",
            },
            subtype="html",
        )
        background_tasks.add_task(_send_email, mail, "support_message_team.html")


async def _post(thread: dict, sender_type: str, sender_id: str, sender_name: str, body: str,
                background_tasks: Optional[BackgroundTasks] = None) -> SupportMessage:
    now = datetime.utcnow()
    message = SupportMessage(
        id=f"supmsg_{uuid.uuid4().hex[:12]}",
        threadId=thread["id"],
        senderType=sender_type,
        senderId=sender_id,
        senderName=sender_name,
        body=body,
        createdAt=now,
    )
    await db.support_messages.insert_one(message.dict())
    from_admin = sender_type == "admin"
    counter = "unreadByUser" if from_admin else "unreadByAdmin"
    # Compteur lu avant l'incrément, de façon atomique : un seul e-mail même
    # si deux messages arrivent en même temps
    before = await db.support_threads.find_one_and_update(
        {"id": thread["id"]},
        {
            "$set": {
                "lastMessageAt": now,
                "lastMessagePreview": body[:140],
                "lastSenderType": sender_type,
            },
            "$inc": {counter: 1},
        },
        return_document=ReturnDocument.BEFORE,
    )
    if background_tasks is not None and not (before or {}).get(counter):
        await _alert(background_tasks, thread, message)
    if from_admin:
        # Cloche du site et de l'app : le compte voit qu'on lui a écrit
        await notify(db, {
            "id": f"notif_{uuid.uuid4().hex[:8]}",
            "recipient_id": thread["userId"],
            "recipient_type": thread["userType"],
            "type": "new_message",
            "title": "Nouveau message de l'équipe Nengoo",
            "message": body[:140],
            "link": USER_LINKS[thread["userType"]],
            "read": False,
            "created_at": now,
        }, background_tasks)
    return message


# --- Côté vendeur / acheteur ---------------------------------------------------

async def current_account(request: Request) -> tuple:
    """Acheteur ou vendeur de la session (jeton vérifié). Un en-tête X-Seller-Id
    ou X-Buyer-Id seul ne suffit pas : il permettait de lire la conversation
    d'un autre compte ou de recevoir ses notifications push."""
    claims = require_session(request)
    if claims.get("typ") not in ("buyer", "seller"):
        raise HTTPException(status_code=403, detail="Réservé aux comptes acheteur et vendeur")
    return claims["typ"], claims["sub"]


@router.get("/support/thread", response_model=ThreadWithMessages)
async def my_support_thread(account: tuple = Depends(current_account)):
    """Fil du compte connecté ; l'ouvrir marque les réponses de l'équipe comme lues."""
    user_type, user_id = account
    thread = await _ensure_thread(user_type, user_id)
    if thread.get("unreadByUser"):
        await db.support_threads.update_one({"id": thread["id"]}, {"$set": {"unreadByUser": 0}})
        await db.notifications.update_many(
            {"recipient_id": user_id, "recipient_type": user_type, "type": "new_message",
             "link": USER_LINKS[user_type], "read": False},
            {"$set": {"read": True}},
        )
        thread["unreadByUser"] = 0
    messages = await _messages(thread["id"])
    # Les comptes voient « Équipe Nengoo », pas le nom de l'admin qui a répondu
    for m in messages:
        if m.senderType == "admin":
            m.senderId, m.senderName = "admin", TEAM_NAME
    return ThreadWithMessages(thread=SupportThread(**thread), messages=messages)


@router.post("/support/messages", response_model=SupportMessage, status_code=status.HTTP_201_CREATED)
async def write_to_support(payload: SupportMessageIn, background_tasks: BackgroundTasks,
                           account: tuple = Depends(current_account)):
    user_type, user_id = account
    thread = await _ensure_thread(user_type, user_id)
    return await _post(thread, user_type, user_id, thread["userName"], payload.body, background_tasks)


@router.get("/support/unread-count")
async def my_support_unread(account: tuple = Depends(current_account)):
    user_type, user_id = account
    thread = await db.support_threads.find_one({"id": _thread_id(user_type, user_id)})
    return {"count": (thread or {}).get("unreadByUser", 0)}


# --- Côté administration --------------------------------------------------------

async def _admin_name(admin_id: Optional[str]) -> str:
    admin = await db.admins.find_one({"id": admin_id}) if admin_id else None
    return (admin or {}).get("name") or TEAM_NAME


@router.get("/admin/support/threads", response_model=List[SupportThread],
            dependencies=[Depends(support_or_higher_required)])
async def list_support_threads(
    user_type: Optional[UserType] = Query(None, alias="type"),
    unread: bool = False,
    q: Optional[str] = None,
):
    """Fils ayant au moins un message, les plus récents d'abord."""
    query: dict = {"lastMessageAt": {"$ne": None}}
    if user_type:
        query["userType"] = user_type
    if unread:
        query["unreadByAdmin"] = {"$gt": 0}
    if q and q.strip():
        pattern = re.escape(q.strip())
        query["$or"] = [
            {"userName": {"$regex": pattern, "$options": "i"}},
            {"userWhatsapp": {"$regex": pattern}},
        ]
    cursor = db.support_threads.find(query).sort("lastMessageAt", -1).limit(200)
    return [SupportThread(**t) for t in await cursor.to_list(200)]


@router.get("/admin/support/unread-count", dependencies=[Depends(support_or_higher_required)])
async def admin_support_unread():
    """Nombre de fils qui attendent une réponse de l'équipe."""
    return {"count": await db.support_threads.count_documents({"unreadByAdmin": {"$gt": 0}})}


@router.get("/admin/support/threads/{user_type}/{user_id}", response_model=ThreadWithMessages,
            dependencies=[Depends(support_or_higher_required)])
async def admin_open_thread(user_type: UserType, user_id: str):
    """Ouvre (ou prépare, s'il n'existe pas encore) le fil d'un compte."""
    thread = await _ensure_thread(user_type, user_id)
    if thread.get("unreadByAdmin"):
        await db.support_threads.update_one({"id": thread["id"]}, {"$set": {"unreadByAdmin": 0}})
        thread["unreadByAdmin"] = 0
    return ThreadWithMessages(thread=SupportThread(**thread), messages=await _messages(thread["id"]))


@router.post("/admin/support/threads/{user_type}/{user_id}/messages", response_model=SupportMessage,
             status_code=status.HTTP_201_CREATED, dependencies=[Depends(support_or_higher_required)])
async def admin_reply(
    user_type: UserType,
    user_id: str,
    payload: SupportMessageIn,
    background_tasks: BackgroundTasks,
    x_admin_id: Optional[str] = Header(None, alias="X-Admin-Id"),
):
    thread = await _ensure_thread(user_type, user_id)
    # Répondre vaut lecture des messages précédents
    await db.support_threads.update_one({"id": thread["id"]}, {"$set": {"unreadByAdmin": 0}})
    return await _post(thread, "admin", x_admin_id or "admin", await _admin_name(x_admin_id), payload.body,
                       background_tasks)
