"""Livraison (phase 5) : frais par zone, devis, livreurs, code de remise.

Les scénarios s'exécutent sur une base MongoDB LOCALE jetable (ignorés sans MongoDB).
Lancer depuis backend/ :  python -m pytest tests/test_delivery_phase5.py
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
from delivery import new_delivery_code, seller_fee, zone_fee  # noqa: E402

SETTINGS = {
    "zones": [
        {"city": "Douala", "fee": 1500, "neighborhoods": [{"name": "Akwa", "fee": 1000}]},
        {"city": "Yaoundé", "fee": 2000, "neighborhoods": []},
    ],
    "freeAbove": 50000,
    "standardFee": 2500,
}


def test_zone_fee():
    zones = SETTINGS["zones"]
    assert zone_fee(zones, "DOUALA ", "akwa") == 1000      # quartier, écriture libre
    assert zone_fee(zones, "Douala", "Bonapriso") == 1500  # ville
    assert zone_fee(zones, "yaounde", None) == 2000        # accents
    assert zone_fee(zones, "Kribi", "Centre") is None      # ville non réglée
    assert zone_fee(zones, None, None) is None


def test_seller_fee_rules():
    fee = lambda seller, subtotal, city="Douala", area=None, pickup=False: seller_fee(  # noqa: E731
        seller, subtotal, SETTINGS, SETTINGS["standardFee"], city, area, pickup)
    assert fee({}, 10000, area="Akwa") == 1000
    assert fee({}, 10000, city="Kribi") == 2500             # tarif standard
    assert fee({"deliveryPrice": 500}, 10000) == 500        # tarif du vendeur d'abord
    assert fee({"deliveryPrice": 0}, 10000) == 0            # livraison offerte par le vendeur
    assert fee({}, 60000) == 0                              # au-delà du seuil
    assert fee({}, 10000, pickup=True) == 0                 # point de retrait


def test_delivery_code():
    codes = {new_delivery_code() for _ in range(50)}
    assert all(len(c) == 4 and c.isdigit() for c in codes) and len(codes) > 1


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


def request():
    return Request({"type": "http", "headers": [], "client": ("10.0.0.7", 1)})


@pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")
def test_quote_courier_and_proof(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"
    login_limiter.reset()

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(server, "db", db)
        try:
            await db.sellers.insert_many([{"id": "s1", "businessName": "Atelier"},
                                          {"id": "s2", "businessName": "Boutique", "deliveryPrice": 700}])
            await db.products.insert_many([
                {"id": "p1", "name": "Robe", "price": 10000, "stock": 5, "status": "approved", "sellerId": "s1",
                 "sellerName": "Atelier", "images": ["a.jpg"]},
                {"id": "p2", "name": "Sac", "price": 8000, "promoPrice": 6000, "stock": 5, "status": "approved",
                 "sellerId": "s2", "sellerName": "Boutique", "images": ["b.jpg"]},
            ])
            await server.update_delivery_zones(server.DeliveryZones(**{
                "zones": [{"city": "douala", "fee": 1500, "neighborhoods": [{"name": " Akwa ", "fee": 1000}]}],
                "freeAbove": 50000}))
            assert (await server.get_delivery_zones()).zones[0].city == "Douala"

            items = [server.CheckoutProduct(id="p1", quantity=2), server.CheckoutProduct(id="p2", quantity=1)]
            quote = await server.delivery_quote(server.DeliveryQuoteRequest(city="Douala", neighborhood="akwa", cartItems=items))
            assert quote["subtotal"] == 26000 and quote["shipping"] == 1000 + 700 and quote["total"] == 27700
            pickup = await server.delivery_quote(server.DeliveryQuoteRequest(deliveryOption="pickup", cartItems=items))
            assert pickup["shipping"] == 0

            # La commande applique le même calcul et donne un code au client
            tasks = BackgroundTasks()
            orders = await server.process_checkout(server.CheckoutRequest(
                firstName="Awa", phone="+237690000001", city="Douala", neighborhood="Akwa",
                paymentMethod="cashOnDelivery", deliveryOption="home", cartItems=items), tasks)
            assert sorted(o.shippingCost for o in orders) == [700, 1000]
            order = next(o for o in orders if o.sellerId == "s1")
            assert len(order.deliveryCode) == 4

            # Livreur : création, attribution, page par lien secret
            courier = await server.create_courier(server.CourierInput(name="Jean", phone="690000002", city="douala"))
            assert courier.city == "Douala" and len(courier.token) > 20
            await server.assign_courier(order.id, server.CourierAssignment(courierId=courier.id))
            page = await server.courier_orders(courier.token)
            assert [o["id"] for o in page["orders"]] == [order.id]
            assert "deliveryCode" not in page["orders"][0]
            assert page["orders"][0]["amountToCollect"] == order.totalAmount
            with pytest.raises(HTTPException):
                await server.courier_orders("mauvais-lien")

            await server.courier_update(courier.token, order.id, server.CourierAction(action="start"), request(), tasks)
            failed = await server.courier_update(courier.token, order.id,
                                                 server.CourierAction(action="failed", note="Client absent"), request(), tasks)
            assert failed["attempts"] == 1 and failed["status"] == "out_for_delivery"
            with pytest.raises(HTTPException) as err:
                await server.courier_update(courier.token, order.id,
                                            server.CourierAction(action="delivered", code="0000" if order.deliveryCode != "0000" else "1111"),
                                            request(), tasks)
            assert "incorrect" in err.value.detail
            done = await server.courier_update(courier.token, order.id,
                                               server.CourierAction(action="delivered", code=order.deliveryCode), request(), tasks)
            assert done["status"] == "delivered"
            saved = await db.orders.find_one({"id": order.id})
            assert saved["statusHistory"][-1]["by"] == "courier:Jean"
            assert (await server.courier_orders(courier.token))["orders"] == []

            # Le client voit son code et son livreur dans le suivi
            tracked = await server.track_order(request(), orderId=order.id, phone="690000001")
            assert tracked["deliveryCode"] == order.deliveryCode and tracked["courierName"] == "Jean"

            # Un livreur avec des livraisons en cours ne peut pas être supprimé
            other = next(o for o in orders if o.sellerId == "s2")
            await server.assign_courier(other.id, server.CourierAssignment(courierId=courier.id))
            with pytest.raises(HTTPException):
                await server.delete_courier(courier.id)
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())
