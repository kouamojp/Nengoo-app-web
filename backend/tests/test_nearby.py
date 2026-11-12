"""« Près de chez vous » : point de retrait le plus proche (routers/nearby.py).

Lancer depuis backend/ :  python -m pytest tests/test_nearby.py
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi import Response

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402  (avant les routeurs)
from geocode import distance_km  # noqa: E402
from routers import nearby  # noqa: E402

DOUALA = (4.0511, 9.7679)
YAOUNDE = (3.8480, 11.5021)


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


needs_db = pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")


def point(pid, city, coords=None, **extra):
    base = dict(id=pid, name=pid, address="Rue 1", city=city, region="R", managerName="M",
                managerWhatsApp="+237690000000", phone="1", email="a@b.c", hours="8h-18h",
                description="d", status="approved")
    if coords:
        base.update(latitude=coords[0], longitude=coords[1])
    base.update(extra)
    return base


def prod(pid, seller, **extra):
    base = dict(id=pid, name=pid, description="Description assez longue.", category="c", price=1000,
                sellerId=seller, sellerName=seller, stock=5, images=[], status="approved",
                createdAt=datetime.utcnow())
    base.update(extra)
    return base


def test_distance_douala_yaounde():
    assert 180 < distance_km(*DOUALA, *YAOUNDE) < 200
    assert distance_km(*DOUALA, *DOUALA) == 0


def test_points_sorted_by_distance():
    ranked = nearby.by_distance([point("yde", "Yaoundé", YAOUNDE), point("dla", "Douala", DOUALA)], *DOUALA)
    assert [p["id"] for p in ranked] == ["dla", "yde"]
    assert ranked[0]["distanceKm"] == 0


def test_rank_products():
    now = datetime.utcnow()
    ranked = nearby.rank_products([
        prod("old", "s", createdAt=now - timedelta(days=9)),
        prod("new", "s", createdAt=now),
        prod("best", "s", sold=12),
        prod("star", "s", featured=True),
        prod("empty", "s", stock=0),
    ])
    assert [p["id"] for p in ranked] == ["star", "best", "new", "old"]


@needs_db
def test_endpoint(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"
    calls = []

    async def fake_geocode(address, city, region=None):
        calls.append(city)
        return YAOUNDE if city == "Yaoundé" else None

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(nearby, "db", db)
        monkeypatch.setattr(server, "db", db)
        monkeypatch.setattr(server, "geocode", fake_geocode)
        try:
            await db.pickupPoints.insert_many([
                point("dla", "Douala", DOUALA),
                point("yde", "Yaoundé"),  # géocodé au passage
                point("lost", "Nulle-part"),  # introuvable : pas réessayé tout de suite
                point("off", "Douala", DOUALA, status="rejected"),
            ])
            await db.sellers.insert_many([
                {"id": "s_dla", "city": "DOUALA ", "whatsapp": "+237690000001", "businessName": "A"},
                {"id": "s_yde", "city": "Yaounde", "whatsapp": "+237690000002", "businessName": "B"},
            ])
            await db.products.insert_many([
                prod("p_dla", "s_dla"),
                prod("p_yde", "s_yde"),
                prod("p_pending", "s_yde", status="pending"),
            ])

            near_yaounde = (YAOUNDE[0] + 0.01, YAOUNDE[1])
            result = await nearby.get_nearby(Response(), lat=near_yaounde[0], lng=near_yaounde[1], limit=12)
            assert result.pickupPoint.id == "yde"
            assert 0 < result.pickupPoint.distanceKm < 2
            assert [p.id for p in result.pickupPoints] == ["yde", "dla"]  # rejeté et introuvable exclus
            assert [p.id for p in result.products] == ["p_yde"]  # ville sans accent ni casse
            stored = await db.pickupPoints.find_one({"id": "yde"})
            assert (stored["latitude"], stored["longitude"]) == YAOUNDE

            calls.clear()
            result = await nearby.get_nearby(Response(), lat=DOUALA[0], lng=DOUALA[1], limit=12)
            assert calls == []  # rien à géocoder de nouveau
            assert result.pickupPoint.id == "dla"
            assert [p.id for p in result.products] == ["p_dla"]

            # Admin : adresse modifiée → coordonnées recalculées ; saisies → gardées
            await server.update_pickup_point("dla", server.PickupPointUpdate(city="Yaoundé"))
            assert (await db.pickupPoints.find_one({"id": "dla"}))["latitude"] == YAOUNDE[0]
            await server.update_pickup_point("dla", server.PickupPointUpdate(latitude=4.1, longitude=9.7))
            assert (await db.pickupPoints.find_one({"id": "dla"}))["latitude"] == 4.1
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())


@needs_db
def test_no_point_located(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        monkeypatch.setattr(nearby, "db", client[name])
        try:
            result = await nearby.get_nearby(Response(), lat=DOUALA[0], lng=DOUALA[1], limit=12)
            assert result.pickupPoint is None and result.products == []
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())
