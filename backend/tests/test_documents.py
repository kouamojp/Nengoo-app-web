"""Boutique de documents numériques (documents.py, routers/documents.py).

Lancer depuis backend/ :  python -m pytest tests/test_documents.py
"""
import asyncio
import io
import os
import sys
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi import BackgroundTasks, HTTPException
from pydantic import ValidationError
from pypdf import PdfReader, PdfWriter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import documents as rules  # noqa: E402
import document_storage  # noqa: E402
import server  # noqa: E402
from routers import documents as api  # noqa: E402
from session_auth import SessionRequired  # noqa: E402
from session_helpers import fake_request, session  # noqa: E402


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


needs_db = pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")


def make_pdf(pages=6, password=None) -> bytes:
    writer = PdfWriter()
    for i in range(pages):
        writer.add_blank_page(842, 595) if i == 1 else writer.add_blank_page(595, 842)
    writer.pages[-1].rotate(90)
    if password:
        writer.encrypt(password)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def page_texts(data: bytes):
    return [p.extract_text() for p in PdfReader(io.BytesIO(data)).pages]


class MemoryStorage:
    def __init__(self):
        self.private, self.public = {}, {}

    async def upload_form(self, key, max_bytes, expires=3600):
        return {"url": "https://s3.test/private", "fields": {"key": key}}

    async def size(self, key):
        return len(self.private[key]) if key in self.private else None

    async def read(self, key):
        return self.private[key]

    async def write_private(self, key, data):
        self.private[key] = data

    async def delete_private(self, key):
        self.private.pop(key, None)

    async def write_public(self, key, data):
        self.public[key] = data
        return f"https://public.test/{key}"

    async def download_url(self, key, filename, expires=300):
        assert key in self.private
        return f"https://signed.test/{key}?name={filename}"


# --- Règles et PDF ---------------------------------------------------------

def test_reference_quota_and_slug(monkeypatch):
    assert rules.normalize_reference(" pp 2611.1234.A5678 ") == "PP2611.1234.A5678"
    assert rules.normalize_reference("ID: MP261116.1530.B12345") == "MP261116.1530.B12345"
    for bad in ("", "abc", "<script>", "x" * 50):
        assert rules.normalize_reference(bad) is None
    monkeypatch.setenv("DOCUMENT_FREE_DOWNLOADS", "10")
    assert rules.quota(None) == {"limit": 10, "used": 0, "remaining": 10}
    assert rules.quota(12) == {"limit": 10, "used": 10, "remaining": 0}
    assert rules.slugify("Épreuve de Maths – BAC C 2024 !") == "epreuve-de-maths-bac-c-2024"
    assert rules.download_filename("") == "document.pdf"
    assert [rules.preview_page_count(n) for n in (1, 2, 5, 40)] == [1, 1, 2, 3]


def test_pdf_checks():
    assert rules.inspect_pdf(make_pdf(4)) == 4
    for data, message in ((b"PK\x03\x04 zip", "pas un PDF"),
                          (b"%PDF-1.7 garbage", "illisible"),
                          (make_pdf(2, password="secret"), "mot de passe")):
        with pytest.raises(rules.PdfRejected) as err:
            rules.inspect_pdf(data)
        assert message in str(err.value)


def test_preview_and_watermark():
    original = make_pdf(6)
    preview, count = rules.make_preview(original, "Maths Tle C")
    assert count == 3 and len(PdfReader(io.BytesIO(preview)).pages) == 3
    assert all("document complet sur nengoo.com" in t for t in page_texts(preview))

    copy = rules.watermark_pdf(original, "Awa  Ndiaye", "+237 699 00 11 22", datetime(2026, 11, 16))
    texts = page_texts(copy)
    assert len(texts) == 6
    # Sur chaque page, y compris celles en paysage ou pivotées
    assert all("Exemplaire personnel de Awa Ndiaye (237699001122)" in t and "16/11/2026" in t for t in texts)
    assert PdfReader(io.BytesIO(copy)).pages[-1].get("/Rotate", 0) == 0


def test_document_input_validation():
    base = {"title": "Cours de physique", "category": "cours", "price": 500}
    assert api.DocumentIn(**base, fileKey=f"{rules.ORIGINALS_PREFIX}{uuid.uuid4()}.pdf").fileKey
    for bad in ({"category": "films"}, {"price": -1}, {"title": "ab"},
                {"fileKey": f"{rules.LICENSED_PREFIX}doc_x/v1/buyer_y.pdf"},
                {"fileKey": "../secret.pdf"}, {"coverImage": "javascript:alert(1)"}):
        with pytest.raises(ValidationError):
            api.DocumentIn(**{**base, **bad})


def test_storage_refuses_shared_bucket(monkeypatch):
    for name, value in {"AWS_ACCESS_KEY_ID": "k", "AWS_SECRET_ACCESS_KEY": "s", "AWS_REGION": "eu-west-3",
                        "S3_BUCKET_NAME": "nengoo-public"}.items():
        monkeypatch.setenv(name, value)
    monkeypatch.delenv("DOCUMENTS_S3_BUCKET", raising=False)
    storage = document_storage.S3DocumentStorage()
    with pytest.raises(document_storage.StorageUnavailable):
        asyncio.run(storage.download_url("private-documents/x.pdf", "x.pdf"))
    monkeypatch.setenv("DOCUMENTS_S3_BUCKET", "nengoo-public")
    with pytest.raises(document_storage.StorageUnavailable):
        asyncio.run(storage.download_url("private-documents/x.pdf", "x.pdf"))


# --- Parcours complet ------------------------------------------------------

@needs_db
def test_free_quota_payment_and_download(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"
    monkeypatch.setenv("DOCUMENT_FREE_DOWNLOADS", "2")
    monkeypatch.setenv("DOCUMENT_MAX_DOWNLOADS_PER_BUYER", "3")
    storage = MemoryStorage()
    monkeypatch.setattr(document_storage, "storage", storage)
    sent = []

    async def fake_notify(db, notification, background_tasks=None):
        sent.append(notification)
    monkeypatch.setattr(api, "notify", fake_notify)

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(server, "db", db)
        monkeypatch.setattr(api, "db", db)
        try:
            await api.ensure_indexes()
            await db.users.insert_many([
                {"id": "b1", "type": "buyer", "name": "Awa Ndiaye", "whatsapp": "237699001122", "status": "active"},
                {"id": "b2", "type": "buyer", "name": "Paul", "whatsapp": "237677000000", "status": "active"},
            ])
            admin = session("admin", "a1", "admin")
            awa, paul = session("buyer", "b1"), session("buyer", "b2")

            # L'équipe envoie trois PDF payants et un gratuit
            async def upload(title, price, status="published"):
                form = await api.admin_upload_form(api.UploadRequest(fileName="cours.PDF", fileSize=1000))
                storage.private[form["fileKey"]] = make_pdf(6)
                return await api.admin_create_document(api.DocumentIn(
                    title=title, category="examens", level="Terminale C", subject="Mathématiques",
                    year=2024, price=price, status=status, fileKey=form["fileKey"]), admin)

            with pytest.raises(HTTPException) as err:
                await api.admin_upload_form(api.UploadRequest(fileName="cours.docx", fileSize=10))
            assert err.value.status_code == 400
            d1 = await upload("BAC C 2024 Maths", 500)
            d2 = await upload("BAC C 2023 Maths", 500)
            d3 = await upload("BAC C 2022 Maths", 700)
            free = await upload("Formulaire de trigonométrie", 0)
            draft = await upload("Brouillon", 300, status="draft")
            assert d1["pages"] == 6 and d1["previewPages"] == 3 and d1["previewUrl"].startswith("https://public.test/")
            assert "fileKey" not in d1 and d1["slug"].startswith("bac-c-2024-maths-")

            # Catalogue public : brouillons cachés, clés de stockage jamais visibles
            listing = await api.list_documents(category="examens", level=None, subject=None, year=None,
                                               q="2024", free=None, sort="recent", page=1, limit=24)
            assert [d["id"] for d in listing["items"]] == [d1["id"]]
            with pytest.raises(HTTPException):
                await api.get_document(draft["id"], fake_request())
            assert (await api.document_filters())["levels"] == ["Terminale C"]
            assert "viewer" not in await api.get_document(d1["slug"], fake_request())

            # Compte obligatoire, et compte client seulement
            with pytest.raises(SessionRequired):
                await api.unlock_document(d1["id"], fake_request())
            with pytest.raises(HTTPException) as err:
                await api.unlock_document(d1["id"], session("seller", "s1"))
            assert err.value.status_code == 403

            # Gratuit : ne consomme pas le quota
            assert (await api.get_document(free["id"], awa))["viewer"]["action"] == "unlock_free"
            assert (await api.unlock_document(free["id"], awa))["quota"]["remaining"] == 2
            # Quota : 2 documents offerts ; le même document ne compte qu'une fois
            assert (await api.get_document(d1["id"], awa))["viewer"]["action"] == "unlock_quota"
            assert (await api.unlock_document(d1["id"], awa))["quota"]["remaining"] == 1
            assert (await api.unlock_document(d1["id"], awa))["quota"]["remaining"] == 1
            # Deux clics simultanés sur deux documents différents : un seul passe
            results = await asyncio.gather(api.unlock_document(d2["id"], awa), api.unlock_document(d3["id"], awa),
                                           return_exceptions=True)
            assert sum(isinstance(r, HTTPException) and r.status_code == 402 for r in results) == 1
            locked = d3 if isinstance(results[1], HTTPException) else d2
            assert (await db.users.find_one({"id": "b1"}))["freeDocumentsUsed"] == 2
            assert (await api.get_document(locked["id"], awa))["viewer"]["action"] == "pay"

            # Téléchargement : exemplaire filigrané au nom de l'acheteur, lien signé
            with pytest.raises(HTTPException) as err:
                await api.download_document(locked["id"], awa)
            assert err.value.status_code == 403
            link = await api.download_document(d1["id"], awa)
            assert link["url"].startswith("https://signed.test/private-documents/licensed/") and link["downloadsLeft"] == 2
            copy_key = next(k for k in storage.private if k.startswith(rules.LICENSED_PREFIX))
            assert all("Awa Ndiaye (237699001122)" in t for t in page_texts(storage.private[copy_key]))
            await api.download_document(d1["id"], awa)
            await api.download_document(d1["id"], awa)
            with pytest.raises(HTTPException) as err:
                await api.download_document(d1["id"], awa)
            assert err.value.status_code == 429
            assert (await db.documents.find_one({"id": d1["id"]}))["downloads"] == 1

            # Paiement : numéros configurés par l'équipe
            with pytest.raises(HTTPException) as err:
                await api.admin_save_settings(api.PaymentSettings(orangeNumber="12"))
            assert err.value.status_code == 400
            await api.admin_save_settings(api.PaymentSettings(
                orangeNumber="699 11 22 33", orangeName="NENGOO SARL", instructions="Payez puis saisissez la référence."))
            info = await api.payment_info()
            assert info["operators"] == [{"id": "orange", "label": "Orange Money", "number": "237699112233", "name": "NENGOO SARL"}]

            pay = api.PaymentIn(operator="orange", payerPhone="699001122", reference="PP261116.1530.A1")
            with pytest.raises(HTTPException) as err:  # MTN non configuré
                await api.request_payment(locked["id"], api.PaymentIn(operator="mtn", payerPhone="677000000", reference="MP123456"), awa)
            assert err.value.status_code == 400
            with pytest.raises(HTTPException) as err:  # déjà obtenu
                await api.request_payment(d1["id"], pay, awa)
            assert err.value.status_code == 409
            request = await api.request_payment(locked["id"], pay, awa)
            assert request["status"] == "pending" and request["amount"] == locked["price"]
            assert request["payeeNumber"] == "237699112233" and "referenceLock" not in request
            assert (await api.get_document(locked["id"], awa))["viewer"]["action"] == "payment_pending"
            with pytest.raises(HTTPException) as err:  # une seule demande à la fois
                await api.request_payment(locked["id"], api.PaymentIn(operator="orange", payerPhone="699001122", reference="PP999999"), awa)
            assert err.value.status_code == 409
            # Une même référence ne sert qu'une fois, même pour un autre client
            with pytest.raises(HTTPException) as err:
                await api.request_payment(locked["id"], api.PaymentIn(operator="orange", payerPhone="677000000", reference="pp261116.1530.a1"), paul)
            assert err.value.status_code == 409

            # L'équipe valide : document débloqué, client prévenu
            queue = await api.admin_list_payments(status="pending")
            assert [p["id"] for p in queue["items"]] == [request["id"]] and queue["counts"] == {"pending": 1}
            approved = await api.admin_approve_payment(request["id"], admin, BackgroundTasks())
            assert approved["status"] == "approved" and approved["reviewedBy"] == "a1"
            with pytest.raises(HTTPException) as err:
                await api.admin_approve_payment(request["id"], admin, BackgroundTasks())
            assert err.value.status_code == 409
            assert sent[-1]["recipient_id"] == "b1" and sent[-1]["title"] == "Paiement confirmé"
            assert (await api.get_document(locked["id"], awa))["viewer"]["action"] == "download"
            access = await db.document_access.find_one({"buyerId": "b1", "documentId": locked["id"]})
            assert access["source"] == "payment" and access["paymentId"] == request["id"]

            # Demande expirée : référence libérée, annulation, refus
            paid_by_paul = await api.request_payment(d3["id"], api.PaymentIn(operator="orange", payerPhone="677000000", reference="PP000111"), paul)
            await db.document_payments.update_one({"id": paid_by_paul["id"]},
                                                  {"$set": {"expiresAt": datetime.utcnow() - timedelta(minutes=1)}})
            again = await api.request_payment(d3["id"], api.PaymentIn(operator="orange", payerPhone="677000000", reference="PP000111"), paul)
            assert (await db.document_payments.find_one({"id": paid_by_paul["id"]}))["status"] == "expired"
            assert (await api.cancel_payment(again["id"], paul))["status"] == "cancelled"
            with pytest.raises(HTTPException):
                await api.cancel_payment(again["id"], awa)
            third = await api.request_payment(d3["id"], api.PaymentIn(operator="orange", payerPhone="677000000", reference="PP000111"), paul)
            rejected = await api.admin_reject_payment(third["id"], api.RejectIn(reason="Paiement introuvable"), admin, BackgroundTasks())
            assert rejected["status"] == "rejected" and sent[-1]["recipient_id"] == "b2"
            with pytest.raises(HTTPException) as err:  # une référence refusée ne resert pas
                await api.request_payment(d3["id"], api.PaymentIn(operator="orange", payerPhone="677000000", reference="PP000111"), paul)
            assert err.value.status_code == 409

            # Bibliothèque de l'acheteur
            library = await api.my_library(awa)
            assert library["quota"] == {"limit": 2, "used": 2, "remaining": 0}
            # Gratuit, 2 offerts, 1 payé
            assert {i["document"]["id"] for i in library["documents"]} == {free["id"], d1["id"], d2["id"], d3["id"]}
            assert len(library["payments"]) == 1

            # Nouveau fichier : nouvelle version pour les acheteurs ; archivé, il reste téléchargeable
            form = await api.admin_upload_form(api.UploadRequest(fileName="v2.pdf", fileSize=1000))
            storage.private[form["fileKey"]] = make_pdf(4)
            updated = await api.admin_update_document(free["id"], api.DocumentIn(
                title="Formulaire de trigonométrie", category="cours", price=0, status="published",
                fileKey=form["fileKey"]), admin)
            assert updated["pages"] == 4
            await api.admin_archive_document(free["id"])
            with pytest.raises(HTTPException):
                await api.get_document(free["id"], awa)
            link = await api.download_document(free["id"], awa)
            assert "/v2/" in link["url"]
            stats = {d["id"]: d for d in await api.admin_list_documents(status=None)}
            assert stats[locked["id"]]["revenue"] == locked["price"] and stats[d1["id"]]["licences"] == 1
        finally:
            await client.drop_database(name)
            client.close()

    asyncio.run(scenario())
