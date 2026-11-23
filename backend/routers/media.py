"""
Médiathèque de l'admin et des vendeurs (comme celle de WordPress).

Chaque fichier envoyé (photos ; PDF et documents bureautiques pour l'équipe)
est rangé dans le bucket PUBLIC S3_BUCKET_NAME, dossier uploads/, et noté
dans la collection `media`. La fenêtre de choix d'images des formulaires
produit et les pages « Médiathèque » lisent cette collection.

Qui voit quoi :
  - l'équipe (support et au-dessus) voit tous les fichiers ; modérateurs et
    au-dessus peuvent les supprimer ;
  - un vendeur voit les fichiers qu'il a envoyés (`ownerId`) et les photos de
    ses produits ; il ne supprime que les siens. Il n'envoie que des images.

Envoi en trois temps, comme le reste du site :
  1. POST /media/upload-url : lien S3 signé pour ce fichier, et ticket noté
     dans `media_uploads` au nom de celui qui l'a demandé ;
  2. le navigateur envoie le fichier directement à S3 ;
  3. POST /media : le serveur vérifie le ticket puis le fichier sur S3
     (taille, type) et l'ajoute à la bibliothèque.

Les fichiers envoyés avant la médiathèque sont importés à la première
ouverture (équipe : dossier uploads/ si la clé AWS a le droit ListBucket,
sinon les photos des produits ; vendeur : les photos de ses produits), puis
à la demande avec POST /media/sync.

Attention : le bucket est public. Ne pas y mettre de documents payants ou
privés (ceux-là passent par Documents numériques, bucket privé).
"""
import asyncio
import base64
import logging
import mimetypes
import re
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Literal, Optional

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from pymongo.errors import BulkWriteError

from image_variants import key_from_url, make_variants, public_url, s3_client, s3_settings, variant_key, WIDTHS
from server import db, get_current_admin_role, get_current_seller_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["media"])

PREFIX = "uploads/"
VARIANTS_PREFIX = "uploads/variants/"
SYNC_ID = "media_sync"
MB = 1024 * 1024
TEAM_ROLES = ("super_admin", "admin", "moderator", "support")
TEAM_DELETE_ROLES = ("super_admin", "admin", "moderator")
TICKET_TTL = timedelta(hours=2)

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
DOCUMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
}
MAX_SIZE = {"image": 10 * MB, "document": 25 * MB}
# Pas de SVG ni de HTML : du script dans un fichier public.
# Extensions que `mimetypes` ne connaît pas partout (Windows notamment).
EXTRA_EXTENSIONS = {
    ".webp": "image/webp",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".csv": "text/csv",
}
IMAGES_ONLY = "Seules les images sont acceptées : JPG, PNG, WEBP ou GIF."


def kind_of(mime: str) -> Optional[str]:
    mime = (mime or "").split(";", 1)[0].strip().lower()
    if mime in IMAGE_TYPES:
        return "image"
    if mime in DOCUMENT_TYPES:
        return "document"
    return None


def guess_type(name: str) -> str:
    ext = ("." + name.rsplit(".", 1)[-1].lower()) if "." in name else ""
    return EXTRA_EXTENSIONS.get(ext) or mimetypes.guess_type(name)[0] or "application/octet-stream"


def safe_file_name(name: str) -> str:
    """Nom lisible et sans surprise pour une clé S3 (accents retirés)."""
    name = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode()
    name = name.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    stem, dot, ext = name.rpartition(".")
    if not dot:
        stem, ext = name, ""
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-", stem).strip("-_")[:80] or "fichier"
    ext = re.sub(r"[^A-Za-z0-9]+", "", ext)[:10].lower()
    return f"{stem}.{ext}" if ext else stem


_UUID_PREFIX = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-", re.I)


def display_name(key: str) -> str:
    """Nom d'origine d'un fichier `uploads/<uuid>-<nom>`."""
    return _UUID_PREFIX.sub("", key.rsplit("/", 1)[-1]) or key


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Accès S3 (remplacé par une version en mémoire dans les tests) ---

class StorageUnavailable(Exception):
    pass


class S3MediaStorage:
    def _settings(self) -> dict:
        settings = s3_settings()
        if not settings:
            raise StorageUnavailable("Stockage S3 non configuré (AWS_* et S3_BUCKET_NAME).")
        return settings

    async def _run(self, fn, *args, **kwargs):
        try:
            return await asyncio.to_thread(fn, *args, **kwargs)
        except (ClientError, BotoCoreError) as error:
            raise StorageUnavailable(str(error)) from error

    def url(self, key: str) -> str:
        return public_url(self._settings(), key)

    def key_from_url(self, url: str) -> Optional[str]:
        settings = s3_settings()
        return key_from_url(url, settings["S3_BUCKET_NAME"]) if settings else None

    async def upload_url(self, key: str, mime: str) -> str:
        import boto3
        settings = self._settings()
        client = boto3.client(
            "s3",
            aws_access_key_id=settings["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=settings["AWS_SECRET_ACCESS_KEY"],
            region_name=settings["AWS_REGION"],
            config=boto3.session.Config(signature_version="s3v4"),
        )
        return await self._run(
            client.generate_presigned_url, "put_object",
            Params={"Bucket": settings["S3_BUCKET_NAME"], "Key": key, "ContentType": mime},
            ExpiresIn=3600,
        )

    async def head(self, key: str) -> Optional[dict]:
        settings = self._settings()
        try:
            info = await asyncio.to_thread(s3_client(settings).head_object, Bucket=settings["S3_BUCKET_NAME"], Key=key)
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                return None
            raise StorageUnavailable(str(error)) from error
        return {"size": info.get("ContentLength") or 0, "mimeType": info.get("ContentType") or ""}

    async def read(self, key: str) -> dict:
        settings = self._settings()

        def run():
            obj = s3_client(settings).get_object(Bucket=settings["S3_BUCKET_NAME"], Key=key)
            return {"body": obj["Body"].read(), "mimeType": obj.get("ContentType") or ""}
        return await self._run(run)

    async def delete(self, keys: List[str]) -> None:
        settings = self._settings()
        client = s3_client(settings)
        for key in keys:
            await self._run(client.delete_object, Bucket=settings["S3_BUCKET_NAME"], Key=key)

    async def list_uploads(self) -> List[dict]:
        settings = self._settings()

        def run():
            pages = s3_client(settings).get_paginator("list_objects_v2").paginate(
                Bucket=settings["S3_BUCKET_NAME"], Prefix=PREFIX)
            return [
                {"key": o["Key"], "size": o.get("Size") or 0, "uploadedAt": o["LastModified"].isoformat()}
                for page in pages for o in page.get("Contents", [])
            ]
        return await self._run(run)

    async def make_thumbnail(self, url: str) -> str:
        settings = self._settings()
        variants = await asyncio.to_thread(make_variants, s3_client(settings), settings, url)
        return variants.get("thumbnails", "")


storage = S3MediaStorage()


def unavailable(error: Exception) -> HTTPException:
    logger.warning("Médiathèque : stockage indisponible : %s", error)
    return HTTPException(503, "Le stockage des fichiers est indisponible. Réessayez dans un instant.")


# --- Qui fait la requête ---

class Actor(BaseModel):
    """Un vendeur (sellerId) ou un membre de l'équipe (role)."""
    sellerId: Optional[str] = None
    role: Optional[str] = None


async def media_actor(seller_id: Optional[str] = Depends(get_current_seller_optional),
                      role: Optional[str] = Depends(get_current_admin_role)) -> Actor:
    if seller_id:
        return Actor(sellerId=seller_id)
    if role in TEAM_ROLES:
        return Actor(role=role)
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Connectez-vous à votre espace vendeur ou à l'administration.")


def can_delete(doc: dict, actor: Actor) -> bool:
    if actor.sellerId:
        return doc.get("ownerId") == actor.sellerId
    return actor.role in TEAM_DELETE_ROLES


async def seller_product_photos(seller_id: str) -> Dict[str, str]:
    """Photos des produits du vendeur : {adresse: vignette ou ''}."""
    photos: Dict[str, str] = {}
    async for p in db.products.find({"sellerId": seller_id}, {"_id": 0, "images": 1, "thumbnails": 1}):
        small = p.get("thumbnails") or []
        for i, url in enumerate(p.get("images") or []):
            if url:
                photos.setdefault(url, small[i] if i < len(small) and small[i] else "")
    return photos


async def visible_query(actor: Actor) -> dict:
    """Fichiers que cette personne peut voir."""
    if not actor.sellerId:
        return {}
    photos = await seller_product_photos(actor.sellerId)
    return {"$or": [{"ownerId": actor.sellerId}, {"url": {"$in": list(photos)}}]}


# --- Modèles ---

class MediaItem(BaseModel):
    id: str
    url: str
    key: str = ""
    name: str
    mimeType: str
    kind: Literal["image", "document"]
    size: int = 0
    thumbnail: str = ""
    uploadedAt: str
    usedBy: int = 0  # nombre de produits qui l'affichent (calculé à la lecture)
    canDelete: bool = False  # pour la personne qui lit la liste


class MediaPage(BaseModel):
    items: List[MediaItem]
    total: int
    page: int
    pages: int


class UploadRequest(BaseModel):
    fileName: str = Field(..., min_length=1, max_length=255)
    fileType: str = Field(..., max_length=150)
    size: int = Field(..., ge=1)


class UploadTicket(BaseModel):
    uploadUrl: str
    key: str
    publicUrl: str


class RegisterRequest(BaseModel):
    key: str = Field(..., max_length=400)
    name: str = Field("", max_length=255)


class SyncResult(BaseModel):
    added: int
    source: Literal["bucket", "products"]


def check_file(mime: str, size: int, actor: Actor) -> str:
    kind = kind_of(mime)
    if actor.sellerId and kind != "image":
        raise HTTPException(415, IMAGES_ONLY)
    if not kind:
        raise HTTPException(415, "Type de fichier non accepté. Images : JPG, PNG, WEBP, GIF. "
                                 "Documents : PDF, Word, Excel, PowerPoint, TXT, CSV.")
    if size > MAX_SIZE[kind]:
        raise HTTPException(413, f"Fichier trop lourd : {MAX_SIZE[kind] // MB} Mo maximum pour "
                                 f"{'une image' if kind == 'image' else 'un document'}.")
    return kind


async def ensure_indexes():
    await db.media.create_index("id", unique=True)
    await db.media.create_index("url", unique=True)
    await db.media.create_index([("uploadedAt", -1)])
    await db.media.create_index("ownerId", sparse=True)
    await db.media_uploads.create_index("key", unique=True)
    await db.media_uploads.create_index("expiresAt", expireAfterSeconds=0)  # tickets non utilisés


# --- Import des fichiers existants ---

def media_doc(key: str, size: int, uploaded_at: str, thumbnail: str = "", owner: Optional[str] = None) -> Optional[dict]:
    mime = guess_type(key)
    kind = kind_of(mime)
    if not kind:
        return None
    doc = {
        "id": f"med_{uuid.uuid4().hex[:12]}", "url": storage.url(key), "key": key, "name": display_name(key),
        "mimeType": mime, "kind": kind, "size": size, "uploadedAt": uploaded_at,
        "thumbnail": thumbnail if kind == "image" else "",
    }
    if owner:
        doc["ownerId"] = owner
    return doc


async def _insert_missing(docs: List[dict]) -> int:
    if not docs:
        return 0
    known = {d["url"] async for d in db.media.find({"url": {"$in": [x["url"] for x in docs]}}, {"url": 1})}
    fresh = [d for d in docs if d["url"] not in known]
    if fresh:
        try:
            await db.media.insert_many(fresh, ordered=False)
        except BulkWriteError as error:  # import lancé deux fois en même temps : doublons ignorés
            return error.details.get("nInserted", 0)
    return len(fresh)


async def sync_existing() -> SyncResult:
    """Équipe : ajoute à la bibliothèque les fichiers envoyés avant elle."""
    # Vignettes déjà calculées et vendeur de chaque photo produit
    thumbs: Dict[str, str] = {}
    owners: Dict[str, str] = {}
    product_urls: List[str] = []
    async for p in db.products.find({}, {"_id": 0, "images": 1, "thumbnails": 1, "sellerId": 1}):
        images, small = p.get("images") or [], p.get("thumbnails") or []
        for i, url in enumerate(images):
            if url:
                product_urls.append(url)
                if p.get("sellerId"):
                    owners.setdefault(url, p["sellerId"])
                if i < len(small) and small[i]:
                    thumbs[url] = small[i]

    try:
        objects = await storage.list_uploads()
        source = "bucket"
    except StorageUnavailable as error:
        # Clé AWS sans droit ListBucket : on se contente des photos des produits
        logger.info("Médiathèque : liste du bucket impossible (%s), import des photos produits", error)
        objects, source = [], "products"
        seen = set()
        for url in product_urls:
            key = storage.key_from_url(url)
            if key and key.startswith(PREFIX) and key not in seen:
                seen.add(key)
                objects.append({"key": key, "size": 0, "uploadedAt": now()})

    # Vignettes déjà présentes dans le bucket (créées pour les produits)
    variant_keys = {o["key"] for o in objects if o["key"].startswith(VARIANTS_PREFIX)}
    docs = []
    for obj in objects:
        key = obj["key"]
        if key.startswith(VARIANTS_PREFIX) or key.endswith("/"):
            continue
        url = storage.url(key)
        small = variant_key(key, WIDTHS["thumbnails"])
        thumbnail = thumbs.get(url) or (storage.url(small) if small in variant_keys else "")
        doc = media_doc(key, obj["size"], obj["uploadedAt"], thumbnail, owners.get(url))
        if doc:
            docs.append(doc)

    added = await _insert_missing(docs)
    await db.settings.update_one({"_id": SYNC_ID}, {"$set": {"at": now(), "source": source}}, upsert=True)
    return SyncResult(added=added, source=source)


async def sync_seller(seller_id: str) -> SyncResult:
    """Vendeur : ajoute à sa bibliothèque les photos de ses produits."""
    docs = []
    for url, thumbnail in (await seller_product_photos(seller_id)).items():
        key = storage.key_from_url(url)
        if key and key.startswith(PREFIX) and not key.startswith(VARIANTS_PREFIX):
            doc = media_doc(key, 0, now(), thumbnail, seller_id)
            if doc and doc["kind"] == "image":
                docs.append(doc)
    added = await _insert_missing(docs)
    await db.settings.update_one({"_id": f"{SYNC_ID}:{seller_id}"}, {"$set": {"at": now()}}, upsert=True)
    return SyncResult(added=added, source="products")


async def run_sync(actor: Actor) -> SyncResult:
    return await (sync_seller(actor.sellerId) if actor.sellerId else sync_existing())


async def usage_counts(urls: List[str]) -> Dict[str, int]:
    if not urls:
        return {}
    rows = db.products.aggregate([
        {"$match": {"images": {"$in": urls}}},
        {"$unwind": "$images"},
        {"$match": {"images": {"$in": urls}}},
        {"$group": {"_id": "$images", "n": {"$sum": 1}}},
    ])
    return {r["_id"]: r["n"] async for r in rows}


async def add_thumbnail(media_id: str, url: str):
    """Tâche de fond : vignette 400 px d'une image envoyée (réutilisée ensuite par les produits)."""
    try:
        thumbnail = await storage.make_thumbnail(url)
    except Exception as error:  # image illisible : la grille affichera l'originale
        logger.warning("Vignette impossible pour %s : %s", url, error)
        return
    if thumbnail:
        await db.media.update_one({"id": media_id}, {"$set": {"thumbnail": thumbnail}})


# --- Routes ---

@router.get("", response_model=MediaPage)
async def list_media(
    kind: Literal["all", "image", "document"] = "all",
    q: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(40, ge=1, le=100),
    actor: Actor = Depends(media_actor),
):
    marker = f"{SYNC_ID}:{actor.sellerId}" if actor.sellerId else SYNC_ID
    if not await db.settings.find_one({"_id": marker}):
        try:
            await run_sync(actor)
        except Exception as error:  # la bibliothèque reste utilisable sans l'import
            logger.warning("Médiathèque : import initial impossible : %s", error)

    query = await visible_query(actor)
    if kind != "all":
        query["kind"] = kind
    if q.strip():
        query["name"] = {"$regex": re.escape(q.strip()), "$options": "i"}
    total = await db.media.count_documents(query)
    docs = await (db.media.find(query, {"_id": 0}).sort([("uploadedAt", -1), ("id", -1)])
                  .skip((page - 1) * limit).limit(limit).to_list(limit))
    used = await usage_counts([d["url"] for d in docs])
    return MediaPage(
        items=[MediaItem(**d, usedBy=used.get(d["url"], 0), canDelete=can_delete(d, actor)) for d in docs],
        total=total, page=page, pages=max(1, -(-total // limit)),
    )


@router.post("/upload-url", response_model=UploadTicket)
async def upload_url(body: UploadRequest, actor: Actor = Depends(media_actor)):
    mime = body.fileType.strip().lower() or guess_type(body.fileName)
    check_file(mime, body.size, actor)
    key = f"{PREFIX}{uuid.uuid4()}-{safe_file_name(body.fileName)}"
    try:
        ticket = UploadTicket(uploadUrl=await storage.upload_url(key, mime), key=key, publicUrl=storage.url(key))
    except StorageUnavailable as error:
        raise unavailable(error)
    # Seul celui qui a demandé l'envoi pourra ajouter ce fichier à la bibliothèque
    await db.media_uploads.insert_one({
        "key": key, "ownerId": actor.sellerId, "expiresAt": datetime.now(timezone.utc) + TICKET_TTL,
    })
    return ticket


@router.post("", response_model=MediaItem, status_code=201)
async def register_media(body: RegisterRequest, background_tasks: BackgroundTasks,
                         actor: Actor = Depends(media_actor)):
    key = body.key.strip()
    ticket = await db.media_uploads.find_one({"key": key})
    if not ticket or ticket.get("ownerId") != actor.sellerId:
        raise HTTPException(400, "Fichier inconnu. Recommencez l'envoi.")
    try:
        info = await storage.head(key)
        if not info:
            raise HTTPException(404, "Le fichier n'est pas arrivé sur le stockage. Réessayez l'envoi.")
        mime = (info["mimeType"] or guess_type(key)).split(";", 1)[0].strip().lower()
        try:
            kind = check_file(mime, info["size"], actor)
        except HTTPException:
            await storage.delete([key])  # envoyé hors limites : on ne le garde pas
            await db.media_uploads.delete_one({"key": key})
            raise
        url = storage.url(key)
    except StorageUnavailable as error:
        raise unavailable(error)

    await db.media_uploads.delete_one({"key": key})
    doc = {
        "id": f"med_{uuid.uuid4().hex[:12]}", "url": url, "key": key,
        "name": (body.name.strip() or display_name(key))[:255], "mimeType": mime, "kind": kind,
        "size": info["size"], "thumbnail": "", "uploadedAt": now(),
    }
    if actor.sellerId:
        doc["ownerId"] = actor.sellerId
    await db.media.insert_one(dict(doc))
    if kind == "image":
        background_tasks.add_task(add_thumbnail, doc["id"], url)
    return MediaItem(**doc, canDelete=can_delete(doc, actor))


@router.post("/sync", response_model=SyncResult)
async def sync_media(actor: Actor = Depends(media_actor)):
    try:
        return await run_sync(actor)
    except StorageUnavailable as error:
        raise unavailable(error)


@router.delete("/{media_id}", status_code=204)
async def delete_media(media_id: str, actor: Actor = Depends(media_actor)):
    doc = await db.media.find_one({**await visible_query(actor), "id": media_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Fichier introuvable.")
    if not can_delete(doc, actor):
        raise HTTPException(403, "Vous ne pouvez pas supprimer ce fichier.")
    used = (await usage_counts([doc["url"]])).get(doc["url"], 0)
    if used:
        raise HTTPException(409, f"Ce fichier est la photo de {used} produit{'s' if used > 1 else ''}. "
                                 "Retirez-le d'abord de ces fiches.")
    key = doc.get("key") or ""
    if key.startswith(PREFIX) and not key.startswith(VARIANTS_PREFIX):
        keys = [key] + ([variant_key(key, w) for w in WIDTHS.values()] if doc["kind"] == "image" else [])
        try:
            await storage.delete(keys)
        except StorageUnavailable as error:
            raise unavailable(error)
    await db.media.delete_one({"id": media_id})


async def image_data_url(url: str) -> str:
    """Photo de notre bucket en data URL (rédaction de fiche par l'IA). Jamais une
    adresse quelconque : le serveur ne va pas chercher d'image ailleurs."""
    key = storage.key_from_url(url or "")
    if not key or not key.startswith(PREFIX) or key.startswith(VARIANTS_PREFIX) or kind_of(guess_type(key)) != "image":
        raise ValueError("photo inconnue")
    # Version réduite de 1000 px si elle existe : plus légère que l'originale
    data = None
    for candidate in (variant_key(key, WIDTHS["previews"]), key):
        try:
            data = await storage.read(candidate)
            break
        except (StorageUnavailable, KeyError):
            continue
    if data is None:
        raise ValueError("photo illisible")
    if len(data["body"]) > MAX_SIZE["image"]:
        raise ValueError("photo trop lourde")
    mime = (data["mimeType"] or guess_type(key)).split(";", 1)[0].strip()
    return f"data:{mime};base64,{base64.b64encode(data['body']).decode()}"
