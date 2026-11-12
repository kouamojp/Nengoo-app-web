"""Données privées : seulement pour le titulaire du compte (jeton de session)
ou l'équipe — jamais sur la foi d'un en-tête d'identité.

Lancer depuis backend/ :  python -m pytest tests/test_private_data.py
"""
import asyncio
import os
import sys
import uuid

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402
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


def run(coro):
    return asyncio.run(coro)


def test_seller_identity_needs_a_session():
    # Un en-tête X-Seller-Id sans jeton : reconnexion demandée (plus d'usurpation)
    with pytest.raises(SessionRequired):
        run(server.get_current_seller_optional(fake_request(headers={"X-Seller-Id": "s1"})))
    assert run(server.get_current_seller_optional(fake_request())) is None
    assert run(server.get_current_seller_optional(session("seller", "s1"))) == "s1"
    assert run(server.get_current_seller_optional(session("buyer", "b1"))) is None
    # Favoris : même règle, et un « Bearer <id> » ne vaut pas jeton
    with pytest.raises(SessionRequired):
        run(server.get_user_id_from_request(fake_request(headers={"Authorization": "Bearer buyer_1"})))
    assert run(server.get_user_id_from_request(session("buyer", "b1"))) == "b1"


@needs_db
def test_private_routes(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(server, "db", db)
        try:
            await db.sellers.insert_one({
                "id": "s1", "whatsapp": "+237690000001", "name": "Ndop", "businessName": "Atelier",
                "email": "secret@shop.cm", "city": "Douala", "region": "Littoral", "address": "Akwa",
                "categories": [], "description": "Pagnes", "status": "approved", "password": "hash",
                "oauth_uid": "google-uid",
            })
            await db.orders.insert_one({"id": "o1", "buyerId": "b1", "sellerId": "s1", "totalAmount": 5000,
                                        "orderedDate": server.datetime.utcnow(), "products": [],
                                        "shippingAddress": "Rue 12, Bonapriso", "shippingPhone": "+237690000009"})
            await db.notifications.insert_one({"id": "n1", "recipient_id": "b1", "recipient_type": "buyer",
                                               "type": "x", "title": "t", "message": "m", "read": False})

            # Boutique publique : sans e-mail ni compte Google ni mot de passe
            public = await server.get_seller("s1", fake_request())
            assert public["businessName"] == "Atelier" and public["whatsapp"]
            for field in ("email", "oauth_uid", "password", "last_login"):
                assert field not in public
            listed = await server.list_sellers(fake_request())
            assert "email" not in listed[0] and "password" not in listed[0]
            # Le vendeur lui-même et l'équipe voient l'e-mail, jamais le mot de passe
            mine = await server.get_seller("s1", session("seller", "s1"))
            assert mine["email"] == "secret@shop.cm" and "password" not in mine
            staff_list = await server.list_sellers(session("admin", "a1", "admin"))
            assert staff_list[0]["email"] == "secret@shop.cm"

            # Adresses enregistrées d'un acheteur
            with pytest.raises(SessionRequired):
                await server.get_buyer_saved_info("b1", fake_request(headers={"X-User-Id": "b1"}))
            with pytest.raises(HTTPException) as err:
                await server.get_buyer_saved_info("b1", session("buyer", "b2"))
            assert err.value.status_code == 403
            saved = await server.get_buyer_saved_info("b1", session("buyer", "b1"))
            assert saved.addresses[0].phone == "+237690000009"

            # Chiffre d'affaires d'un vendeur
            with pytest.raises(SessionRequired):
                await server.get_seller_analytics("s1", fake_request())
            with pytest.raises(HTTPException):
                await server.get_seller_analytics("s1", session("seller", "s2"))

            # Notifications : celles de la session seulement
            with pytest.raises(SessionRequired):
                await server.get_notifications(fake_request(headers={"X-User-Id": "b1", "X-User-Type": "buyer"}))
            assert [n.id for n in await server.get_notifications(session("buyer", "b1"))] == ["n1"]
            assert await server.get_notifications(session("buyer", "b2")) == []
            with pytest.raises(HTTPException):
                await server.delete_notification("n1", session("buyer", "b2"))

            # Profil vendeur (e-mail, mot de passe) : pas de prise de compte par en-tête
            update = server.SellerUpdate(email="pirate@evil.cm")
            with pytest.raises(SessionRequired):
                await server.update_seller("s1", update, fake_request(headers={"X-Seller-Id": "s1"}), role=None)
            with pytest.raises(HTTPException) as err:
                await server.update_seller("s1", update, session("seller", "s2"), role=None)
            assert err.value.status_code == 403
            assert (await db.sellers.find_one({"id": "s1"}))["email"] == "secret@shop.cm"
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())
