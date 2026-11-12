"""Codes promo (promo.py, routers/promo_codes.py, commande et devis).

Lancer depuis backend/ :  python -m pytest tests/test_promo_codes.py
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi import BackgroundTasks, HTTPException
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import promo as rules  # noqa: E402
import server  # noqa: E402
from routers import promo_codes  # noqa: E402
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

P1 = {"id": "p1", "sellerId": "s1", "category": "mode", "price": 10000}
P2 = {"id": "p2", "sellerId": "s2", "category": "tech", "price": 8000, "promoPrice": 6000}


def cart(*items, shipping=None):
    return rules.lines_by_seller(list(items), shipping or {"s1": 1000, "s2": 700})


def code(**extra):
    base = {"id": "promo_x", "code": "X", "type": "percent", "value": 10, "active": True, "usedCount": 0}
    base.update(extra)
    return base


def test_codes_and_validation():
    assert rules.normalize_code(" bien venue 10 ") == "BIENVENUE10"
    assert promo_codes.PromoCodeIn(code="noel-2026", type="fixed", value=2000).code == "NOEL-2026"
    for bad in ({"code": "a", "type": "fixed", "value": 1000},
                {"code": "OK10", "type": "percent", "value": 0},
                {"code": "OK10", "type": "percent", "value": 95},
                {"code": "OK10", "type": "fixed", "value": 0},
                {"code": "OK10", "type": "fixed", "value": 500,
                 "startsAt": "2026-12-10T00:00:00", "endsAt": "2026-12-01T00:00:00"}):
        with pytest.raises(ValidationError):
            promo_codes.PromoCodeIn(**bad)
    free = promo_codes.PromoCodeIn(code="LIVRAISON", type="free_shipping", value=999, maxDiscount=5)
    assert free.value == 0 and free.maxDiscount is None
    assert rules.describe(code(maxDiscount=5000)) == "-10 % (5 000 XAF au plus)"
    assert rules.describe(code(type="fixed", value=2000)) == "-2 000 XAF"


def test_validity():
    now = datetime.utcnow()
    for doc, message in ((None, "n'existe pas"), (code(active=False), "plus valable"),
                         (code(startsAt=now + timedelta(days=1)), "pas encore"),
                         (code(endsAt=now - timedelta(seconds=1)), "expiré"),
                         (code(maxUses=3, usedCount=3), "nombre de fois")):
        with pytest.raises(rules.PromoError, match=message):
            rules.check_validity(doc, now)
    assert rules.check_validity(code(maxUses=3, usedCount=2), now)


def test_discounts():
    both = cart((P1, 2), (P2, 1))  # s1 : 20 000, s2 : 6 000 (prix promo)
    # Pourcentage réparti au prorata ; plafond
    assert rules.compute_discounts(code(value=10), both) == {"s1": 2000, "s2": 600}
    assert sum(rules.compute_discounts(code(value=10, maxDiscount=1000), both).values()) == 1000
    # Montant fixe : jamais plus que les articles concernés
    assert rules.compute_discounts(code(type="fixed", value=2600), both) == {"s1": 2000, "s2": 600}
    assert rules.compute_discounts(code(type="fixed", value=50000), cart((P2, 1))) == {"s2": 6000}
    # Livraison offerte
    assert rules.compute_discounts(code(type="free_shipping", value=0), both) == {"s1": 1000, "s2": 700}
    # Code d'une boutique : ses seuls produits
    assert rules.compute_discounts(code(sellerId="s2", value=50), both) == {"s2": 3000}
    assert rules.compute_discounts(code(type="free_shipping", value=0, sellerId="s1"), both) == {"s1": 1000}
    # Catégories visées
    assert rules.compute_discounts(code(categories=["tech"], value=50), both) == {"s2": 3000}
    with pytest.raises(rules.PromoError, match="aucun article"):
        rules.compute_discounts(code(sellerId="s3"), both)
    # Minimum d'achat sur les articles concernés
    with pytest.raises(rules.PromoError, match="à partir de 10 000 XAF"):
        rules.compute_discounts(code(sellerId="s2", minOrder=10000), both)
    # Arrondi : le total réparti est exact
    split = rules.compute_discounts(code(type="fixed", value=1001), cart((P1, 1), (P2, 1)))
    assert sum(split.values()) == 1001


@needs_db
def test_checkout_with_promo(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(server, "db", db)
        monkeypatch.setattr(promo_codes, "db", db)
        try:
            await promo_codes.ensure_indexes()
            await db.sellers.insert_many([{"id": "s1", "businessName": "Atelier", "deliveryPrice": 1000},
                                          {"id": "s2", "businessName": "Boutique", "deliveryPrice": 700}])
            await db.products.insert_many([
                {**P1, "name": "Robe", "stock": 10, "status": "approved", "sellerName": "Atelier", "images": []},
                {**P2, "name": "Sac", "stock": 10, "status": "approved", "sellerName": "Boutique", "images": []},
            ])
            admin = session("admin", "a1", "admin")
            team = await promo_codes.admin_create(
                promo_codes.PromoCodeIn(code="bienvenue", type="percent", value=10, maxUses=2), admin)
            assert team["ownerType"] == "platform" and team["label"] == "-10 %" and team["state"] == "running"
            with pytest.raises(HTTPException) as err:
                await promo_codes.admin_create(promo_codes.PromoCodeIn(code="BIENVENUE", type="fixed", value=1), admin)
            assert err.value.status_code == 409

            # Code vendeur : limité à sa boutique, même s'il essaie d'en viser une autre
            with pytest.raises(SessionRequired):
                await promo_codes.seller_list(fake_request(headers={"X-Seller-Id": "s2"}))
            shop = await promo_codes.seller_create(
                promo_codes.PromoCodeIn(code="SAC50", type="percent", value=50, sellerId="s1", categories=["mode"]),
                session("seller", "s2"))
            assert shop["ownerType"] == "seller" and shop["sellerId"] == "s2" and shop["categories"] == []
            assert [c["code"] for c in await promo_codes.seller_list(session("seller", "s2"))] == ["SAC50"]
            assert await promo_codes.seller_list(session("seller", "s1")) == []
            with pytest.raises(HTTPException):
                await promo_codes.seller_delete(shop["id"], session("seller", "s1"))

            items = [server.CheckoutProduct(id="p1", quantity=2), server.CheckoutProduct(id="p2", quantity=1)]
            # Devis : réduction affichée ; code refusé expliqué sans bloquer
            quote = await server.delivery_quote(server.DeliveryQuoteRequest(cartItems=items, promoCode=" bienvenue "))
            assert quote["discount"] == 2600 and quote["total"] == 26000 + 1700 - 2600
            assert quote["promo"] == {"code": "BIENVENUE", "label": "-10 %"}
            bad = await server.delivery_quote(server.DeliveryQuoteRequest(cartItems=items, promoCode="NOPE"))
            assert bad["discount"] == 0 and "n'existe pas" in bad["promoError"]

            def checkout(phone, promo_code, cart_items=items):
                return server.CheckoutRequest(firstName="Awa", phone=phone, city="Douala", paymentMethod="cashOnDelivery",
                                              deliveryOption="home", cartItems=cart_items, promoCode=promo_code)

            orders = await server.process_checkout(checkout("+237690000001", "BIENVENUE"), BackgroundTasks())
            by_seller = {o.sellerId: o for o in orders}
            assert by_seller["s1"].discount == 2000 and by_seller["s1"].totalAmount == 20000 + 1000 - 2000
            assert by_seller["s2"].discount == 600 and by_seller["s2"].discountFundedBy == "platform"
            assert by_seller["s1"].promoCode == "BIENVENUE"

            # Une fois par client ; un code inconnu bloque la commande sans toucher au stock
            with pytest.raises(HTTPException, match="déjà utilisé"):
                await server.process_checkout(checkout("690000001", "BIENVENUE"), BackgroundTasks())
            with pytest.raises(HTTPException):
                await server.process_checkout(checkout("+237690000002", "NOPE"), BackgroundTasks())
            assert (await db.products.find_one({"id": "p1"}))["stock"] == 8

            # Code vendeur : seule sa commande est réduite, à sa charge
            orders = await server.process_checkout(checkout("+237690000002", "sac50"), BackgroundTasks())
            by_seller = {o.sellerId: o for o in orders}
            assert by_seller["s2"].discount == 3000 and by_seller["s2"].discountFundedBy == "seller"
            assert by_seller["s1"].discount == 0 and by_seller["s1"].promoCode is None

            # Nombre d'utilisations atteint
            await server.process_checkout(checkout("+237690000003", "BIENVENUE"), BackgroundTasks())
            with pytest.raises(HTTPException, match="nombre de fois"):
                await server.process_checkout(checkout("+237690000004", "BIENVENUE"), BackgroundTasks())

            # Annulation de toutes ses commandes : l'utilisation est rendue
            listed = {c["code"]: c for c in await promo_codes.admin_list()}
            assert listed["BIENVENUE"]["usedCount"] == 2 and listed["BIENVENUE"]["totalDiscount"] == 5200
            buyer = (await db.orders.find_one({"promoCode": "BIENVENUE"}))["buyerId"]
            for o in await db.orders.find({"promoCode": "BIENVENUE", "buyerId": buyer}).to_list(None):
                await server.update_order(o["id"], server.OrderUpdate(status="cancelled"), BackgroundTasks(), "admin", None)
            assert (await db.promo_codes.find_one({"code": "BIENVENUE"}))["usedCount"] == 1
            assert await db.promo_redemptions.count_documents({"buyerId": buyer}) == 0
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())
