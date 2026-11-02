"""
Versions réduites des photos produit (WebP) et cache navigateur.

Pour chaque photo d'origine sur S3 (uploads/<nom>.<ext>), deux versions :
- 400 px de large : listes, cartes, suggestions (champ produit `thumbnails`) ;
- 1000 px : fiche produit (champ `previews`).
Elles sont rangées sous uploads/variants/ (même règle d'accès public que les
originaux) avec un cache d'un an : leur nom change si la photo change.

Les champs `thumbnails` et `previews` sont parallèles à `images` : une case
vide veut dire « pas encore de version réduite », l'interface affiche alors
l'originale.
"""
import io
import logging
import os
from typing import Dict, List, Optional
from urllib.parse import quote, unquote

logger = logging.getLogger(__name__)

WIDTHS = {"thumbnails": 400, "previews": 1000}
CACHE_CONTROL = "public, max-age=31536000, immutable"
WEBP_QUALITY = 78


def s3_settings() -> Optional[dict]:
    keys = ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET_NAME")
    values = {k: os.environ.get(k) for k in keys}
    return values if all(values.values()) else None


def s3_client(settings: dict):
    import boto3
    return boto3.client(
        "s3",
        aws_access_key_id=settings["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=settings["AWS_SECRET_ACCESS_KEY"],
        region_name=settings["AWS_REGION"],
    )


def key_from_url(url: str, bucket: str) -> Optional[str]:
    """Clé S3 d'une photo hébergée dans notre bucket, sinon None."""
    marker = f"{bucket}.s3."
    if not url or marker not in url or ".amazonaws.com/" not in url:
        return None
    return unquote(url.split(".amazonaws.com/", 1)[1].split("?", 1)[0])


def variant_key(key: str, width: int) -> str:
    name = key.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    return f"uploads/variants/w{width}/{name}.webp"


def public_url(settings: dict, key: str) -> str:
    return f"https://{settings['S3_BUCKET_NAME']}.s3.{settings['AWS_REGION']}.amazonaws.com/{quote(key, safe='/')}"


def resize_to_webp(data: bytes, width: int) -> bytes:
    from PIL import Image, ImageOps
    with Image.open(io.BytesIO(data)) as img:
        img = ImageOps.exif_transpose(img)  # photos de téléphone tournées
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "transparency" in img.info else "RGB")
        if img.width > width:
            img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        out = io.BytesIO()
        img.save(out, "WEBP", quality=WEBP_QUALITY, method=6)
        return out.getvalue()


def make_variants(s3, settings: dict, url: str, cache_original: bool = True) -> Dict[str, str]:
    """Crée (ou retrouve) les versions réduites d'une photo. Renvoie
    {"thumbnails": url, "previews": url}, vide si la photo n'est pas chez nous."""
    bucket = settings["S3_BUCKET_NAME"]
    key = key_from_url(url, bucket)
    if not key or key.startswith("uploads/variants/"):
        return {}
    original = s3.get_object(Bucket=bucket, Key=key)
    data = original["Body"].read()
    result = {}
    for field, width in WIDTHS.items():
        target = variant_key(key, width)
        s3.put_object(Bucket=bucket, Key=target, Body=resize_to_webp(data, width),
                      ContentType="image/webp", CacheControl=CACHE_CONTROL)
        result[field] = public_url(settings, target)
    if cache_original and original.get("CacheControl") != CACHE_CONTROL:
        # Même contenu, en-tête de cache ajouté (le nom de l'original change à chaque envoi)
        s3.copy_object(Bucket=bucket, Key=key, CopySource={"Bucket": bucket, "Key": key},
                       MetadataDirective="REPLACE", CacheControl=CACHE_CONTROL,
                       ContentType=original.get("ContentType") or "image/jpeg")
    return result


def aligned_variants(images: List[str], known: Dict[str, Dict[str, str]]) -> Dict[str, List[str]]:
    """Listes `thumbnails` et `previews` alignées sur `images` ('' si absente)."""
    return {field: [known.get(url, {}).get(field, "") for url in images] for field in WIDTHS}


async def refresh_product_variants(db, product_id: str) -> None:
    """Tâche de fond après création ou modification d'un produit."""
    from starlette.concurrency import run_in_threadpool
    settings = s3_settings()
    if not settings:
        return
    try:
        import PIL  # noqa: F401
    except ImportError:
        logger.warning("Pillow absent : pas de versions réduites des photos")
        return
    product = await db.products.find_one({"id": product_id}, {"images": 1, "thumbnails": 1, "previews": 1})
    if not product:
        return
    images = [u for u in product.get("images") or []]
    old = dict(zip(product.get("images") or [], zip(product.get("thumbnails") or [], product.get("previews") or [])))
    known = {url: {"thumbnails": t, "previews": p} for url, (t, p) in old.items() if t and p}
    s3 = s3_client(settings)
    for url in images:
        if url and url not in known:
            try:
                variants = await run_in_threadpool(make_variants, s3, settings, url)
                if variants:
                    known[url] = variants
            except Exception as exc:  # photo illisible ou absente : on garde l'originale
                logger.warning("Versions réduites impossibles pour %s : %s", url, exc)
    # Le produit a pu changer pendant le traitement : on n'écrit que si les photos sont les mêmes
    await db.products.update_one({"id": product_id, "images": images}, {"$set": aligned_variants(images, known)})
