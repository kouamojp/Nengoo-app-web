"""
Image d'aperçu des liens partagés (Open Graph : WhatsApp, Facebook, Telegram…).

Les robots de ces services sont exigeants, et c'est pourquoi certains partages
n'affichaient pas d'image :
- WhatsApp ignore souvent une image de plus de ~300 Ko (des photos font 3 Mo) ;
- une adresse avec espaces ou accents (« …-Crème Bee Venom.png ») n'est pas
  chargée ;
- le WebP (versions réduites) et les vidéos ne servent pas d'aperçu.

Pour chaque produit, on fabrique donc une fois un JPEG de 800 px au plus,
rangé sur S3 sous un nom neutre (empreinte de la photo), et on retient son
adresse et ses dimensions dans le produit (champ `ogImage`). Il est refait si
la première photo change. En cas d'échec, l'adresse d'origine, encodée.
"""
import asyncio
import hashlib
import io
import logging
from typing import List, Optional
from urllib.parse import quote, urlsplit, urlunsplit

import image_variants as variants

logger = logging.getLogger(__name__)

MAX_SIDE = 800
TARGET_BYTES = 250 * 1024
VIDEO_EXTENSIONS = {"mp4", "mov", "webm", "m4v", "avi", "mkv", "3gp"}
GENERATE_TIMEOUT = 8  # secondes : le robot attend la page


def is_video(url: str) -> bool:
    path = urlsplit(url or "").path.lower()
    return path.rsplit(".", 1)[-1] in VIDEO_EXTENSIONS if "." in path else False


def first_photo(images: Optional[List[str]]) -> Optional[str]:
    """Première photo du produit (les vidéos sont sautées)."""
    for url in images or []:
        if url and not is_video(url):
            return url
    return None


def encode_url(url: str) -> str:
    """Adresse utilisable par un robot : espaces, accents et apostrophes encodés
    (sans ré-encoder ce qui l'est déjà)."""
    parts = urlsplit(url)
    path = quote(parts.path, safe="/%")
    query = quote(parts.query, safe="=&%")
    return urlunsplit((parts.scheme, parts.netloc, path, query, ""))


def og_key(source_key: str) -> str:
    digest = hashlib.sha1(source_key.encode("utf-8")).hexdigest()[:20]
    return f"uploads/variants/og/{digest}.jpg"


def to_og_jpeg(data: bytes) -> tuple:
    """(JPEG, largeur, hauteur) : 800 px au plus, fond blanc sous la
    transparence, qualité baissée si le fichier reste lourd."""
    from PIL import Image, ImageOps
    with Image.open(io.BytesIO(data)) as img:
        img = ImageOps.exif_transpose(img)  # photos de téléphone tournées
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        for quality in (82, 72, 62):
            out = io.BytesIO()
            img.save(out, "JPEG", quality=quality, optimize=True, progressive=True)
            if out.tell() <= TARGET_BYTES:
                break
        return out.getvalue(), img.width, img.height


def make_og_image(s3, settings: dict, url: str) -> Optional[dict]:
    """Crée le JPEG d'aperçu d'une photo de notre bucket ; None sinon."""
    bucket = settings["S3_BUCKET_NAME"]
    key = variants.key_from_url(url, bucket)
    if not key:
        return None
    data = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    jpeg, width, height = to_og_jpeg(data)
    target = og_key(key)
    s3.put_object(Bucket=bucket, Key=target, Body=jpeg, ContentType="image/jpeg",
                  CacheControl=variants.CACHE_CONTROL)
    return {"url": variants.public_url(settings, target), "width": width, "height": height}


async def og_image_for(db, product: dict) -> Optional[dict]:
    """{url, width?, height?} de l'image d'aperçu du produit, ou None (pas de
    photo). Fabriquée au premier partage, puis reprise du produit."""
    source = first_photo(product.get("images"))
    if not source:
        return None
    cached = product.get("ogImage") or {}
    if cached.get("source") == source and cached.get("url"):
        return cached
    settings = variants.s3_settings()
    if settings:
        try:
            made = await asyncio.wait_for(
                asyncio.to_thread(make_og_image, variants.s3_client(settings), settings, source),
                GENERATE_TIMEOUT,
            )
            if made:
                made["source"] = source
                await db.products.update_one({"id": product["id"]}, {"$set": {"ogImage": made}})
                return made
        except Exception as exc:  # photo illisible, S3 lent : l'originale, encodée
            logger.warning("Image d'aperçu impossible pour %s : %s", product.get("id"), exc)
    return {"url": encode_url(source)}
