"""Code de retrait à 6 chiffres : le vendeur ne le voit pas et le valide à la remise.

Les scénarios s'exécutent sur une base MongoDB LOCALE jetable (ignorés sans MongoDB).
Lancer depuis backend/ :  python -m pytest tests/test_handover_code.py
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
from sms import order_created_text  # noqa: E402


def test_sms_carries_the_code():
    text = order_created_text("ord_1", 5000, "Atelier", "123456")
    assert "123456" in text and len(text) <= 160


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


def request():
    return Request({"type": "http", "headers": [], "client": ("10.0.0.9", 1)})


@pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")
def test_seller_validates_pickup_with_code(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"
    login_limiter.reset()

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(server, "db", db)
        try:
            await db.sellers.insert_one({"id": "s1", "businessName": "Atelier"})
            await db.products.insert_one({"id": "p1", "name": "Robe", "price": 10000, "stock": 5, "status": "approved",
                                          "sellerId": "s1", "sellerName": "Atelier", "images": ["a.jpg"]})
            await db.pickupPoints.insert_one({"id": "pp1", "name": "Akwa"})
            tasks = BackgroundTasks()
            [order] = await server.process_checkout(server.CheckoutRequest(
                firstName="Awa", phone="+237690000001", paymentMethod="cashOnDelivery", deliveryOption="pickup",
                selectedPickupPoint="pp1", cartItems=[server.CheckoutProduct(id="p1", quantity=1)]), tasks)
            assert len(order.deliveryCode) == 6 and order.deliveryCode.isdigit()

            # Le vendeur ne peut pas déclarer la commande livrée sans le code
            with pytest.raises(HTTPException) as err:
                await server.update_order(order.id, server.OrderUpdate(status="delivered"), tasks, None, "s1")
            assert "code de retrait" in err.value.detail

            wrong = "000000" if order.deliveryCode != "000000" else "111111"
            with pytest.raises(HTTPException) as err:
                await server.confirm_handover(order.id, server.HandoverCode(code=wrong), request(), tasks, "s1")
            assert "incorrect" in err.value.detail

            spaced = f"{order.deliveryCode[:3]} {order.deliveryCode[3:]}"
            done = await server.confirm_handover(order.id, server.HandoverCode(code=spaced), request(), tasks, "s1")
            assert done.status == "delivered" and done.deliveryCode is None
            assert done.pickupStatus == "picked_up" and done.handedOverBy == "seller"
            saved = await db.orders.find_one({"id": order.id})
            assert saved["statusHistory"][-1]["by"] == "seller"

            with pytest.raises(HTTPException):
                await server.confirm_handover(order.id, server.HandoverCode(code=order.deliveryCode), request(), tasks, "s1")
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())
