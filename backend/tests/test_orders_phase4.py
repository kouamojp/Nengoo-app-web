"""Commande (phase 4) : quantités, stock réservé, étapes de statut, suivi sans compte.

S'exécute sur une base MongoDB LOCALE jetable (ignoré si MongoDB n'est pas lancé).
Lancer depuis backend/ :  python -m pytest tests/test_orders_phase4.py
"""
import asyncio
import os
import sys
import uuid

import pytest
from fastapi import BackgroundTasks, HTTPException
from starlette.requests import Request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import login_limiter  # noqa: E402
import server  # noqa: E402
from session_auth import SessionRequired  # noqa: E402
from session_helpers import fake_request, session  # noqa: E402
from order_flow import check_transition, normalize_status, status_label  # noqa: E402


def test_transitions():
    assert check_transition("received", "confirmed", False) is None
    assert check_transition("pending", "confirmed", False) is None          # ancien statut
    assert check_transition("confirmed", "preparing", False) is None        # paiement sauté
    assert "ne peut pas" in check_transition("received", "delivered", False)
    assert check_transition("received", "delivered", True) is None          # correction admin
    assert check_transition("cancelled", "confirmed", False)
    assert check_transition("received", "lost", True) == "Statut de commande inconnu."
    assert normalize_status("processing") == "preparing"
    assert status_label("pending") == "Commande reçue"


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


pytestmark_db = pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")


def request():
    return Request({"type": "http", "headers": [], "client": ("10.0.0.9", 1)})


def checkout(**overrides):
    data = {"firstName": "Awa", "phone": "+237 690 00 00 01", "city": "douala ", "neighborhood": "Akwa",
            "landmark": "Face pharmacie du Centre", "paymentMethod": "cashOnDelivery",
            "deliveryOption": "home", "cartItems": [{"id": "p1", "quantity": 2}]}
    data.update(overrides)
    return server.CheckoutRequest(**data)


@pytestmark_db
def test_checkout_flow(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"
    login_limiter.reset()

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(server, "db", db)
        await db.sellers.insert_one({"id": "s1", "businessName": "Atelier", "deliveryPrice": 1000})
        await db.products.insert_many([
            {"id": "p1", "name": "Robe", "price": 10000, "stock": 3, "status": "approved", "sellerId": "s1",
             "sellerName": "Atelier", "images": ["a.jpg"]},
            {"id": "p2", "name": "Sac archivé", "price": 5000, "stock": 5, "status": "inactive", "sellerId": "s1",
             "sellerName": "Atelier", "images": ["b.jpg"]},
        ])
        tasks = BackgroundTasks()

        async def rejects(coro, status=400):
            with pytest.raises(HTTPException) as err:
                await coro
            assert err.value.status_code == status
            return err.value.detail

        # Quantités et produits refusés
        assert "au moins 1" in await rejects(server.process_checkout(checkout(cartItems=[{"id": "p1", "quantity": -2}]), tasks))
        assert "au moins 1" in await rejects(server.process_checkout(checkout(cartItems=[{"id": "p1", "quantity": 0}]), tasks))
        assert "Stock insuffisant" in await rejects(server.process_checkout(checkout(cartItems=[{"id": "p1", "quantity": 4}]), tasks))
        assert "plus en vente" in await rejects(server.process_checkout(checkout(cartItems=[{"id": "p2", "quantity": 1}]), tasks))
        assert "invalide" in await rejects(server.process_checkout(checkout(phone="abc"), tasks))
        assert (await db.products.find_one({"id": "p1"}))["stock"] == 3

        # Commande sans compte ni e-mail : stock retiré tout de suite
        [order] = await server.process_checkout(checkout(), tasks)
        assert order.status == "received" and order.stockReserved
        assert order.totalAmount == 2 * 10000 + 1000
        assert order.shippingCity == "Douala" and order.shippingNeighborhood == "Akwa"
        assert (await db.products.find_one({"id": "p1"}))["stock"] == 1
        # Même client, numéro écrit autrement : pas de second compte
        [again] = await server.process_checkout(checkout(phone="690000001", cartItems=[{"id": "p1", "quantity": 1}]), tasks)
        assert again.buyerId == order.buyerId
        assert (await db.products.find_one({"id": "p1"}))["stock"] == 0
        assert "Stock insuffisant" in await rejects(server.process_checkout(checkout(cartItems=[{"id": "p1", "quantity": 1}]), tasks))

        # Étapes : un vendeur ne saute pas d'étape, l'annulation rend le stock
        update = server.OrderUpdate
        assert "ne peut pas" in await rejects(server.update_order(order.id, update(status="delivered"), tasks, None, "s1"))
        await server.update_order(order.id, update(status="confirmed"), tasks, None, "s1")
        await server.update_order(order.id, update(status="cancelled"), tasks, None, "s1")
        assert (await db.products.find_one({"id": "p1"}))["stock"] == 2
        saved = await db.orders.find_one({"id": order.id})
        assert [h["status"] for h in saved["statusHistory"]] == ["received", "confirmed", "cancelled"]
        # Un admin peut corriger : la commande reprend son stock
        await server.update_order(order.id, update(status="confirmed"), tasks, "admin", None)
        assert (await db.products.find_one({"id": "p1"}))["stock"] == 0

        # Suivi sans compte
        tracked = await server.track_order(request(), orderId=order.id, phone="00237690000001")
        assert tracked["statusLabel"] == "Commande confirmée" and len(tracked["history"]) == 4
        assert "buyerId" not in tracked
        await rejects(server.track_order(request(), orderId=order.id, phone="+237 699 99 99 99"), 404)
        await client.drop_database(name)

    asyncio.run(scenario())


def test_sms_texts(monkeypatch):
    import sms
    text = sms.order_created_text("ord_1a2b3c4d", 25000.0, "Atelier Mbarga ")
    assert text.startswith("Nengoo: commande ord_1a2b3c4d recue (25000 FCFA, Atelier Mbarga)")
    assert len(text) <= 160 and text.isascii()
    assert "livree" in sms.order_status_text("ord_1", "delivered")
    assert sms.order_status_text("ord_1", "preparing") is None
    # Sans fournisseur configuré : rien n'est envoyé
    monkeypatch.delenv("SMS_PROVIDER", raising=False)
    assert sms.send_sms("+237 690 00 00 01", text) is False
    sent = {}

    class Ok:
        status_code = 201
        text = ""

    def fake_post(url, **kwargs):
        sent.update(url=url, **kwargs)
        return Ok()

    monkeypatch.setenv("SMS_PROVIDER", "twilio")
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC123")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("TWILIO_FROM", "+15550001111")
    monkeypatch.setattr(sms.requests, "post", fake_post)
    assert sms.send_sms("690000001", text) is True
    assert sent["data"]["To"] == "+237690000001" and "AC123" in sent["url"]
    assert sms.send_sms("pas un numero", text) is False


def test_orders_list_is_private(monkeypatch):
    """GET /orders?buyer_id= ou ?seller_id= : seulement le titulaire ou l'équipe."""
    class Cursor:
        def sort(self, *a):
            return self

        async def to_list(self, n):
            return []

    class Orders:
        def find(self, query):
            return Cursor()

    class Db:
        orders = Orders()

    monkeypatch.setattr(server, "db", Db())

    async def scenario():
        # Sans session : connexion demandée, même avec un en-tête d'identité
        with pytest.raises(SessionRequired):
            await server.list_orders(fake_request(), buyer_id="buyer_a", role=None)
        with pytest.raises(SessionRequired):
            await server.list_orders(fake_request(headers={"X-Buyer-Id": "buyer_a"}), buyer_id="buyer_a", role=None)
        with pytest.raises(SessionRequired):
            await server.list_orders(fake_request(), role=None)
        # Un autre compte : refusé
        with pytest.raises(HTTPException) as err:
            await server.list_orders(session("buyer", "buyer_b"), buyer_id="buyer_a", role=None)
        assert err.value.status_code == 403
        with pytest.raises(HTTPException):
            await server.list_orders(session("seller", "s2"), seller_id="s1", role=None)
        with pytest.raises(HTTPException):
            await server.list_orders(session("buyer", "buyer_a"), role=None)
        assert await server.list_orders(session("buyer", "buyer_a"), buyer_id="buyer_a", role=None) == []
        assert await server.list_orders(session("seller", "s1"), seller_id="s1", role=None) == []
        staff = session("admin", "a1", "support")
        assert await server.list_orders(staff, buyer_id="buyer_a", role="support") == []
        assert await server.list_orders(staff, role="support") == []

    asyncio.run(scenario())
