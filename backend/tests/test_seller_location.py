"""Position GPS des boutiques : choisie parmi les adresses proposées, sinon
calculée depuis l'adresse après la réponse (locate_seller).

Base MongoDB LOCALE jetable (ignoré si MongoDB n'est pas lancé), géocodage
remplacé par une fonction de test : aucun appel réseau.
Lancer depuis backend/ :  python -m pytest tests/test_seller_location.py
"""
import asyncio
import os
import sys
import uuid

import pytest
from fastapi import BackgroundTasks

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

SELLER = dict(whatsapp="+237690000001", password="secret1", name="Awa", businessName="Chez Awa",
              email="awa@example.cm", city="Douala", region="Littoral", address="Akwa, rue Joss",
              description="Cuisine camerounaise", restaurant=True)


async def run_tasks(tasks: BackgroundTasks):
    for task in tasks.tasks:
        await task.func(*task.args, **task.kwargs)


@needs_db
def test_seller_position(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"
    calls = []

    async def fake_geocode(address, city, region=None):
        calls.append(address)
        return (4.05, 9.70)

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(server, "db", db)
        monkeypatch.setattr(server, "geocode", fake_geocode)
        try:
            # Proposition choisie : position gardée, pas de géocodage
            tasks = BackgroundTasks()
            chosen = await server.create_seller(
                server.SellerCreate(**SELLER, latitude=4.0511, longitude=9.7679), tasks, role="admin")
            await run_tasks(tasks)
            stored = await db.sellers.find_one({"id": chosen.id})
            assert (stored["latitude"], stored["longitude"]) == (4.0511, 9.7679)
            assert calls == []

            # Adresse saisie à la main : calculée après la réponse
            tasks = BackgroundTasks()
            typed = await server.create_seller(
                server.SellerCreate(**{**SELLER, "whatsapp": "+237690000002", "email": "b@example.cm"}),
                tasks, role=None)
            assert typed.latitude is None
            await run_tasks(tasks)
            stored = await db.sellers.find_one({"id": typed.id})
            assert (stored["latitude"], stored["longitude"]) == (4.05, 9.70)
            assert stored["geocodedAt"] is not None

            # Adresse modifiée sans nouvelle position : recalculée
            calls.clear()
            tasks = BackgroundTasks()
            await server.update_seller(chosen.id, server.SellerUpdate(address="Bonapriso"), None, tasks,
                                       role="super_admin")
            assert (await db.sellers.find_one({"id": chosen.id}))["latitude"] is None
            await run_tasks(tasks)
            assert calls == ["Bonapriso"]
            assert (await db.sellers.find_one({"id": chosen.id}))["latitude"] == 4.05

            # Nouvelle adresse avec sa position : gardée telle quelle
            calls.clear()
            tasks = BackgroundTasks()
            await server.update_seller(chosen.id, server.SellerUpdate(address="Bali", latitude=4.04, longitude=9.69),
                                       None, tasks, role="super_admin")
            await run_tasks(tasks)
            stored = await db.sellers.find_one({"id": chosen.id})
            assert (stored["latitude"], stored["longitude"], calls) == (4.04, 9.69, [])

            # Autre champ modifié : la position ne bouge pas
            tasks = BackgroundTasks()
            await server.update_seller(chosen.id, server.SellerUpdate(deliveryPrice=1000), None, tasks,
                                       role="super_admin")
            assert tasks.tasks == []
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())
