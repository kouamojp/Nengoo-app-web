"""Notifications push (push.py, routers/push.py).

Les scénarios avec base s'exécutent sur une base MongoDB LOCALE jetable
(ignorés si MongoDB n'est pas lancé). FCM est remplacé par un faux.
Lancer depuis backend/ :  python -m pytest tests/test_push.py
"""
import asyncio
import os
import sys
import uuid
from types import SimpleNamespace

import pytest
from fastapi import BackgroundTasks
from firebase_admin import exceptions as fb_exceptions, messaging
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402,F401  (avant les routeurs : ils importent server)
import push  # noqa: E402
from routers import push as push_routes  # noqa: E402


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


needs_db = pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")


def test_message_shape():
    msg = push.build_message(["t1"], "Titre", "Corps", {"link": "/seller/support", "type": None})
    assert msg.tokens == ["t1"]
    assert msg.notification.title == "Titre" and msg.notification.body == "Corps"
    assert msg.data == {"link": "/seller/support"}  # pas de None : FCM n'accepte que des chaînes
    assert msg.android.priority == "high" and msg.android.notification.channel_id == push.ANDROID_CHANNEL


def test_token_validation():
    with pytest.raises(ValidationError):
        push_routes.PushTokenIn(token="court")
    with pytest.raises(ValidationError):
        push_routes.PushTokenIn(token="x" * 30, platform="windows")
    assert push_routes.PushTokenIn(token="x" * 30).platform == "android"


def test_no_firebase_no_push(monkeypatch):
    # Sans compte de service Firebase : rien n'est tenté, rien ne casse
    monkeypatch.setattr(push, "is_firebase_initialized", lambda: False)
    assert asyncio.run(push.send_push(None, "buyer", "b1", "t", "b")) == 0


@needs_db
def test_tokens_and_sending(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"
    sent = []

    def fake_send(message):
        sent.append(message)
        results = []
        for token in message.tokens:
            if token.startswith("dead"):
                results.append(SimpleNamespace(success=False, exception=messaging.UnregisteredError("gone")))
            elif token.startswith("flaky"):
                results.append(SimpleNamespace(success=False, exception=fb_exceptions.UnavailableError("later")))
            else:
                results.append(SimpleNamespace(success=True, exception=None))
        return SimpleNamespace(responses=results, success_count=sum(r.success for r in results))

    monkeypatch.setattr(push, "is_firebase_initialized", lambda: True)
    monkeypatch.setattr(push.messaging, "send_each_for_multicast", fake_send)

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(push_routes, "db", db)
        token = lambda prefix: prefix + "-" + "x" * 30  # noqa: E731
        try:
            # Enregistrement, ré-enregistrement idempotent, changement de compte
            await push_routes.register_push_token(push_routes.PushTokenIn(token=token("ok1")), ("seller", "s1"))
            await push_routes.register_push_token(push_routes.PushTokenIn(token=token("ok1")), ("seller", "s1"))
            await push_routes.register_push_token(push_routes.PushTokenIn(token=token("dead1")), ("seller", "s1"))
            await push_routes.register_push_token(push_routes.PushTokenIn(token=token("flaky1")), ("seller", "s1"))
            await push_routes.register_push_token(push_routes.PushTokenIn(token=token("moved"), platform="ios"),
                                                  ("seller", "s1"))
            await push_routes.register_push_token(push_routes.PushTokenIn(token=token("moved"), platform="ios"),
                                                  ("buyer", "b1"))
            assert await db.push_tokens.count_documents({"userId": "s1"}) == 3
            assert (await db.push_tokens.find_one({"token": token("moved")}))["userId"] == "b1"

            # Envoi : les jetons morts disparaissent, les erreurs passagères restent
            ok = await push.send_push(db, "seller", "s1", "Nouvelle commande !", "x" * 500, "/seller/dashboard/orders",
                                      "order_created")
            assert ok == 1
            assert sorted(sent[0].tokens) == sorted([token("ok1"), token("dead1"), token("flaky1")])
            assert len(sent[0].notification.body) == 240
            assert sent[0].data == {"link": "/seller/dashboard/orders", "type": "order_created"}
            remaining = sorted(d["token"] for d in await db.push_tokens.find({"userId": "s1"}).to_list(10))
            assert remaining == sorted([token("ok1"), token("flaky1")])

            # Compte sans appareil : pas d'appel à FCM
            sent.clear()
            assert await push.send_push(db, "buyer", "nobody", "t", "b") == 0 and sent == []

            # notify : cloche + push en tâche de fond
            tasks = BackgroundTasks()
            await push.notify(db, {"id": "n1", "recipient_id": "b1", "recipient_type": "buyer", "type": "new_message",
                                   "title": "Nouveau message de l'équipe Nengoo", "message": "Bonjour",
                                   "link": "/profile?tab=support", "read": False}, tasks)
            assert await db.notifications.count_documents({"id": "n1"}) == 1
            assert sent == []  # pas avant la fin de la requête
            await tasks()
            assert [m.tokens for m in sent] == [[token("moved")]]
            assert sent[0].data["link"] == "/profile?tab=support"

            # Déconnexion : l'appareil ne reçoit plus rien
            await push_routes.unregister_push_token(push_routes.PushTokenOut(token=token("moved")))
            assert await db.push_tokens.count_documents({"userId": "b1"}) == 0

            # Limite d'appareils par compte : les plus anciens partent
            for i in range(push.MAX_TOKENS_PER_ACCOUNT + 3):
                await push_routes.register_push_token(push_routes.PushTokenIn(token=token(f"dev{i:02d}")),
                                                      ("buyer", "b2"))
            kept = await db.push_tokens.find({"userId": "b2"}).to_list(100)
            assert len(kept) == push.MAX_TOKENS_PER_ACCOUNT
            assert token("dev00") not in {d["token"] for d in kept}
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())
