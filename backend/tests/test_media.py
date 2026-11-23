"""Médiathèque de l'admin et des vendeurs (routers/media.py).

Le stockage S3 est remplacé par une version en mémoire. Les scénarios avec
base s'exécutent sur une base MongoDB LOCALE jetable (ignorés si MongoDB
n'est pas lancé).
Lancer depuis backend/ :  python -m pytest tests/test_media.py
"""
import asyncio
import os
import sys

import pytest
from fastapi import BackgroundTasks, HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402,F401  (avant les routeurs : ils importent server)
from routers import media  # noqa: E402

BUCKET_URL = "https://pub.s3.eu-west-1.amazonaws.com/"
TEAM = media.Actor(role="admin")
SUPPORT = media.Actor(role="support")
SELLER = media.Actor(sellerId="s1")
OTHER_SELLER = media.Actor(sellerId="s2")


class MemoryStorage:
    def __init__(self, listing=True):
        self.files = {}  # clé -> (taille, type)
        self.deleted = []
        self.listing = listing

    def url(self, key):
        return BUCKET_URL + key

    def key_from_url(self, url):
        return url[len(BUCKET_URL):] if url.startswith(BUCKET_URL) else None

    async def upload_url(self, key, mime):
        return f"https://signed.example/{key}"

    async def head(self, key):
        if key not in self.files:
            return None
        size, mime = self.files[key]
        return {"size": size, "mimeType": mime}

    async def read(self, key):
        size, mime = self.files[key]
        return {"body": b"x" * size, "mimeType": mime}

    async def delete(self, keys):
        for key in keys:
            self.deleted.append(key)
            self.files.pop(key, None)

    async def list_uploads(self):
        if not self.listing:
            raise media.StorageUnavailable("AccessDenied")
        return [{"key": k, "size": s, "uploadedAt": "2026-01-01T00:00:00+00:00"} for k, (s, _) in self.files.items()]

    async def make_thumbnail(self, url):
        return url.replace("uploads/", "uploads/variants/w400/")


def test_safe_file_name_strips_accents_and_paths():
    assert media.safe_file_name("C:\\photos\\Été 2026 (1).JPG") == "Ete-2026-1.jpg"
    assert media.safe_file_name("../../etc/passwd") == "passwd"
    assert media.safe_file_name("...") == "fichier"


def test_display_name_drops_uuid_prefix():
    assert media.display_name("uploads/0f8fad5b-d9cb-469f-a165-70867728950e-robe.jpg") == "robe.jpg"
    assert media.display_name("uploads/logo.png") == "logo.png"


def test_file_checks():
    assert media.check_file("image/jpeg", 1000, TEAM) == "image"
    assert media.check_file("application/pdf", 20 * media.MB, TEAM) == "document"
    with pytest.raises(HTTPException) as err:
        media.check_file("image/svg+xml", 10, TEAM)  # script possible dans un fichier public
    assert err.value.status_code == 415
    with pytest.raises(HTTPException) as err:
        media.check_file("application/pdf", 10, SELLER)  # vendeurs : images seulement
    assert err.value.status_code == 415
    with pytest.raises(HTTPException) as err:
        media.check_file("image/png", 11 * media.MB, TEAM)
    assert err.value.status_code == 413
    assert media.guess_type("rapport.docx").endswith("wordprocessingml.document")


def test_actor_rules():
    assert asyncio.run(media.media_actor(seller_id="s1", role=None)).sellerId == "s1"
    assert asyncio.run(media.media_actor(seller_id=None, role="support")).role == "support"
    with pytest.raises(HTTPException) as err:
        asyncio.run(media.media_actor(seller_id=None, role=None))
    assert err.value.status_code == 403
    assert media.can_delete({"ownerId": "s1"}, SELLER) and not media.can_delete({"ownerId": "s1"}, OTHER_SELLER)
    assert media.can_delete({}, TEAM) and not media.can_delete({}, SUPPORT)


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


needs_db = pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")


def _run(monkeypatch, scenario, storage):
    from motor.motor_asyncio import AsyncIOMotorClient

    async def wrapper():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client["nengoo_test_media"]
        monkeypatch.setattr(media, "db", db)
        monkeypatch.setattr(media, "storage", storage)
        try:
            await media.ensure_indexes()
            await scenario(db)
        finally:
            await client.drop_database("nengoo_test_media")
            client.close()

    asyncio.run(wrapper())


def listing(actor, kind="all", q=""):
    return media.list_media(kind=kind, q=q, page=1, limit=40, actor=actor)


async def upload(store, actor, name, mime, size):
    ticket = await media.upload_url(media.UploadRequest(fileName=name, fileType=mime, size=size), actor)
    store.files[ticket.key] = (size, mime)
    item = await media.register_media(media.RegisterRequest(key=ticket.key, name=name), BackgroundTasks(), actor)
    return ticket, item


@needs_db
def test_upload_list_and_delete(monkeypatch):
    store = MemoryStorage()

    async def scenario(db):
        await db.settings.insert_one({"_id": media.SYNC_ID})  # pas d'import initial ici
        ticket = await media.upload_url(media.UploadRequest(fileName="Robe rouge.png", fileType="image/png", size=2000), TEAM)
        assert ticket.key.startswith("uploads/") and ticket.key.endswith("-Robe-rouge.png")

        # Pas encore arrivé sur S3
        with pytest.raises(HTTPException) as err:
            await media.register_media(media.RegisterRequest(key=ticket.key), BackgroundTasks(), TEAM)
        assert err.value.status_code == 404

        store.files[ticket.key] = (2000, "image/png")
        # Un vendeur ne peut pas s'approprier l'envoi de quelqu'un d'autre
        with pytest.raises(HTTPException) as err:
            await media.register_media(media.RegisterRequest(key=ticket.key), BackgroundTasks(), SELLER)
        assert err.value.status_code == 400

        tasks = BackgroundTasks()
        item = await media.register_media(media.RegisterRequest(key=ticket.key, name="Robe rouge.png"), tasks, TEAM)
        assert item.kind == "image" and item.url == ticket.publicUrl and item.name == "Robe rouge.png"
        for task in tasks.tasks:
            await task()
        # Le ticket ne sert qu'une fois
        with pytest.raises(HTTPException):
            await media.register_media(media.RegisterRequest(key=ticket.key), BackgroundTasks(), TEAM)

        await upload(store, TEAM, "notice.pdf", "application/pdf", 5000)

        assert (await listing(TEAM)).total == 2
        images = await listing(TEAM, kind="image")
        assert [i.name for i in images.items] == ["Robe rouge.png"]
        assert images.items[0].thumbnail.endswith("variants/w400/" + ticket.key.split("/", 1)[1])
        assert (await listing(TEAM, q="NOTICE")).total == 1

        # Une photo utilisée par un produit ne se supprime pas
        await db.products.insert_one({"id": "p1", "images": [item.url]})
        assert (await listing(TEAM, kind="image")).items[0].usedBy == 1
        with pytest.raises(HTTPException) as err:
            await media.delete_media(item.id, TEAM)
        assert err.value.status_code == 409

        await db.products.delete_many({})
        with pytest.raises(HTTPException) as err:
            await media.delete_media(item.id, SUPPORT)  # le support ne supprime pas
        assert err.value.status_code == 403
        await media.delete_media(item.id, TEAM)
        assert ticket.key in store.deleted
        assert any("/variants/w400/" in k for k in store.deleted)
        assert (await listing(TEAM)).total == 1

    _run(monkeypatch, scenario, store)


@needs_db
def test_oversized_upload_is_discarded(monkeypatch):
    store = MemoryStorage()

    async def scenario(db):
        ticket = await media.upload_url(media.UploadRequest(fileName="big.jpg", fileType="image/jpeg", size=100), TEAM)
        store.files[ticket.key] = (50 * media.MB, "image/jpeg")  # taille annoncée fausse
        with pytest.raises(HTTPException) as err:
            await media.register_media(media.RegisterRequest(key=ticket.key), BackgroundTasks(), TEAM)
        assert err.value.status_code == 413
        assert ticket.key in store.deleted
        with pytest.raises(HTTPException):  # aucun ticket pour ce fichier
            await media.register_media(media.RegisterRequest(key="uploads/variants/w400/a.webp"), BackgroundTasks(), TEAM)

    _run(monkeypatch, scenario, store)


@needs_db
def test_first_opening_imports_existing_files(monkeypatch):
    store = MemoryStorage()
    store.files = {
        "uploads/0f8fad5b-d9cb-469f-a165-70867728950e-sac.jpg": (100, "image/jpeg"),
        "uploads/variants/w400/0f8fad5b-d9cb-469f-a165-70867728950e-sac.webp": (10, "image/webp"),
        "uploads/catalogue.pdf": (300, "application/pdf"),
        "uploads/script.svg": (10, "image/svg+xml"),
    }

    async def scenario(db):
        page = await listing(TEAM)
        assert sorted(i.name for i in page.items) == ["catalogue.pdf", "sac.jpg"]
        sac = next(i for i in page.items if i.name == "sac.jpg")
        assert sac.thumbnail.endswith("variants/w400/0f8fad5b-d9cb-469f-a165-70867728950e-sac.webp")
        # Relancer l'import n'ajoute pas de doublon
        assert (await media.sync_media(TEAM)).added == 0

    _run(monkeypatch, scenario, store)


@needs_db
def test_import_falls_back_to_product_photos(monkeypatch):
    store = MemoryStorage(listing=False)  # clé AWS sans droit ListBucket

    async def scenario(db):
        await db.products.insert_one({
            "id": "p1", "sellerId": "s1",
            "images": [BUCKET_URL + "uploads/a-chaussure.png", "https://images.unsplash.com/photo"],
            "thumbnails": [BUCKET_URL + "uploads/variants/w400/a-chaussure.webp", ""],
        })
        result = await media.sync_media(TEAM)
        assert (result.added, result.source) == (1, "products")
        item = (await listing(TEAM)).items[0]
        assert item.name == "a-chaussure.png" and item.thumbnail.endswith("a-chaussure.webp") and item.usedBy == 1
        # Rangée au nom du vendeur du produit
        assert (await db.media.find_one({"id": item.id}))["ownerId"] == "s1"

    _run(monkeypatch, scenario, store)


@needs_db
def test_seller_sees_and_deletes_only_own_files(monkeypatch):
    store = MemoryStorage()

    async def scenario(db):
        await db.settings.insert_one({"_id": media.SYNC_ID})
        await db.products.insert_one({"id": "p1", "sellerId": "s1", "images": [BUCKET_URL + "uploads/old-sac.jpg"]})
        store.files["uploads/old-sac.jpg"] = (10, "image/jpeg")

        # Première ouverture : les photos de ses produits sont importées à son nom
        first = await listing(SELLER)
        assert [i.name for i in first.items] == ["old-sac.jpg"] and first.items[0].usedBy == 1

        # Images seulement
        with pytest.raises(HTTPException) as err:
            await media.upload_url(media.UploadRequest(fileName="cv.pdf", fileType="application/pdf", size=10), SELLER)
        assert err.value.status_code == 415

        ticket, mine = await upload(store, SELLER, "robe.webp", "image/webp", 50)
        assert mine.canDelete
        _, team_item = await upload(store, TEAM, "banniere.png", "image/png", 50)

        assert sorted(i.name for i in (await listing(SELLER)).items) == ["old-sac.jpg", "robe.webp"]
        assert (await listing(OTHER_SELLER)).total == 0
        assert (await listing(TEAM)).total == 3

        # Fichier de l'équipe ou d'un autre vendeur : introuvable
        with pytest.raises(HTTPException) as err:
            await media.delete_media(team_item.id, SELLER)
        assert err.value.status_code == 404
        with pytest.raises(HTTPException) as err:
            await media.delete_media(mine.id, OTHER_SELLER)
        assert err.value.status_code == 404
        await media.delete_media(mine.id, SELLER)
        assert ticket.key in store.deleted

        # L'IA ne lit que nos fichiers
        assert (await media.image_data_url(BUCKET_URL + "uploads/old-sac.jpg")).startswith("data:image/jpeg;base64,")
        with pytest.raises(ValueError):
            await media.image_data_url("http://169.254.169.254/latest/meta-data")

    _run(monkeypatch, scenario, store)
