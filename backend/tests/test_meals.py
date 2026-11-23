"""Plats (kind="meal") : réservés aux vendeurs « restaurant », commandés en
ligne (panier, portions) ou sur WhatsApp selon mealOrder.

Les scénarios avec base s'exécutent sur une base MongoDB LOCALE jetable
(ignorés si MongoDB n'est pas lancé).
Lancer depuis backend/ :  python -m pytest tests/test_meals.py
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

BASE = dict(name="Ndolé crevettes", description="Ndolé aux crevettes, servi avec miondo ou plantain.",
            category="cat_1", price=3500, sellerId="resto", sellerName="Chez Mama", stock=20,
            images=[], colors=["#000000"], condition="new")


def test_models():
    assert server.ProductCreate(**BASE, kind="meal").kind == "meal"
    assert server.ProductCreate(**BASE, kind="meal", mealOrder="whatsapp").mealOrder == "whatsapp"
    with pytest.raises(ValidationError):
        server.ProductCreate(**BASE, kind="meal", mealOrder="livraison")
    # Vendeurs existants : pas restaurant
    assert server.SellerCreate(whatsapp="+237690000001", password="x", name="A", businessName="B",
                               email="a@b.cm", city="Douala", region="Littoral", address="Akwa",
                               description="Boutique").restaurant is False
    assert server.SellerUpdate().restaurant is None


def test_meal_fields():
    online = server.service_fields({**BASE, "kind": "meal"})
    assert (online["mealOrder"], online["stock"], online["condition"], online["colors"]) == ("online", 20, None, [])
    whatsapp = server.service_fields({**BASE, "kind": "meal", "mealOrder": "whatsapp"})
    assert (whatsapp["stock"], whatsapp["condition"]) == (0, None)
    # Hors des plats, pas de mode de commande
    assert server.service_fields({**BASE, "kind": "product", "mealOrder": "whatsapp"})["mealOrder"] is None


def test_whatsapp_only():
    assert server.whatsapp_only({"kind": "service"})
    assert server.whatsapp_only({"kind": "meal", "mealOrder": "whatsapp"})
    assert not server.whatsapp_only({"kind": "meal", "mealOrder": "online"})
    assert not server.whatsapp_only({"kind": "product"})
    assert not server.whatsapp_only({})


def test_assistant_sells_whatsapp_meals():
    import assistant_tools
    assert {"kind": "meal", "mealOrder": "whatsapp"} in assistant_tools.FOR_SALE["$or"]


@needs_db
def test_meals_reserved_to_restaurants_and_checkout(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(server, "db", db)

        async def no_category_check(_category):
            return None
        monkeypatch.setattr(server, "check_product_category", no_category_check)
        try:
            await db.sellers.insert_many([
                {"id": "resto", "whatsapp": "+237690000001", "businessName": "Chez Mama", "restaurant": True},
                {"id": "shop", "whatsapp": "+237690000003", "businessName": "Boutique"},
            ])

            # Boutique non restaurant : refusé, à la création comme en modification
            with pytest.raises(HTTPException) as refused:
                await server.create_product(server.ProductCreate(**{**BASE, "sellerId": "shop"}, kind="meal"),
                                            BackgroundTasks(), current_seller_id="shop", admin_role=None)
            assert refused.value.status_code == 400 and "restaurant" in refused.value.detail
            article = await server.create_product(
                server.ProductCreate(**{**BASE, "sellerId": "shop", "name": "Marmite"}),
                BackgroundTasks(), current_seller_id="shop", admin_role=None)
            with pytest.raises(HTTPException):
                await server.update_product(article.id, server.ProductUpdate(kind="meal"),
                                            BackgroundTasks(), admin_role=None)

            # Restaurant : plat en ligne (portions) et plat sur WhatsApp
            online = await server.create_product(server.ProductCreate(**BASE, kind="meal"),
                                                 BackgroundTasks(), current_seller_id="resto", admin_role=None)
            assert (online.kind, online.mealOrder, online.stock, online.condition) == ("meal", "online", 20, None)
            whatsapp = await server.create_product(
                server.ProductCreate(**{**BASE, "name": "Poulet DG"}, kind="meal", mealOrder="whatsapp"),
                BackgroundTasks(), current_seller_id="resto", admin_role=None)
            assert (whatsapp.mealOrder, whatsapp.stock) == ("whatsapp", 0)

            # Modification du seul mode de commande : reste un plat
            await server.update_product(online.id, server.ProductUpdate(mealOrder="whatsapp"),
                                        BackgroundTasks(), admin_role=None)
            stored = await db.products.find_one({"id": online.id})
            assert (stored["kind"], stored["mealOrder"], stored["stock"]) == ("meal", "whatsapp", 0)
            await server.update_product(online.id, server.ProductUpdate(mealOrder="online", stock=8),
                                        BackgroundTasks(), admin_role=None)
            stored = await db.products.find_one({"id": online.id})
            assert (stored["mealOrder"], stored["stock"]) == ("online", 8)

            # WhatsApp du restaurant sur tous ses plats (bouton de contact des cartes)
            await db.products.update_many({}, {"$set": {"status": "approved"}})
            listed = {p.id: p for p in await server.get_products(
                Response(), search=None, seller_id=None, category=None, status_filter="approved", limit=None,
                skip=0, sort=None, min_price=None, max_price=None, track=False)}
            assert listed[whatsapp.id].sellerWhatsapp == "+237690000001"
            assert listed[online.id].sellerWhatsapp == "+237690000001"

            # Plat « whatsapp » : pas de panier, même envoyé directement à l'API
            request = server.CheckoutRequest(
                firstName="Awa", phone="+237690000002", paymentMethod="cash", deliveryOption="pickup",
                cartItems=[server.CheckoutProduct(id=whatsapp.id, quantity=1)])
            with pytest.raises(HTTPException) as refused:
                await server.process_checkout(request, BackgroundTasks())
            assert refused.value.status_code == 400 and "WhatsApp" in refused.value.detail
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())
