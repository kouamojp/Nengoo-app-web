"""Image d'aperçu des liens partagés (og_image.py, /api/og/product/…).

Lancer depuis backend/ :  python -m pytest tests/test_og_image.py
"""
import asyncio
import io
import os
import re
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import og_image  # noqa: E402
import server  # noqa: E402

BUCKET = "nengoo-bucket"
SETTINGS = {"AWS_ACCESS_KEY_ID": "k", "AWS_SECRET_ACCESS_KEY": "s", "AWS_REGION": "us-east-1", "S3_BUCKET_NAME": BUCKET}
PHOTO = f"https://{BUCKET}.s3.us-east-1.amazonaws.com/uploads/63e2-Crème Bee Venom (2).png"


def png(width=3000, height=2000, alpha=True) -> bytes:
    img = Image.new("RGBA" if alpha else "RGB", (width, height), (200, 30, 30, 0) if alpha else (200, 30, 30))
    out = io.BytesIO()
    img.save(out, "PNG")
    return out.getvalue()


class FakeS3:
    def __init__(self):
        self.objects = {"uploads/63e2-Crème Bee Venom (2).png": png()}
        self.put = {}

    def get_object(self, Bucket, Key):
        return {"Body": io.BytesIO(self.objects[Key])}

    def put_object(self, Bucket, Key, Body, ContentType, CacheControl):
        self.put[Key] = (Body, ContentType)


class FakeProducts:
    def __init__(self, product):
        self.product = product

    async def find_one(self, query):
        return self.product

    async def update_one(self, query, update):
        self.product.update(update["$set"])


class FakeDb:
    def __init__(self, product):
        self.products = FakeProducts(product)


def test_photo_choice_and_url_encoding():
    assert og_image.first_photo(["https://x/a.mp4", "https://x/b.MOV", PHOTO]) == PHOTO
    assert og_image.first_photo(["https://x/clip.mp4"]) is None
    assert og_image.encode_url(PHOTO) == (
        f"https://{BUCKET}.s3.us-east-1.amazonaws.com/uploads/63e2-Cr%C3%A8me%20Bee%20Venom%20%282%29.png")
    # Déjà encodée : inchangée
    encoded = og_image.encode_url(PHOTO)
    assert og_image.encode_url(encoded) == encoded


def test_light_jpeg_with_white_background():
    jpeg, width, height = og_image.to_og_jpeg(png())
    assert (width, height) == (800, 533)
    assert len(jpeg) < og_image.TARGET_BYTES
    with Image.open(io.BytesIO(jpeg)) as img:
        assert img.format == "JPEG"
        assert img.getpixel((10, 10)) == (255, 255, 255) or sum(img.getpixel((10, 10))) > 740
    # Petite image : pas agrandie
    assert og_image.to_og_jpeg(png(300, 200, alpha=False))[1:] == (300, 200)


def test_made_once_then_reused(monkeypatch):
    s3 = FakeS3()
    monkeypatch.setattr(og_image.variants, "s3_settings", lambda: SETTINGS)
    monkeypatch.setattr(og_image.variants, "s3_client", lambda settings: s3)
    product = {"id": "p1", "images": ["https://x/clip.mp4", PHOTO]}
    db = FakeDb(product)

    first = asyncio.run(og_image.og_image_for(db, product))
    assert re.fullmatch(rf"https://{BUCKET}\.s3\.us-east-1\.amazonaws\.com/uploads/variants/og/[0-9a-f]{{20}}\.jpg", first["url"])
    assert (first["width"], first["height"]) == (800, 533)
    assert list(s3.put.values())[0][1] == "image/jpeg"
    assert product["ogImage"]["source"] == PHOTO

    s3.put.clear()
    assert asyncio.run(og_image.og_image_for(db, product))["url"] == first["url"]
    assert s3.put == {}  # rien refait

    # Nouvelle première photo : nouvelle image d'aperçu
    s3.objects["uploads/autre.jpg"] = png(alpha=False)
    product["images"] = [f"https://{BUCKET}.s3.us-east-1.amazonaws.com/uploads/autre.jpg"]
    assert asyncio.run(og_image.og_image_for(db, product))["url"] != first["url"]


def test_failure_falls_back_to_encoded_original(monkeypatch):
    class Broken(FakeS3):
        def get_object(self, Bucket, Key):
            raise ConnectionError("S3 injoignable")

    monkeypatch.setattr(og_image.variants, "s3_settings", lambda: SETTINGS)
    monkeypatch.setattr(og_image.variants, "s3_client", lambda settings: Broken())
    product = {"id": "p1", "images": [PHOTO]}
    result = asyncio.run(og_image.og_image_for(FakeDb(product), product))
    assert result == {"url": og_image.encode_url(PHOTO)}
    assert "ogImage" not in product
    assert asyncio.run(og_image.og_image_for(FakeDb({}), {"id": "p2", "images": []})) is None


def test_preview_page(monkeypatch):
    product = {
        "id": "p1", "slug": "creme-bee-venom", "name": "Crème « Bee Venom »", "price": 15000, "promoPrice": 12000,
        "description": "<p>Crème <strong>naturelle</strong> &amp; douce.</p>", "images": [PHOTO],
        "ogImage": {"source": PHOTO, "url": "https://cdn.test/og.jpg", "width": 731, "height": 800},
    }
    monkeypatch.setattr(server, "db", FakeDb(product))
    page = asyncio.run(server.product_og_preview("creme-bee-venom")).body.decode()
    assert '<meta property="og:image" content="https://cdn.test/og.jpg">' in page
    assert '<meta property="og:image:width" content="731">' in page
    assert '<meta property="og:image:type" content="image/jpeg">' in page
    assert '<meta property="og:description" content="Crème naturelle &amp; douce.">' in page
    assert "&lt;p&gt;" not in page and "<strong>" not in page

    # Produit sans photo : logo Nengoo, dimensions connues
    product.update(images=["https://x/clip.mp4"], ogImage=None)
    page = asyncio.run(server.product_og_preview("creme-bee-venom")).body.decode()
    assert 'content="https://www.nengoo.com/icons/logo-512x512.png"' in page
    assert '<meta property="og:image:width" content="512">' in page
