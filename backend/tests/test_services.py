"""Annonces de type service (kind="service") : pas de panier, contact WhatsApp.

Les scénarios avec base s'exécutent sur une base MongoDB LOCALE jetable
(ignorés si MongoDB n'est pas lancé).
Lancer depuis backend/ :  python -m pytest tests/test_services.py
"""
import asyncio
import os
import sys
import uuid

import pytest
from fastapi import BackgroundTasks, HTTPException, Response
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


needs_db = pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")

BASE = dict(name="Réparation de téléphones", description="Écran, batterie et connecteur, réparés en 1 h.",
            category="cat_1", price=5000, sellerId="s1", sellerName="Atelier", stock=12,
            images=["https://cdn/x.webp"], colors=["#000000"], condition="new")


def test_models():
    assert server.ProductCreate(**BASE).kind == "product"
    assert server.ProductCreate(**BASE, kind="service").kind == "service"
    with pytest.raises(ValidationError):
        server.ProductCreate(**BASE, kind="abonnement")
    assert server.ProductUpdate().kind is None
    # Fiches existantes, sans le champ : des produits
    assert server.Product(**{k: v for k, v in BASE.items()}).kind == "product"


def test_service_fields():
    service = server.service_fields({**BASE, "kind": "service"})
    assert (service["stock"], service["condition"], service["colors"]) == (0, None, [])
    product = server.service_fields(dict(BASE))
    assert (product["stock"], product["condition"]) == (12, "new")


@needs_db
def test_service_contact_and_checkout(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(server, "db", db)
        try:
            await db.sellers.insert_one({"id": "s1", "whatsapp": "+237690000001", "businessName": "Atelier"})
            await db.products.insert_many([
                {**server.service_fields({**BASE, "kind": "service"}), "id": "p_service", "status": "approved"},
                {**BASE, "id": "p_article", "name": "Coque", "status": "approved"},
            ])

            # Le WhatsApp du vendeur accompagne les services, pas les articles
            listed = {p.id: p for p in await server.get_products(
                Response(), search=None, seller_id=None, category=None, status_filter="approved", limit=None,
                skip=0, sort=None, min_price=None, max_price=None, track=False)}
            assert listed["p_service"].kind == "service"
            assert listed["p_service"].sellerWhatsapp == "+237690000001"
            assert listed["p_article"].sellerWhatsapp is None
            assert (await server.get_product("p_service")).sellerWhatsapp == "+237690000001"
            assert "sellerWhatsapp" not in (await db.products.find_one({"id": "p_service"}))

            # Un service ne se commande pas, même envoyé directement à l'API
            request = server.CheckoutRequest(
                firstName="Awa", phone="+237690000002", paymentMethod="cash", deliveryOption="pickup",
                cartItems=[server.CheckoutProduct(id="p_service", quantity=1)])
            with pytest.raises(HTTPException) as refused:
                await server.process_checkout(request, BackgroundTasks())
            assert refused.value.status_code == 400 and "service" in refused.value.detail
            assert await db.orders.count_documents({}) == 0
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())
