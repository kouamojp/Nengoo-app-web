"""Messagerie équipe Nengoo ↔ vendeurs / acheteurs (routers/support.py).

Le scénario s'exécute sur une base MongoDB LOCALE jetable (ignoré si MongoDB
n'est pas lancé). Lancer depuis backend/ :  python -m pytest tests/test_support_messages.py
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
from routers import support  # noqa: E402


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


def test_message_validation():
    assert support.SupportMessageIn(body="  Bonjour  ").body == "Bonjour"
    with pytest.raises(ValidationError):
        support.SupportMessageIn(body="   ")
    with pytest.raises(ValidationError):
        support.SupportMessageIn(body="x" * (support.MAX_LENGTH + 1))


def test_routes_need_a_session():
    # Le rôle admin n'existe que s'il vient du jeton (IdentityMiddleware) ;
    # sans lui, la garde des routes admin refuse
    with pytest.raises(HTTPException) as err:
        asyncio.run(server.support_or_higher_required(None))
    assert err.value.status_code == 403
    admin_routes = [r for r in support.router.routes if r.path.startswith("/admin/")]
    assert len(admin_routes) == 4
    for route in admin_routes:
        assert any(d.call is server.support_or_higher_required for d in route.dependant.dependencies)
    with pytest.raises(HTTPException) as err:
        asyncio.run(support.current_account(None, None))
    assert err.value.status_code == 401


@pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")
def test_support_flow(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(support, "db", db)
        monkeypatch.delenv("SUPPORT_ALERT_EMAILS", raising=False)
        sent = []

        class FakeMail:
            async def send_message(self, message, template_name=None):
                sent.append((template_name, message.recipients, message.template_body))

        monkeypatch.setattr(support, "fm", FakeMail())

        async def run(tasks):
            await tasks()
            emails = [(t, [str(r) for r in rec], body) for t, rec, body in sent]
            sent.clear()
            return emails

        def write(body, account):
            tasks = BackgroundTasks()
            return tasks, support.write_to_support(support.SupportMessageIn(body=body), tasks, account)

        def reply(user_type, user_id, body):
            tasks = BackgroundTasks()
            return tasks, support.admin_reply(user_type, user_id, support.SupportMessageIn(body=body), tasks, "a1")

        await db.sellers.insert_one({"id": "s1", "businessName": "Atelier Awa", "whatsapp": "+237690000001",
                                     "email": "awa@example.com"})
        await db.users.insert_one({"id": "b1", "type": "buyer", "name": "Paul", "whatsapp": "+15145550123"})
        await db.admins.insert_many([
            {"id": "a1", "name": "Marie (support)", "role": "support", "status": "active", "email": "marie@example.com"},
            {"id": "a2", "name": "Modo", "role": "moderator", "status": "active", "email": "modo@example.com"},
            {"id": "a3", "name": "Ancien", "role": "admin", "status": "suspended", "email": "old@example.com"},
        ])
        try:
            seller = ("seller", "s1")

            # Fil vide à l'ouverture : il n'apparaît pas encore dans la liste admin
            opened = await support.my_support_thread(seller)
            assert opened.messages == [] and opened.thread.userName == "Atelier Awa"
            assert await support.list_support_threads(None, False, None) == []

            tasks, call = write("Ma boutique est bloquée", seller)
            await call
            # Premier message en attente : l'équipe (support et plus, actifs) reçoit un e-mail
            [(template, recipients, body)] = await run(tasks)
            assert template == "support_message_team.html" and recipients == ["marie@example.com"]
            assert body["url"].endswith("/admin/dashboard?section=support&to=seller:s1")
            # Deuxième message avant lecture : pas de nouvel e-mail
            tasks, call = write("Vous êtes là ?", seller)
            await call
            assert await run(tasks) == []
            assert (await support.admin_support_unread())["count"] == 1
            threads = await support.list_support_threads(None, False, None)
            assert [t.userId for t in threads] == ["s1"] and threads[0].unreadByAdmin == 2
            assert [t.userId for t in await support.list_support_threads("buyer", False, None)] == []
            assert [t.userId for t in await support.list_support_threads(None, False, "awa")] == ["s1"]

            # L'admin ouvre (lu) puis répond : le vendeur a une notification
            view = await support.admin_open_thread("seller", "s1")
            assert view.thread.unreadByAdmin == 0 and len(view.messages) == 2
            tasks, call = reply("seller", "s1", "On regarde")
            answer = await call
            assert answer.senderName == "Marie (support)"
            [(template, recipients, body)] = await run(tasks)
            assert template == "support_message_user.html" and recipients == ["awa@example.com"]
            assert body["url"].endswith("/seller/support")
            tasks, call = reply("seller", "s1", "Encore un détail")
            await call
            assert await run(tasks) == []
            assert (await support.my_support_unread(seller))["count"] == 2
            notif = await db.notifications.find_one({"recipient_id": "s1"})
            assert notif["link"] == "/seller/support" and not notif["read"]

            # Le vendeur lit : compteur à zéro, notification lue, nom de l'admin masqué
            mine = await support.my_support_thread(seller)
            assert [m.body for m in mine.messages] == ["Ma boutique est bloquée", "Vous êtes là ?", "On regarde", "Encore un détail"]
            assert mine.messages[2].senderName == support.TEAM_NAME and mine.messages[2].senderId == "admin"
            # Fil lu puis nouveau message : l'équipe est de nouveau prévenue (adresse forcée par l'env)
            await support.admin_open_thread("seller", "s1")
            monkeypatch.setenv("SUPPORT_ALERT_EMAILS", "equipe@example.com, ops@example.com")
            tasks, call = write("Merci", seller)
            await call
            assert [r for _, r, _ in await run(tasks)] == [["equipe@example.com", "ops@example.com"]]
            assert (await support.my_support_unread(seller))["count"] == 0
            assert (await db.notifications.find_one({"recipient_id": "s1"}))["read"]

            # L'admin peut écrire le premier à un acheteur
            tasks, call = reply("buyer", "b1", "Bienvenue")
            await call
            assert await run(tasks) == []  # acheteur sans e-mail : pas d'alerte, mais la notification
            buyer_view = await support.my_support_thread(("buyer", "b1"))
            assert [m.body for m in buyer_view.messages] == ["Bienvenue"]
            assert (await db.notifications.find_one({"recipient_id": "b1"}))["link"] == "/profile?tab=support"

            # Compte inconnu
            with pytest.raises(HTTPException) as err:
                await support.admin_open_thread("buyer", "nobody")
            assert err.value.status_code == 404
            # Un vendeur ne peut pas se faire passer pour un acheteur en même temps
            with pytest.raises(HTTPException):
                await support.current_account("s1", "b1")
        finally:
            await client.drop_database(name)

    asyncio.run(scenario())


def test_alert_templates_escape_user_text():
    from jinja2 import Environment, FileSystemLoader
    # Même environnement que fastapi-mail (sans échappement automatique)
    env = Environment(loader=FileSystemLoader(server.conf.TEMPLATE_FOLDER))
    evil = '<script>alert(1)</script><a href="https://phish.example">clic</a>'
    team = env.get_template("support_message_team.html").render(
        name=evil, kind="Vendeur", whatsapp="+237690000001", message=evil, url="https://www.nengoo.com/admin")
    user = env.get_template("support_message_user.html").render(name=evil, message=evil, url="https://www.nengoo.com/x")
    for html in (team, user):
        assert "<script>" not in html and "phish.example\">" not in html
        assert "&lt;script&gt;" in html
