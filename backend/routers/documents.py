"""
Boutique de documents numériques (règles : documents.py, stockage :
document_storage.py, guide : docs/DOCUMENTS_NUMERIQUES.md).

Public          GET  /documents, /documents/filters, /documents/{id ou slug},
                     /documents/payment-info
Acheteur        GET  /documents/me/library
                POST /documents/{id}/unlock        (gratuit ou quota)
                GET  /documents/{id}/download      (lien signé, 5 min)
                POST /documents/{id}/payments      (référence Mobile Money)
                POST /documents/payments/{id}/cancel
Équipe          /admin/documents…, /admin/document-payments…, /admin/document-settings

Collections : documents, document_access (un accès par acheteur et document),
document_payments ; compteur `freeDocumentsUsed` sur le compte acheteur.
"""
import asyncio
import re
import uuid
from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

import documents as rules
from catalog_rules import whatsapp_digits
from document_storage import StorageUnavailable
import document_storage
from push import notify
from server import Notification, admin_or_higher_required, db, moderator_or_higher_required
from session_auth import require_session, session_claims

router = APIRouter(tags=["documents"])

PaymentStatus = Literal["pending", "approved", "rejected", "expired", "cancelled", "all"]


def _storage():
    return document_storage.storage


def _unavailable(error: Exception):
    return HTTPException(status_code=503, detail="Les documents sont momentanément indisponibles. Réessayez plus tard.")


# --- Modèles ---------------------------------------------------------------

class DocumentIn(BaseModel):
    title: str = Field(..., min_length=3, max_length=140)
    description: str = Field("", max_length=4000)
    category: str
    level: str = Field("", max_length=60)       # « Terminale C », « Licence 2 »…
    subject: str = Field("", max_length=60)     # « Mathématiques »
    year: Optional[int] = Field(None, ge=1950, le=2100)
    language: Literal["fr", "en"] = "fr"
    price: int = Field(..., ge=0, le=1_000_000)  # FCFA ; 0 = toujours gratuit
    coverImage: Optional[str] = Field(None, max_length=500)
    status: Literal["draft", "published"] = "draft"
    fileKey: Optional[str] = None               # obligatoire à la création

    @field_validator("title", "level", "subject", "description")
    @classmethod
    def _trim(cls, v):
        return v.strip()

    @field_validator("category")
    @classmethod
    def _category(cls, v):
        if v not in rules.CATEGORIES:
            raise ValueError("Catégorie inconnue.")
        return v

    @field_validator("fileKey")
    @classmethod
    def _key(cls, v):
        # Seulement un fichier envoyé par le formulaire d'envoi : jamais une
        # autre clé du bucket privé (exemplaires d'acheteurs)
        if v is not None and not re.fullmatch(re.escape(rules.ORIGINALS_PREFIX) + r"[0-9a-f-]{36}\.pdf", v):
            raise ValueError("Fichier inconnu.")
        return v

    @field_validator("coverImage")
    @classmethod
    def _cover(cls, v):
        if v and not v.startswith("https://"):
            raise ValueError("Image de couverture invalide.")
        return v or None


class UploadRequest(BaseModel):
    fileName: str = Field(..., max_length=200)
    fileSize: int = Field(..., gt=0)


class PaymentIn(BaseModel):
    operator: Literal["orange", "mtn"]
    payerPhone: str = Field(..., max_length=30)
    reference: str = Field(..., max_length=60)


class RejectIn(BaseModel):
    reason: str = Field(..., min_length=3, max_length=300)


class PaymentSettings(BaseModel):
    orangeNumber: str = Field("", max_length=30)
    orangeName: str = Field("", max_length=80)   # titulaire affiché à l'acheteur
    mtnNumber: str = Field("", max_length=30)
    mtnName: str = Field("", max_length=80)
    instructions: str = Field("", max_length=600)


# --- Utilitaires -----------------------------------------------------------

async def _buyer(request: Request) -> dict:
    claims = require_session(request)
    if claims.get("typ") != "buyer":
        raise HTTPException(status_code=403, detail="Connectez-vous avec un compte client Nengoo pour télécharger.")
    buyer = await db.users.find_one({"id": claims["sub"], "type": "buyer"})
    if not buyer or buyer.get("status", "active") != "active":
        raise HTTPException(status_code=403, detail="Compte client introuvable ou suspendu.")
    return buyer


def _admin_id(request: Request) -> str:
    claims = require_session(request)
    return claims.get("sub", "")


async def _find_document(id_or_slug: str, public: bool = True) -> dict:
    query = {"$or": [{"id": id_or_slug}, {"slug": id_or_slug}]}
    doc = await db.documents.find_one(query)
    if not doc or (public and doc.get("status") != "published"):
        raise HTTPException(status_code=404, detail="Document introuvable.")
    return doc


async def _payment_settings() -> dict:
    stored = await db.settings.find_one({"_id": "document_payment"}) or {}
    stored.pop("_id", None)
    return PaymentSettings(**stored).model_dump()


def _payment_view(p: dict) -> dict:
    p = {k: v for k, v in p.items() if k not in ("_id", "referenceLock")}
    p["operatorLabel"] = rules.OPERATORS.get(p.get("operator"), p.get("operator"))
    return p


async def _expire_stale() -> None:
    """Demandes en attente depuis trop longtemps : expirées, et leur référence
    libérée (l'acheteur peut la renvoyer)."""
    await db.document_payments.update_many(
        {"status": "pending", "expiresAt": {"$lt": datetime.utcnow()}},
        {"$set": {"status": "expired"}, "$unset": {"referenceLock": ""}},
    )


async def _grant(buyer_id: str, doc: dict, source: str, payment_id: Optional[str] = None) -> tuple:
    """(accès, créé maintenant ?) ; l'accès existant est gardé."""
    access = {
        "id": f"dacc_{uuid.uuid4().hex[:10]}",
        "buyerId": buyer_id,
        "documentId": doc["id"],
        "source": source,            # free_document | free_quota | payment | admin
        "paymentId": payment_id,
        "downloadCount": 0,
        "createdAt": datetime.utcnow(),
    }
    try:
        await db.document_access.insert_one(access)
        await db.documents.update_one({"id": doc["id"]}, {"$inc": {"licences": 1}})
        return access, True
    except DuplicateKeyError:
        return await db.document_access.find_one({"buyerId": buyer_id, "documentId": doc["id"]}), False


async def _process_file(file_key: str, title: str, doc_id: str, version: int) -> dict:
    """Vérifie le PDF envoyé et publie son aperçu."""
    storage = _storage()
    size = await storage.size(file_key)
    if size is None:
        raise HTTPException(status_code=400, detail="Fichier introuvable : renvoyez-le.")
    if size > rules.max_file_bytes():
        raise HTTPException(status_code=400, detail=f"Le fichier dépasse {rules.max_file_bytes() // (1024 * 1024)} Mo.")
    data = await storage.read(file_key)
    try:
        pages = await asyncio.to_thread(rules.inspect_pdf, data)
        preview, preview_pages = await asyncio.to_thread(rules.make_preview, data, title)
    except rules.PdfRejected as error:
        raise HTTPException(status_code=400, detail=str(error))
    preview_url = await storage.write_public(f"{rules.PREVIEWS_PREFIX}{doc_id}-v{version}.pdf", preview)
    return {"fileKey": file_key, "fileSize": size, "pages": pages,
            "previewUrl": preview_url, "previewPages": preview_pages, "fileVersion": version}


# --- Public ----------------------------------------------------------------

@router.get("/documents")
async def list_documents(
    category: Optional[str] = None,
    level: Optional[str] = None,
    subject: Optional[str] = None,
    year: Optional[int] = None,
    q: Optional[str] = Query(None, max_length=80),
    free: Optional[bool] = None,
    sort: Literal["recent", "popular", "price_asc", "price_desc"] = "recent",
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=60),
):
    query: dict = {"status": "published"}
    if category:
        query["category"] = category
    if level:
        query["level"] = level
    if subject:
        query["subject"] = subject
    if year:
        query["year"] = year
    if free is True:
        query["price"] = 0
    elif free is False:
        query["price"] = {"$gt": 0}
    if q and q.strip():
        pattern = re.compile(re.escape(q.strip()), re.IGNORECASE)
        query["$or"] = [{"title": pattern}, {"subject": pattern}, {"level": pattern}, {"description": pattern}]
    order = {
        "recent": [("createdAt", -1)],
        "popular": [("downloads", -1), ("createdAt", -1)],
        "price_asc": [("price", 1), ("createdAt", -1)],
        "price_desc": [("price", -1), ("createdAt", -1)],
    }[sort]
    total = await db.documents.count_documents(query)
    cursor = db.documents.find(query).sort(order).skip((page - 1) * limit).limit(limit)
    items = [rules.public_document(d) for d in await cursor.to_list(limit)]
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/documents/filters")
async def document_filters():
    published = {"status": "published"}
    levels = sorted(v for v in await db.documents.distinct("level", published) if v)
    subjects = sorted(v for v in await db.documents.distinct("subject", published) if v)
    years = sorted((v for v in await db.documents.distinct("year", published) if v), reverse=True)
    return {
        "categories": [{"id": k, "label": v} for k, v in rules.CATEGORIES.items()],
        "levels": levels, "subjects": subjects, "years": years,
        "freeDownloads": rules.free_downloads(),
    }


@router.get("/documents/payment-info")
async def payment_info():
    """Numéros Mobile Money de Nengoo, à afficher sur l'écran de paiement."""
    settings = await _payment_settings()
    operators = [
        {"id": op, "label": label, "number": settings[f"{op}Number"], "name": settings[f"{op}Name"]}
        for op, label in rules.OPERATORS.items() if settings[f"{op}Number"]
    ]
    return {"operators": operators, "instructions": settings["instructions"]}


@router.get("/documents/me/library")
async def my_library(request: Request):
    buyer = await _buyer(request)
    await _expire_stale()
    accesses = await db.document_access.find({"buyerId": buyer["id"]}).sort("createdAt", -1).to_list(1000)
    docs = {d["id"]: d for d in await db.documents.find(
        {"id": {"$in": [a["documentId"] for a in accesses]}}).to_list(1000)}
    items = []
    for a in accesses:
        doc = docs.get(a["documentId"])
        if doc and doc.get("status") != "deleted":
            items.append({
                "document": rules.public_document(doc),
                "source": a["source"],
                "obtainedAt": a["createdAt"],
                "downloadCount": a.get("downloadCount", 0),
                "downloadsLeft": max(0, rules.max_downloads_per_licence() - a.get("downloadCount", 0)),
            })
    payments = await db.document_payments.find({"buyerId": buyer["id"]}).sort("createdAt", -1).to_list(200)
    return {
        "quota": rules.quota(buyer.get("freeDocumentsUsed")),
        "documents": items,
        "payments": [_payment_view(p) for p in payments],
    }


@router.get("/documents/{id_or_slug}")
async def get_document(id_or_slug: str, request: Request):
    doc = await _find_document(id_or_slug)
    out = rules.public_document(doc)
    # Pour un acheteur connecté : ce qu'il peut faire avec ce document
    claims = session_claims(request)
    if claims and claims.get("typ") == "buyer":
        buyer = await db.users.find_one({"id": claims["sub"], "type": "buyer"}) or {}
        await _expire_stale()
        owned = await db.document_access.find_one({"buyerId": claims["sub"], "documentId": doc["id"]})
        pending = await db.document_payments.find_one(
            {"buyerId": claims["sub"], "documentId": doc["id"], "status": "pending"})
        q = rules.quota(buyer.get("freeDocumentsUsed"))
        if owned:
            action = "download"
        elif out["isFree"]:
            action = "unlock_free"
        elif pending:
            action = "payment_pending"
        elif q["remaining"] > 0:
            action = "unlock_quota"
        else:
            action = "pay"
        out["viewer"] = {"action": action, "quota": q,
                         "pendingPayment": _payment_view(pending) if pending else None}
    return out


# --- Acheteur --------------------------------------------------------------

@router.post("/documents/{document_id}/unlock")
async def unlock_document(document_id: str, request: Request):
    """Obtenir un document sans payer : gratuit, ou un des téléchargements
    offerts du compte. Au-delà : 402, il faut payer."""
    buyer = await _buyer(request)
    doc = await _find_document(document_id)
    existing = await db.document_access.find_one({"buyerId": buyer["id"], "documentId": doc["id"]})
    if existing:
        return {"granted": True, "source": existing["source"], "quota": rules.quota(buyer.get("freeDocumentsUsed"))}

    if not (doc.get("price") or 0) > 0:
        access, _ = await _grant(buyer["id"], doc, "free_document")
        return {"granted": True, "source": access["source"], "quota": rules.quota(buyer.get("freeDocumentsUsed"))}

    # Réserve un téléchargement offert d'un coup : deux clics simultanés
    # ne peuvent pas dépasser la limite
    limit = rules.free_downloads()
    updated = await db.users.find_one_and_update(
        {"id": buyer["id"], "type": "buyer",
         "$or": [{"freeDocumentsUsed": {"$lt": limit}}, {"freeDocumentsUsed": {"$exists": False}}]},
        {"$inc": {"freeDocumentsUsed": 1}},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=402, detail={
            "code": "payment_required",
            "message": f"Vos {limit} téléchargements gratuits sont utilisés : ce document coûte {doc['price']} FCFA.",
            "price": doc["price"],
        })
    access, created = await _grant(buyer["id"], doc, "free_quota")
    if not created:
        # Déjà obtenu entre-temps : le téléchargement offert est rendu
        updated = await db.users.find_one_and_update(
            {"id": buyer["id"], "type": "buyer"}, {"$inc": {"freeDocumentsUsed": -1}},
            return_document=ReturnDocument.AFTER)
    return {"granted": True, "source": access["source"], "quota": rules.quota(updated.get("freeDocumentsUsed"))}


@router.get("/documents/{document_id}/download")
async def download_document(document_id: str, request: Request):
    """Lien de téléchargement de l'exemplaire de l'acheteur (filigrané à son
    nom), valable quelques minutes."""
    buyer = await _buyer(request)
    doc = await db.documents.find_one({"id": document_id})
    if not doc or doc.get("status") == "deleted":
        raise HTTPException(status_code=404, detail="Document introuvable.")
    access = await db.document_access.find_one({"buyerId": buyer["id"], "documentId": doc["id"]})
    if not access:
        raise HTTPException(status_code=403, detail="Obtenez d'abord ce document.")
    if access.get("downloadCount", 0) >= rules.max_downloads_per_licence():
        raise HTTPException(status_code=429, detail="Nombre maximal de téléchargements atteint pour ce document. Contactez le support Nengoo.")

    storage = _storage()
    licensed_key = f"{rules.LICENSED_PREFIX}{doc['id']}/v{doc.get('fileVersion', 1)}/{buyer['id']}.pdf"
    try:
        if access.get("licensedKey") != licensed_key:
            original = await storage.read(doc["fileKey"])
            copy = await asyncio.to_thread(
                rules.watermark_pdf, original, buyer.get("name", ""), buyer.get("whatsapp", ""))
            await storage.write_private(licensed_key, copy)
        url = await storage.download_url(licensed_key, rules.download_filename(doc["title"]))
    except StorageUnavailable as error:
        raise _unavailable(error)
    except rules.PdfRejected:
        raise HTTPException(status_code=500, detail="Ce document ne peut pas être préparé. Contactez le support Nengoo.")

    now = datetime.utcnow()
    await db.document_access.update_one(
        {"id": access["id"]},
        {"$set": {"licensedKey": licensed_key, "lastDownloadAt": now}, "$inc": {"downloadCount": 1}})
    if not access.get("downloadCount"):
        await db.documents.update_one({"id": doc["id"]}, {"$inc": {"downloads": 1}})
    return {"url": url, "filename": rules.download_filename(doc["title"]), "expiresIn": 300,
            "downloadsLeft": max(0, rules.max_downloads_per_licence() - access.get("downloadCount", 0) - 1)}


@router.post("/documents/{document_id}/payments", status_code=201)
async def request_payment(document_id: str, data: PaymentIn, request: Request):
    """L'acheteur a payé par Mobile Money et envoie la référence de la
    transaction ; l'équipe vérifie puis valide."""
    buyer = await _buyer(request)
    doc = await _find_document(document_id)
    if not (doc.get("price") or 0) > 0:
        raise HTTPException(status_code=400, detail="Ce document est gratuit.")
    if await db.document_access.find_one({"buyerId": buyer["id"], "documentId": doc["id"]}):
        raise HTTPException(status_code=409, detail="Vous avez déjà ce document : retrouvez-le dans « Mes documents ».")
    settings = await _payment_settings()
    if not settings[f"{data.operator}Number"]:
        raise HTTPException(status_code=400, detail="Ce moyen de paiement n'est pas disponible.")
    reference = rules.normalize_reference(data.reference)
    if not reference:
        raise HTTPException(status_code=400, detail="Référence invalide : recopiez l'identifiant de la transaction reçu par SMS.")
    payer = whatsapp_digits(data.payerPhone)
    if not payer:
        raise HTTPException(status_code=400, detail="Numéro de paiement invalide.")

    await _expire_stale()
    if await db.document_payments.find_one({"buyerId": buyer["id"], "documentId": doc["id"], "status": "pending"}):
        raise HTTPException(status_code=409, detail="Un paiement pour ce document est déjà en cours de vérification.")

    now = datetime.utcnow()
    payment = {
        "id": f"dpay_{uuid.uuid4().hex[:10]}",
        "buyerId": buyer["id"],
        "buyerName": buyer.get("name", ""),
        "buyerPhone": buyer.get("whatsapp", ""),
        "documentId": doc["id"],
        "documentTitle": doc["title"],
        "amount": int(doc["price"]),
        "operator": data.operator,
        "payeeNumber": settings[f"{data.operator}Number"],
        "payerPhone": payer,
        "reference": reference,
        "referenceLock": rules.reference_lock(data.operator, reference),
        "status": "pending",
        "createdAt": now,
        "expiresAt": now + timedelta(hours=rules.payment_ttl_hours()),
    }
    try:
        await db.document_payments.insert_one(payment)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Cette référence de transaction a déjà été utilisée.")
    payment.pop("_id", None)
    return _payment_view(payment)


@router.post("/documents/payments/{payment_id}/cancel")
async def cancel_payment(payment_id: str, request: Request):
    buyer = await _buyer(request)
    payment = await db.document_payments.find_one_and_update(
        {"id": payment_id, "buyerId": buyer["id"], "status": "pending"},
        {"$set": {"status": "cancelled", "cancelledAt": datetime.utcnow()}, "$unset": {"referenceLock": ""}},
        return_document=ReturnDocument.AFTER,
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Aucune demande en attente à annuler.")
    return _payment_view(payment)


# --- Équipe : documents ----------------------------------------------------

@router.post("/admin/documents/upload", dependencies=[Depends(moderator_or_higher_required)])
async def admin_upload_form(data: UploadRequest):
    """Formulaire d'envoi direct vers le bucket privé : le fichier ne passe pas
    par le serveur."""
    if not data.fileName.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés.")
    if data.fileSize > rules.max_file_bytes():
        raise HTTPException(status_code=400, detail=f"Le fichier dépasse {rules.max_file_bytes() // (1024 * 1024)} Mo.")
    key = f"{rules.ORIGINALS_PREFIX}{uuid.uuid4()}.pdf"
    try:
        form = await _storage().upload_form(key, rules.max_file_bytes())
    except StorageUnavailable as error:
        raise _unavailable(error)
    return {"fileKey": key, "url": form["url"], "fields": form["fields"]}


@router.get("/admin/documents", dependencies=[Depends(moderator_or_higher_required)])
async def admin_list_documents(status: Optional[Literal["draft", "published", "archived"]] = None):
    query = {"status": status} if status else {"status": {"$ne": "deleted"}}
    docs = await db.documents.find(query).sort("createdAt", -1).to_list(2000)
    revenue = {r["_id"]: r["total"] async for r in db.document_payments.aggregate([
        {"$match": {"status": "approved"}},
        {"$group": {"_id": "$documentId", "total": {"$sum": "$amount"}}},
    ])}
    out = []
    for d in docs:
        item = rules.public_document(d)
        item.update(status=d["status"], licences=d.get("licences", 0), revenue=revenue.get(d["id"], 0),
                    fileVersion=d.get("fileVersion", 1))
        out.append(item)
    return out


@router.post("/admin/documents", status_code=201, dependencies=[Depends(moderator_or_higher_required)])
async def admin_create_document(data: DocumentIn, request: Request):
    if not data.fileKey:
        raise HTTPException(status_code=400, detail="Ajoutez le fichier PDF.")
    doc_id = f"doc_{uuid.uuid4().hex[:10]}"
    try:
        file_info = await _process_file(data.fileKey, data.title, doc_id, 1)
    except StorageUnavailable as error:
        raise _unavailable(error)
    now = datetime.utcnow()
    doc = {
        **data.model_dump(exclude={"fileKey"}),
        **file_info,
        "id": doc_id,
        "slug": f"{rules.slugify(data.title)}-{doc_id[4:10]}",
        "downloads": 0,
        "licences": 0,
        "createdAt": now,
        "updatedAt": now,
        "createdBy": _admin_id(request),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return {**rules.public_document(doc), "status": doc["status"]}


@router.put("/admin/documents/{document_id}", dependencies=[Depends(moderator_or_higher_required)])
async def admin_update_document(document_id: str, data: DocumentIn, request: Request):
    """Fiche modifiée ; un nouveau fichier remplace l'ancien (les acheteurs
    reçoivent la nouvelle version à leur prochain téléchargement)."""
    doc = await db.documents.find_one({"id": document_id, "status": {"$ne": "deleted"}})
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable.")
    changes = data.model_dump(exclude={"fileKey"})
    if data.fileKey and data.fileKey != doc.get("fileKey"):
        try:
            changes.update(await _process_file(data.fileKey, data.title, doc["id"], doc.get("fileVersion", 1) + 1))
        except StorageUnavailable as error:
            raise _unavailable(error)
    changes.update(updatedAt=datetime.utcnow(), updatedBy=_admin_id(request))
    updated = await db.documents.find_one_and_update(
        {"id": document_id}, {"$set": changes}, return_document=ReturnDocument.AFTER)
    return {**rules.public_document(updated), "status": updated["status"]}


@router.post("/admin/documents/{document_id}/archive", dependencies=[Depends(moderator_or_higher_required)])
async def admin_archive_document(document_id: str):
    """Retiré de la boutique ; ceux qui l'ont obtenu le gardent."""
    result = await db.documents.update_one(
        {"id": document_id, "status": {"$ne": "deleted"}},
        {"$set": {"status": "archived", "updatedAt": datetime.utcnow()}})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Document introuvable.")
    return {"archived": True}


@router.get("/admin/documents/{document_id}/file", dependencies=[Depends(moderator_or_higher_required)])
async def admin_document_file(document_id: str):
    """Lien vers l'original, pour vérification par l'équipe."""
    doc = await db.documents.find_one({"id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable.")
    try:
        url = await _storage().download_url(doc["fileKey"], rules.download_filename(doc["title"]))
    except StorageUnavailable as error:
        raise _unavailable(error)
    return {"url": url, "expiresIn": 300}


# --- Équipe : paiements ----------------------------------------------------

@router.get("/admin/document-payments", dependencies=[Depends(admin_or_higher_required)])
async def admin_list_payments(status: PaymentStatus = "pending"):
    await _expire_stale()
    query = {} if status == "all" else {"status": status}
    # Les plus anciennes d'abord quand on traite la file d'attente
    order = 1 if status == "pending" else -1
    payments = await db.document_payments.find(query).sort("createdAt", order).to_list(500)
    counts = {r["_id"]: r["n"] async for r in db.document_payments.aggregate(
        [{"$group": {"_id": "$status", "n": {"$sum": 1}}}])}
    return {"items": [_payment_view(p) for p in payments], "counts": counts}


@router.post("/admin/document-payments/{payment_id}/approve", dependencies=[Depends(admin_or_higher_required)])
async def admin_approve_payment(payment_id: str, request: Request, background_tasks: BackgroundTasks):
    """Paiement retrouvé sur le téléphone de Nengoo : le document est débloqué.
    Une demande expirée peut encore être validée (argent arrivé en retard)."""
    current = await db.document_payments.find_one({"id": payment_id})
    if not current or current["status"] not in ("pending", "expired"):
        raise HTTPException(status_code=409, detail="Cette demande a déjà été traitée.")
    try:
        payment = await db.document_payments.find_one_and_update(
            {"id": payment_id, "status": {"$in": ["pending", "expired"]}},
            {"$set": {"status": "approved", "reviewedBy": _admin_id(request), "reviewedAt": datetime.utcnow(),
                      "referenceLock": rules.reference_lock(current["operator"], current["reference"])}},
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Cette référence a déjà servi pour une autre demande.")
    if not payment:
        raise HTTPException(status_code=409, detail="Cette demande a déjà été traitée.")

    doc = await db.documents.find_one({"id": payment["documentId"]}) or {"id": payment["documentId"]}
    await _grant(payment["buyerId"], doc, "payment", payment["id"])
    await notify(db, Notification(
        recipient_id=payment["buyerId"], recipient_type="buyer", type="document_payment",
        title="Paiement confirmé",
        message=f"« {payment['documentTitle']} » est disponible dans Mes documents.",
        link="/profile?tab=documents",
    ).dict(), background_tasks)
    return _payment_view(payment)


@router.post("/admin/document-payments/{payment_id}/reject", dependencies=[Depends(admin_or_higher_required)])
async def admin_reject_payment(payment_id: str, data: RejectIn, request: Request, background_tasks: BackgroundTasks):
    payment = await db.document_payments.find_one_and_update(
        {"id": payment_id, "status": {"$in": ["pending", "expired"]}},
        {"$set": {"status": "rejected", "rejectReason": data.reason.strip(),
                  "reviewedBy": _admin_id(request), "reviewedAt": datetime.utcnow()}},
        return_document=ReturnDocument.AFTER,
    )
    if not payment:
        raise HTTPException(status_code=409, detail="Cette demande a déjà été traitée.")
    await notify(db, Notification(
        recipient_id=payment["buyerId"], recipient_type="buyer", type="document_payment",
        title="Paiement non retrouvé",
        message=f"« {payment['documentTitle']} » : {payment['rejectReason']}",
        link="/profile?tab=documents",
    ).dict(), background_tasks)
    return _payment_view(payment)


@router.get("/admin/document-settings", dependencies=[Depends(admin_or_higher_required)])
async def admin_get_settings():
    return await _payment_settings()


@router.put("/admin/document-settings", dependencies=[Depends(admin_or_higher_required)])
async def admin_save_settings(data: PaymentSettings):
    values = data.model_dump()
    for op in rules.OPERATORS:
        raw = values[f"{op}Number"].strip()
        if raw and not whatsapp_digits(raw):
            raise HTTPException(status_code=400, detail=f"Numéro {rules.OPERATORS[op]} invalide.")
        values[f"{op}Number"] = whatsapp_digits(raw) if raw else ""
        values[f"{op}Name"] = values[f"{op}Name"].strip()
    values["instructions"] = values["instructions"].strip()
    await db.settings.update_one({"_id": "document_payment"}, {"$set": values}, upsert=True)
    return values


async def ensure_indexes() -> None:
    await db.documents.create_index("id", unique=True)
    await db.documents.create_index("slug", unique=True)
    await db.documents.create_index([("status", 1), ("createdAt", -1)])
    await db.document_access.create_index([("buyerId", 1), ("documentId", 1)], unique=True)
    await db.document_payments.create_index("id", unique=True)
    # Une référence de transaction ne sert qu'une fois (champ absent une fois
    # la demande annulée ou expirée)
    await db.document_payments.create_index("referenceLock", unique=True, sparse=True)
    await db.document_payments.create_index([("status", 1), ("createdAt", 1)])
    await db.document_payments.create_index([("buyerId", 1), ("documentId", 1)])
