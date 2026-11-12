"""Messagerie acheteur ↔ vendeur (routers/chat.py).

Le scénario s'exécute sur une base MongoDB LOCALE jetable (ignoré si MongoDB
n'est pas lancé). Lancer depuis backend/ :  python -m pytest tests/test_chat.py
"""
import asyncio
import os
import sys
import uuid

import pytest
from fastapi import BackgroundTasks, HTTPException
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402
from routers import chat  # noqa: E402
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


def test_validation_and_identity():
    assert chat.MessageIn(body="  Bonjour  ").body == "Bonjour"
    with pytest.raises(ValidationError):
        chat.MessageIn(body="  ")
    with pytest.raises(ValidationError):
        chat.MessageIn(body="x" * (chat.MAX_LENGTH + 1))
    # Identité : seulement le jeton ; un en-tête seul ne suffit pas
    with pytest.raises(SessionRequired):
        chat.current_party(fake_request(headers={"X-Buyer-Id": "b1"}))
    with pytest.raises(HTTPException):
        chat.current_party(session("admin", "a1", "super_admin"))
    assert chat.current_party(session("buyer", "b1")) == ("buyer", "b1")
    # Routes d'équipe protégées
    for route in chat.router.routes:
        if route.path.startswith("/admin/"):
            assert any(d.call is server.moderator_or_higher_required for d in route.dependant.dependencies)


@needs_db
def test_chat_flow(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(chat, "db", db)
        pushed = []

        async def fake_notify(_db, notification, _tasks=None):
            pushed.append(notification)
        monkeypatch.setattr(chat, "notify", fake_notify)
        try:
            await chat.ensure_indexes()
            await db.users.insert_many([
                {"id": "b1", "type": "buyer", "name": "Awa"},
                {"id": "b2", "type": "buyer", "name": "Intrus"},
            ])
            await db.sellers.insert_many([
                {"id": "s1", "businessName": "Atelier Ndop", "status": "approved", "email": "s1@shop.cm",
                 "logoUrl": "https://cdn/logo.webp"},
                {"id": "s2", "businessName": "Autre", "status": "approved"},
                {"id": "s_pending", "businessName": "En attente", "status": "pending"},
            ])
            await db.products.insert_many([
                {"id": "p1", "sellerId": "s1", "name": "Pagne", "price": 8000, "images": ["https://cdn/p1.jpg"]},
                {"id": "p_other", "sellerId": "s2", "name": "Ailleurs", "price": 1},
            ])
            buyer, seller, intruder = ("buyer", "b1"), ("seller", "s1"), ("buyer", "b2")

            # Premier message de l'acheteur, avec la carte du produit
            tasks = BackgroundTasks()
            opened = await chat.start_thread(
                chat.NewThreadIn(sellerId="s1", productId="p1", body="Il reste du bleu ?"), tasks, buyer)
            tid = opened.thread.id
            assert opened.thread.otherName == "Atelier Ndop"
            assert opened.thread.otherLogo == "https://cdn/logo.webp"
            assert opened.messages[0].product.name == "Pagne"
            # Vendeur prévenu : cloche/push + un e-mail
            assert pushed[-1]["recipient_id"] == "s1" and pushed[-1]["type"] == "chat_message"
            assert len(tasks.tasks) == 1

            # Deuxième message sans réponse : pas de second e-mail
            tasks = BackgroundTasks()
            await chat.write(tid, chat.MessageIn(body="Et en vert ?"), tasks, buyer)
            assert len(tasks.tasks) == 0
            # Carte d'un produit d'une autre boutique ignorée
            msg = await chat.write(tid, chat.MessageIn(body="Et ça ?", productId="p_other"), BackgroundTasks(), buyer)
            assert msg.product is None
            # Un second « premier message » reprend le même fil
            again = await chat.start_thread(chat.NewThreadIn(sellerId="s1", body="Toujours là ?"),
                                            BackgroundTasks(), buyer)
            assert again.thread.id == tid

            # Vendeur : non-lus, lecture, réponse
            assert (await chat.my_unread(seller))["count"] == 4
            assert [t.id for t in await chat.my_threads(seller)] == [tid]
            seen = await chat.open_thread(tid, seller)
            assert seen.thread.otherName == "Awa" and seen.thread.unread == 0
            assert (await chat.my_unread(seller))["count"] == 0
            await chat.write(tid, chat.MessageIn(body="Oui, en bleu et en vert."), BackgroundTasks(), seller)
            assert (await chat.my_unread(buyer))["count"] == 1
            assert pushed[-1]["recipient_id"] == "b1"

            # Personne d'autre ne lit ni n'écrit dans le fil
            for call in (chat.open_thread(tid, intruder),
                         chat.write(tid, chat.MessageIn(body="hack"), BackgroundTasks(), intruder),
                         chat.open_thread(tid, ("seller", "s2")),
                         chat.block(tid, chat.BlockIn(blocked=True), intruder)):
                with pytest.raises(HTTPException) as err:
                    await call
                assert err.value.status_code == 404

            # Un vendeur n'ouvre pas de fil ; boutique non validée introuvable
            with pytest.raises(HTTPException):
                await chat.start_thread(chat.NewThreadIn(sellerId="s2", body="Salut"), BackgroundTasks(), seller)
            with pytest.raises(HTTPException) as err:
                await chat.start_thread(chat.NewThreadIn(sellerId="s_pending", body="Salut"), BackgroundTasks(), buyer)
            assert err.value.status_code == 404

            # Signalement : l'équipe lit le fil signalé
            await chat.report(tid, chat.ReportIn(reason="fraud", details="Demande d'avance"), seller)
            reports = await chat.list_reports("open")
            assert reports[0]["reportedId"] == "b1"
            detail = await chat.open_report(reports[0]["id"])
            assert len(detail["messages"]) == 5
            assert reports[0]["reporterName"] == "Atelier Ndop" and not reports[0]["threadClosed"]
            assert (await chat.open_reports_count())["count"] == 1
            # L'équipe ferme la conversation : plus personne n'y écrit
            await chat.update_report(reports[0]["id"], chat.ReportStatusIn(status="resolved", closeThread=True))
            assert await chat.list_reports("open") == []
            assert (await chat.list_reports("resolved"))[0]["threadClosed"]
            assert (await chat.open_thread(tid, buyer)).thread.blockedByOther
            with pytest.raises(HTTPException) as err:
                await chat.write(tid, chat.MessageIn(body="Allô ?"), BackgroundTasks(), seller)
            assert err.value.status_code == 403
            await chat.update_report(reports[0]["id"], chat.ReportStatusIn(status="resolved", closeThread=False))
            assert not (await chat.open_thread(tid, buyer)).thread.blockedByOther

            # Blocage : plus personne n'écrit
            blocked = await chat.block(tid, chat.BlockIn(blocked=True), seller)
            assert blocked.blockedByMe
            assert (await chat.open_thread(tid, buyer)).thread.blockedByOther
            with pytest.raises(HTTPException) as err:
                await chat.write(tid, chat.MessageIn(body="Allô ?"), BackgroundTasks(), buyer)
            assert err.value.status_code == 403
            await chat.block(tid, chat.BlockIn(blocked=False), seller)

            # Anti-spam
            monkeypatch.setattr(chat, "RATE_LIMIT", 6)
            with pytest.raises(HTTPException) as err:
                for i in range(10):
                    await chat.write(tid, chat.MessageIn(body=f"spam {i}"), BackgroundTasks(), buyer)
            assert err.value.status_code == 429
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())
