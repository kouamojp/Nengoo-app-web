"""Section « À la une » de l'accueil (routers/highlights.py).

Lancer depuis backend/ :  python -m pytest tests/test_highlights.py
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import BackgroundTasks, HTTPException, Response

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402  (avant les routeurs)
from routers import highlights as hl  # noqa: E402


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


needs_db = pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")


def prod(pid, seller="s1", **extra):
    base = dict(id=pid, name=pid, description="Description assez longue.", category="c", price=1000,
                sellerId=seller, sellerName=seller, stock=5, images=["https://cdn/x.webp"], status="approved")
    base.update(extra)
    return base


def ids(items):
    return [(p["id"], p["highlight"]) for p in items]


def test_only_sellable_listings():
    products = [
        prod("ok", "s1", views=10),
        prod("no_stock", stock=0, views=99),
        prod("service", "s2", stock=0, kind="service", views=5),
        prod("pending", status="pending", views=99),
        prod("no_photo", "s3", images=[""], views=99),
        prod("free", price=0, views=99),
        prod("unseen"),  # aucun signal : pas à la une
    ]
    # Sans photo : affiché avec le logo de la boutique
    assert {p["id"] for p in hl.rank(products, {}, {}, 10)} == {"ok", "service", "no_photo"}


def test_promoted_first_then_score_with_reason():
    now = datetime.utcnow()
    products = [
        prod("viewed", "s1", views=200),
        prod("ordered", "s2"),
        prod("contacted", "s3", kind="service", stock=0),
        prod("rated", "s4", rating=4.9, reviewsCount=40),
        prod("one_review", "s5", rating=5, reviewsCount=1),
        prod("promo_old", "s6", featured=True, updatedAt=now - timedelta(days=3)),
        prod("promo_new", "s7", featured=True, updatedAt=now),
    ]
    ranked = hl.rank(products, {"ordered": 40}, {"contacted": 30}, 10)
    assert ids(ranked)[:2] == [("promo_new", "promoted"), ("promo_old", "promoted")]
    reasons = dict(ids(ranked))
    assert reasons["ordered"] == "top_ordered"
    assert reasons["contacted"] == "most_requested"
    assert reasons["viewed"] == "most_viewed"
    assert reasons["rated"] == "top_rated"
    # Une seule note de 5 pèse moins que 40 avis à 4,9
    order = [p["id"] for p in ranked]
    assert order.index("rated") < order.index("one_review")
    # Commandes avant visites à volume comparable
    assert order.index("ordered") < order.index("viewed")


def test_variety_and_limit():
    products = [prod(f"p{i}", "big_shop", views=100 - i) for i in range(5)] + [prod("other", "s2", views=1)]
    ranked = hl.rank(products, {}, {}, 10)
    assert [p["id"] for p in ranked] == ["p0", "p1", "other"]  # 2 annonces par boutique au plus
    assert len(hl.rank(products, {}, {}, 2)) == 2


@needs_db
def test_endpoint_views_and_featured_guard(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(hl, "db", db)
        monkeypatch.setattr(server, "db", db)
        hl.clear_cache()
        now = datetime.utcnow()
        try:
            await db.sellers.insert_one({"id": "s2", "whatsapp": "+237690000001", "businessName": "Atelier"})
            await db.products.insert_many([
                prod("a", "s1", views=3, createdAt=now, updatedAt=now),
                prod("b", "s2", kind="service", stock=0, createdAt=now, updatedAt=now),
                prod("c", "s3", createdAt=now, updatedAt=now),
            ])
            await db.orders.insert_many([
                {"id": "o1", "status": "delivered", "createdAt": now, "products": [{"productId": "c", "quantity": 4}]},
                {"id": "o2", "status": "cancelled", "createdAt": now, "products": [{"productId": "a", "quantity": 50}]},
                {"id": "o3", "status": "delivered", "createdAt": now - timedelta(days=200),
                 "products": [{"productId": "a", "quantity": 50}]},
            ])
            await db.whatsapp_clicks.insert_many([{"productId": "b", "timestamp": now} for _ in range(6)])

            response = Response()
            items = await hl.get_highlights(response, limit=8)
            # 4 commandes > 6 contacts > 3 visites ; commandes annulées ou trop anciennes ignorées
            assert [(p.id, p.highlight) for p in items] == [
                ("c", "top_ordered"), ("b", "most_requested"), ("a", "most_viewed")]
            assert items[1].sellerWhatsapp == "+237690000001"  # bouton « Contacter »
            assert "max-age" in response.headers["Cache-Control"]

            # Visites du site : comptées, sauf robots ; produit inconnu : 404
            human = SimpleNamespace(headers={"user-agent": "Mozilla/5.0"})
            await hl.count_product_view("c", human)
            await hl.count_product_view("c", SimpleNamespace(headers={"user-agent": "Googlebot/2.1"}))
            assert (await db.products.find_one({"id": "c"}))["views"] == 1
            with pytest.raises(HTTPException):
                await hl.count_product_view("inconnu", human)

            # « À la une » : un vendeur ne peut pas se promouvoir, un admin si
            await server.update_product("a", server.ProductUpdate(featured=True), BackgroundTasks(), admin_role=None)
            assert not (await db.products.find_one({"id": "a"})).get("featured")
            await server.update_product("a", server.ProductUpdate(featured=True), BackgroundTasks(), admin_role="admin")
            assert (await db.products.find_one({"id": "a"}))["featured"] is True
            items = await hl.get_highlights(Response(), limit=8)  # cache vidé par la mise à jour
            assert (items[0].id, items[0].highlight) == ("a", "promoted")
        finally:
            hl.clear_cache()
            await client.drop_database(name)

    asyncio.run(scenario())
