"""
Messagerie entre acheteurs et vendeurs (site et app mobile).

Un fil par couple acheteur ↔ vendeur, ouvert par l'acheteur depuis une fiche
produit ou une boutique ; le produit concerné est rappelé dans le message
(petite carte : nom, photo, prix). Le vendeur répond dans le même fil.

Sécurité :
- l'identité vient du seul jeton de session (session_auth), jamais d'un
  en-tête : seuls les deux participants lisent ou écrivent dans un fil ;
- un membre de l'équipe (modérateur et plus) ne lit un fil que s'il a été
  signalé ;
- limite de débit par expéditeur, blocage par l'un ou l'autre participant,
  signalement à l'équipe (exigé par l'App Store et Google Play).

Alertes : notification de la cloche + push à chaque message ; e-mail au
vendeur seulement quand il n'avait rien de non lu dans ce fil (pas
d'avalanche d'e-mails pendant une discussion).

Pas de temps réel (Passenger/WSGI ne gère pas les WebSockets) : les écrans
ouverts rafraîchissent le fil régulièrement, le push prévient sinon.
"""
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi_mail import MessageSchema
from pydantic import BaseModel, field_validator
from pymongo import ReturnDocument

from push import notify
from server import SITE_URL, db, fm, moderator_or_higher_required
from session_auth import require_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

MAX_LENGTH = 2000
HISTORY_LIMIT = 300
# Anti-spam : au plus RATE_LIMIT messages par expéditeur sur RATE_WINDOW
RATE_LIMIT = 30
RATE_WINDOW = timedelta(minutes=5)
# Un acheteur n'ouvre pas des dizaines de nouveaux fils d'un coup
NEW_THREADS_PER_DAY = 20

Party = Literal["buyer", "seller"]
OTHER = {"buyer": "seller", "seller": "buyer"}
LINKS = {
    "buyer": "/profile?tab=messages&thread={id}",
    "seller": "/seller/messages?thread={id}",
}
REPORT_REASONS = ("spam", "fraud", "abuse", "other")


# --- Modèles -------------------------------------------------------------------

def _clean_body(body: str) -> str:
    body = (body or "").strip()
    if not body:
        raise ValueError("Le message est vide")
    if len(body) > MAX_LENGTH:
        raise ValueError(f"Message trop long ({MAX_LENGTH} caractères au plus)")
    return body


class MessageIn(BaseModel):
    body: str
    productId: Optional[str] = None

    @field_validator("body")
    @classmethod
    def _body(cls, v):
        return _clean_body(v)


class NewThreadIn(MessageIn):
    sellerId: str


class ProductCard(BaseModel):
    id: str
    slug: Optional[str] = None
    name: str
    image: Optional[str] = None
    price: Optional[float] = None


class ChatMessage(BaseModel):
    id: str
    threadId: str
    senderType: Party
    body: str
    product: Optional[ProductCard] = None
    createdAt: datetime


class ChatThread(BaseModel):
    id: str
    buyerId: str
    sellerId: str
    # Vu par le compte qui demande : l'autre participant
    otherName: str
    otherLogo: Optional[str] = None
    lastMessageAt: Optional[datetime] = None
    lastMessagePreview: str = ""
    lastSenderType: Optional[Party] = None
    unread: int = 0
    blockedByMe: bool = False
    blockedByOther: bool = False


class ThreadWithMessages(BaseModel):
    thread: ChatThread
    messages: List[ChatMessage]


class BlockIn(BaseModel):
    blocked: bool


class ReportIn(BaseModel):
    reason: Literal["spam", "fraud", "abuse", "other"]
    details: Optional[str] = None

    @field_validator("details")
    @classmethod
    def _details(cls, v):
        v = (v or "").strip()
        return v[:1000] or None


# --- Session et fils -------------------------------------------------------------

def current_party(request: Request) -> tuple:
    """(type, id) de l'acheteur ou du vendeur connecté, d'après son jeton."""
    claims = require_session(request)
    if claims.get("typ") not in ("buyer", "seller"):
        raise HTTPException(status_code=403, detail="Messagerie réservée aux acheteurs et aux vendeurs.")
    return claims["typ"], claims["sub"]


def thread_id(buyer_id: str, seller_id: str) -> str:
    # Déterministe : un seul fil par couple, même si deux messages arrivent ensemble
    return f"chat_{buyer_id}_{seller_id}"


async def _participant_thread(tid: str, party: tuple) -> dict:
    """Fil dont le compte est participant ; 404 sinon (on ne révèle pas qu'il existe)."""
    user_type, user_id = party
    thread = await db.chat_threads.find_one({"id": tid, f"{user_type}Id": user_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")
    return thread


async def _names(buyer_id: str, seller_id: str) -> tuple:
    buyer = await db.users.find_one({"id": buyer_id, "type": "buyer"}) or {}
    seller = await db.sellers.find_one({"id": seller_id}) or {}
    return buyer, seller


def _view(thread: dict, user_type: str) -> ChatThread:
    other = OTHER[user_type]
    return ChatThread(
        id=thread["id"],
        buyerId=thread["buyerId"],
        sellerId=thread["sellerId"],
        otherName=thread.get(f"{other}Name") or ("Boutique" if other == "seller" else "Client"),
        otherLogo=thread.get("sellerLogo") if other == "seller" else None,
        lastMessageAt=thread.get("lastMessageAt"),
        lastMessagePreview=thread.get("lastMessagePreview", ""),
        lastSenderType=thread.get("lastSenderType"),
        unread=thread.get(f"{user_type}Unread", 0),
        blockedByMe=user_type in (thread.get("blockedBy") or []),
        # Fermée par l'autre participant ou par l'équipe (signalement)
        blockedByOther=other in (thread.get("blockedBy") or []) or "admin" in (thread.get("blockedBy") or []),
    )


async def _product_card(product_id: Optional[str], seller_id: str) -> Optional[dict]:
    """Carte du produit, s'il appartient bien à ce vendeur (pas de carte trompeuse)."""
    if not product_id:
        return None
    p = await db.products.find_one({"id": product_id, "sellerId": seller_id})
    if not p:
        return None
    image = next((i for i in (p.get("thumbnails") or []) if i), None) or next(
        (i for i in (p.get("images") or []) if i), None)
    return {"id": p["id"], "slug": p.get("slug"), "name": p.get("name", ""), "image": image,
            "price": p.get("promoPrice") or p.get("price")}


async def _check_rate(user_type: str, user_id: str) -> None:
    since = datetime.utcnow() - RATE_WINDOW
    sent = await db.chat_messages.count_documents(
        {"senderType": user_type, "senderId": user_id, "createdAt": {"$gte": since}})
    if sent >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Trop de messages envoyés. Patientez quelques minutes.")


# --- Alertes ---------------------------------------------------------------------

async def _send_email(message: MessageSchema, template: str):
    try:
        await fm.send_message(message, template_name=template)
    except Exception:
        logger.exception("Alerte de messagerie non envoyée (%s)", template)


async def _alert(background_tasks: BackgroundTasks, thread: dict, sender_type: str, body: str,
                 had_unread: bool) -> None:
    recipient = OTHER[sender_type]
    sender_name = thread.get(f"{sender_type}Name") or "Nengoo"
    link = LINKS[recipient].format(id=thread["id"])
    await notify(db, {
        "id": f"notif_{uuid.uuid4().hex[:8]}",
        "recipient_id": thread[f"{recipient}Id"],
        "recipient_type": recipient,
        "type": "chat_message",
        "title": f"Nouveau message de {sender_name}",
        "message": body[:140],
        "link": link,
        "read": False,
        "created_at": datetime.utcnow(),
    }, background_tasks)
    # E-mail au vendeur pour le premier message non lu seulement
    if recipient != "seller" or had_unread:
        return
    seller = await db.sellers.find_one({"id": thread["sellerId"]}) or {}
    email = (seller.get("email") or "").strip()
    if "@" not in email:
        return
    mail = MessageSchema(
        subject=f"Nouveau message de {sender_name} sur Nengoo",
        recipients=[email],
        template_body={
            "seller_name": seller.get("businessName") or seller.get("name") or "",
            "buyer_name": sender_name,
            "message_content": body if len(body) <= 600 else body[:600] + "…",
            "conversation_url": SITE_URL + link,
        },
        subtype="html",
    )
    background_tasks.add_task(_send_email, mail, "new_message_seller.html")


async def _post(thread: dict, sender_type: str, sender_id: str, payload: MessageIn,
                background_tasks: BackgroundTasks) -> ChatMessage:
    if thread.get("blockedBy"):
        raise HTTPException(status_code=403, detail="Cette conversation est bloquée.")
    await _check_rate(sender_type, sender_id)
    now = datetime.utcnow()
    message = {
        "id": f"chatmsg_{uuid.uuid4().hex[:12]}",
        "threadId": thread["id"],
        "senderType": sender_type,
        "senderId": sender_id,
        "body": payload.body,
        "product": await _product_card(payload.productId, thread["sellerId"]),
        "createdAt": now,
    }
    await db.chat_messages.insert_one(dict(message))
    counter = f"{OTHER[sender_type]}Unread"
    before = await db.chat_threads.find_one_and_update(
        {"id": thread["id"]},
        {
            "$set": {
                "lastMessageAt": now,
                "lastMessagePreview": payload.body[:140],
                "lastSenderType": sender_type,
                # Écrire vaut lecture des messages reçus
                f"{sender_type}Unread": 0,
            },
            "$inc": {counter: 1},
        },
        return_document=ReturnDocument.BEFORE,
    )
    await _alert(background_tasks, thread, sender_type, payload.body, bool((before or {}).get(counter)))
    return ChatMessage(**message)


async def _messages(tid: str) -> List[ChatMessage]:
    cursor = db.chat_messages.find({"threadId": tid}).sort("createdAt", -1).limit(HISTORY_LIMIT)
    items = await cursor.to_list(HISTORY_LIMIT)
    return [ChatMessage(**m) for m in reversed(items)]


# --- Acheteurs et vendeurs ---------------------------------------------------------

@router.get("/chat/threads", response_model=List[ChatThread])
async def my_threads(party: tuple = Depends(current_party)):
    """Conversations du compte, les plus récentes d'abord."""
    user_type, user_id = party
    cursor = db.chat_threads.find({f"{user_type}Id": user_id, "lastMessageAt": {"$ne": None}}) \
        .sort("lastMessageAt", -1).limit(200)
    return [_view(t, user_type) for t in await cursor.to_list(200)]


@router.get("/chat/unread-count")
async def my_unread(party: tuple = Depends(current_party)):
    user_type, user_id = party
    rows = await db.chat_threads.aggregate([
        {"$match": {f"{user_type}Id": user_id}},
        {"$group": {"_id": None, "n": {"$sum": f"${user_type}Unread"}}},
    ]).to_list(1)
    return {"count": rows[0]["n"] if rows else 0}


@router.post("/chat/threads", response_model=ThreadWithMessages, status_code=status.HTTP_201_CREATED)
async def start_thread(payload: NewThreadIn, background_tasks: BackgroundTasks,
                       party: tuple = Depends(current_party)):
    """Premier message d'un acheteur à une boutique (ou suite du fil existant)."""
    user_type, buyer_id = party
    if user_type != "buyer":
        raise HTTPException(status_code=403, detail="Seul un acheteur peut écrire le premier à une boutique.")
    seller = await db.sellers.find_one({"id": payload.sellerId, "status": "approved"})
    if not seller:
        raise HTTPException(status_code=404, detail="Boutique introuvable.")
    tid = thread_id(buyer_id, payload.sellerId)
    if not await db.chat_threads.find_one({"id": tid}):
        since = datetime.utcnow() - timedelta(days=1)
        opened = await db.chat_threads.count_documents({"buyerId": buyer_id, "createdAt": {"$gte": since}})
        if opened >= NEW_THREADS_PER_DAY:
            raise HTTPException(status_code=429, detail="Trop de nouvelles conversations aujourd'hui.")
    buyer, _ = await _names(buyer_id, payload.sellerId)
    thread = await db.chat_threads.find_one_and_update(
        {"id": tid},
        {
            # Noms et logo rafraîchis à chaque passage
            "$set": {
                "buyerName": buyer.get("name") or "Client",
                "sellerName": seller.get("businessName") or seller.get("name") or "Boutique",
                "sellerLogo": seller.get("logoUrl"),
            },
            "$setOnInsert": {
                "id": tid,
                "buyerId": buyer_id,
                "sellerId": payload.sellerId,
                "lastMessageAt": None,
                "lastMessagePreview": "",
                "lastSenderType": None,
                "buyerUnread": 0,
                "sellerUnread": 0,
                "blockedBy": [],
                "createdAt": datetime.utcnow(),
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    await _post(thread, "buyer", buyer_id, payload, background_tasks)
    thread = await db.chat_threads.find_one({"id": tid})
    return ThreadWithMessages(thread=_view(thread, "buyer"), messages=await _messages(tid))


@router.get("/chat/threads/{tid}", response_model=ThreadWithMessages)
async def open_thread(tid: str, party: tuple = Depends(current_party)):
    """Ouvre un fil ; les messages reçus passent en lus."""
    user_type, user_id = party
    thread = await _participant_thread(tid, party)
    if thread.get(f"{user_type}Unread"):
        await db.chat_threads.update_one({"id": tid}, {"$set": {f"{user_type}Unread": 0}})
        await db.notifications.update_many(
            {"recipient_id": user_id, "recipient_type": user_type, "type": "chat_message",
             "link": LINKS[user_type].format(id=tid), "read": False},
            {"$set": {"read": True}},
        )
        thread[f"{user_type}Unread"] = 0
    return ThreadWithMessages(thread=_view(thread, user_type), messages=await _messages(tid))


@router.post("/chat/threads/{tid}/messages", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
async def write(tid: str, payload: MessageIn, background_tasks: BackgroundTasks,
                party: tuple = Depends(current_party)):
    user_type, user_id = party
    thread = await _participant_thread(tid, party)
    return await _post(thread, user_type, user_id, payload, background_tasks)


@router.post("/chat/threads/{tid}/block", response_model=ChatThread)
async def block(tid: str, payload: BlockIn, party: tuple = Depends(current_party)):
    """Bloque (ou débloque) la conversation : plus personne n'y écrit."""
    user_type, _ = party
    await _participant_thread(tid, party)
    op = "$addToSet" if payload.blocked else "$pull"
    thread = await db.chat_threads.find_one_and_update(
        {"id": tid}, {op: {"blockedBy": user_type}}, return_document=ReturnDocument.AFTER)
    return _view(thread, user_type)


@router.post("/chat/threads/{tid}/report", status_code=status.HTTP_201_CREATED)
async def report(tid: str, payload: ReportIn, party: tuple = Depends(current_party)):
    """Signale la conversation à l'équipe, qui pourra la lire."""
    user_type, user_id = party
    thread = await _participant_thread(tid, party)
    await db.chat_reports.insert_one({
        "id": f"chatrep_{uuid.uuid4().hex[:10]}",
        "threadId": tid,
        "reporterType": user_type,
        "reporterId": user_id,
        "reportedType": OTHER[user_type],
        "reportedId": thread[f"{OTHER[user_type]}Id"],
        "reportedName": thread.get(f"{OTHER[user_type]}Name"),
        "reason": payload.reason,
        "details": payload.details,
        "status": "open",
        "createdAt": datetime.utcnow(),
    })
    return {"message": "Merci, l'équipe Nengoo va examiner cette conversation."}


# --- Équipe : signalements -----------------------------------------------------------

class ReportStatusIn(BaseModel):
    status: Literal["open", "resolved", "dismissed"]
    # True : l'équipe ferme la conversation (plus personne n'y écrit) ;
    # False : elle la rouvre ; absent : inchangée
    closeThread: Optional[bool] = None


@router.get("/admin/chat/reports", dependencies=[Depends(moderator_or_higher_required)])
async def list_reports(state: Optional[str] = Query("open", alias="status")):
    query = {"status": state} if state else {}
    rows = await db.chat_reports.find(query, {"_id": 0}).sort("createdAt", -1).to_list(200)
    # Noms des deux participants et état de la conversation, pour la liste
    threads = {t["id"]: t for t in await db.chat_threads.find(
        {"id": {"$in": list({r["threadId"] for r in rows})}}, {"_id": 0}).to_list(None)}
    for r in rows:
        t = threads.get(r["threadId"]) or {}
        r["reporterName"] = t.get(f"{r['reporterType']}Name")
        r["threadClosed"] = "admin" in (t.get("blockedBy") or [])
    return rows


@router.get("/admin/chat/reports-count", dependencies=[Depends(moderator_or_higher_required)])
async def open_reports_count():
    """Signalements à traiter (pastille du menu d'administration)."""
    return {"count": await db.chat_reports.count_documents({"status": "open"})}


@router.get("/admin/chat/reports/{report_id}", dependencies=[Depends(moderator_or_higher_required)])
async def open_report(report_id: str):
    """Le signalement et la conversation signalée (seul cas où l'équipe la lit)."""
    report_doc = await db.chat_reports.find_one({"id": report_id}, {"_id": 0})
    if not report_doc:
        raise HTTPException(status_code=404, detail="Signalement introuvable.")
    thread = await db.chat_threads.find_one({"id": report_doc["threadId"]}, {"_id": 0}) or {}
    return {
        "report": report_doc,
        "thread": {k: thread.get(k) for k in ("id", "buyerId", "sellerId", "buyerName", "sellerName", "blockedBy")},
        "messages": [m.dict() for m in await _messages(report_doc["threadId"])],
    }


@router.put("/admin/chat/reports/{report_id}", dependencies=[Depends(moderator_or_higher_required)])
async def update_report(report_id: str, payload: ReportStatusIn):
    report_doc = await db.chat_reports.find_one_and_update(
        {"id": report_id}, {"$set": {"status": payload.status, "updatedAt": datetime.utcnow()}})
    if not report_doc:
        raise HTTPException(status_code=404, detail="Signalement introuvable.")
    if payload.closeThread is not None:
        op = "$addToSet" if payload.closeThread else "$pull"
        await db.chat_threads.update_one({"id": report_doc["threadId"]}, {op: {"blockedBy": "admin"}})
    return {"status": payload.status}


async def ensure_indexes() -> None:
    await db.chat_threads.create_index("id", unique=True)
    await db.chat_threads.create_index([("buyerId", 1), ("lastMessageAt", -1)])
    await db.chat_threads.create_index([("sellerId", 1), ("lastMessageAt", -1)])
    await db.chat_messages.create_index([("threadId", 1), ("createdAt", -1)])
    await db.chat_messages.create_index([("senderType", 1), ("senderId", 1), ("createdAt", -1)])
    await db.chat_reports.create_index([("status", 1), ("createdAt", -1)])
