"""Versions réduites des photos : conversion WebP, noms S3, alignement.

Lancer depuis backend/ :  python -m pytest tests/test_image_variants.py
"""
import io
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PIL = pytest.importorskip("PIL")
from PIL import Image  # noqa: E402

from image_variants import (CACHE_CONTROL, aligned_variants, key_from_url, make_variants,  # noqa: E402
                            resize_to_webp, variant_key)

SETTINGS = {"S3_BUCKET_NAME": "nengoo-bucket", "AWS_REGION": "us-east-1"}
URL = "https://nengoo-bucket.s3.us-east-1.amazonaws.com/uploads/abc-IMG%201.jpg"


def jpeg(width, height):
    out = io.BytesIO()
    Image.new("RGB", (width, height), (120, 40, 160)).save(out, "JPEG")
    return out.getvalue()


def test_resize_keeps_ratio_and_never_enlarges():
    small = Image.open(io.BytesIO(resize_to_webp(jpeg(2000, 1500), 400)))
    assert small.format == "WEBP" and small.size == (400, 300)
    tiny = Image.open(io.BytesIO(resize_to_webp(jpeg(300, 300), 400)))
    assert tiny.size == (300, 300)


def test_keys():
    assert key_from_url(URL, "nengoo-bucket") == "uploads/abc-IMG 1.jpg"
    assert key_from_url("https://example.com/a.jpg", "nengoo-bucket") is None
    assert variant_key("uploads/abc-IMG 1.jpg", 400) == "uploads/variants/w400/abc-IMG 1.webp"


def test_aligned_variants():
    images = ["a", "b", "c"]
    known = {"a": {"thumbnails": "ta", "previews": "pa"}, "c": {"thumbnails": "tc", "previews": "pc"}}
    assert aligned_variants(images, known) == {"thumbnails": ["ta", "", "tc"], "previews": ["pa", "", "pc"]}


class FakeS3:
    def __init__(self):
        self.objects = {"uploads/abc-IMG 1.jpg": {"Body": jpeg(1600, 1200), "ContentType": "image/jpeg"}}
        self.copies = []

    def get_object(self, Bucket, Key):
        obj = self.objects[Key]
        return {"Body": io.BytesIO(obj["Body"]), "ContentType": obj["ContentType"], "CacheControl": obj.get("CacheControl")}

    def put_object(self, Bucket, Key, Body, ContentType, CacheControl):
        self.objects[Key] = {"Body": Body, "ContentType": ContentType, "CacheControl": CacheControl}

    def copy_object(self, **kwargs):
        self.copies.append(kwargs)


def test_make_variants():
    s3 = FakeS3()
    result = make_variants(s3, SETTINGS, URL)
    assert result["thumbnails"].endswith("/uploads/variants/w400/abc-IMG%201.webp")
    assert result["previews"].endswith("/uploads/variants/w1000/abc-IMG%201.webp")
    assert Image.open(io.BytesIO(s3.objects["uploads/variants/w1000/abc-IMG 1.webp"]["Body"])).size == (1000, 750)
    # Original : même contenu, en-tête de cache ajouté
    assert s3.copies[0]["CacheControl"] == CACHE_CONTROL and s3.copies[0]["ContentType"] == "image/jpeg"
    # Photo hébergée ailleurs : rien à faire
    assert make_variants(s3, SETTINGS, "https://example.com/a.jpg") == {}
