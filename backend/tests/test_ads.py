"""Bannières publicitaires (routers/ads.py).

Les scénarios avec base s'exécutent sur une base MongoDB LOCALE jetable
(ignorés si MongoDB n'est pas lancé).
Lancer depuis backend/ :  python -m pytest tests/test_ads.py
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Response
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402  (avant les routeurs : ils importent server)
from routers import ads  # noqa: E402

IMG = "https://bucket.s3.eu-west-3.amazonaws.com/uploads/a.webp"
IMG_M = "https://bucket.s3.eu-west-3.amazonaws.com/uploads/m.webp"


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


needs_db = pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")


def banner(**overrides):
    data = dict(title="Promo rentrée", placement="home_middle", imageDesktop=IMG, imageMobile=IMG_M,
                alt="Fournitures scolaires à -20 %", link="/catalog/Fournitures")
    data.update(overrides)
    return ads.AdBannerIn(**data)


def request(ua="Mozilla/5.0", admin=None):
    headers = {"user-agent": ua}
    if admin:
        headers["x-admin-id"] = admin
    return SimpleNamespace(headers=headers)


def test_validation():
    assert banner().link == "/catalog/Fournitures"
    assert banner(link=" https://partenaire.cm/offre ").link == "https://partenaire.cm/offre"
    for bad in ["javascript:alert(1)", "//evil.com", "", "ftp://x"]:
        with pytest.raises(ValidationError):
            banner(link=bad)
    with pytest.raises(ValidationError):
        banner(imageDesktop="http://non-securise/a.png")
    with pytest.raises(ValidationError):
        banner(imageDesktop=None)  # le site a besoin de l'image large
    with pytest.raises(ValidationError):
        banner(placement="sidebar")
    with pytest.raises(ValidationError):
        banner(weight=11)
    start = datetime(2026, 12, 1)
    with pytest.raises(ValidationError):
        banner(startsAt=start, endsAt=start)


def test_placement_rules():
    # App : une seule image, la mobile (l'image large sert de repli)
    app = banner(placement="app_home", imageMobile=None)
    assert app.imageMobile == IMG and app.imageDesktop is None
    # Ciblage par catégorie : seulement sur les pages catégorie
    assert banner(categories=["cat_1"]).categories == []
    assert banner(placement="category_top", categories=["cat_2", " cat_1 ", "cat_2"]).categories == ["cat_1", "cat_2"]


def test_dates_stored_in_utc():
    ad = banner(startsAt=datetime(2026, 12, 1, 9, 0, tzinfo=timezone(timedelta(hours=1))))
    assert ad.startsAt == datetime(2026, 12, 1, 8, 0) and ad.startsAt.tzinfo is None


def test_phase():
    now = datetime(2026, 11, 11, 12)
    assert ads._phase({"status": "paused"}, now) == "paused"
    assert ads._phase({"status": "active", "startsAt": now + timedelta(hours=1)}, now) == "scheduled"
    assert ads._phase({"status": "active", "endsAt": now}, now) == "ended"
    assert ads._phase({"status": "active", "startsAt": now - timedelta(days=1), "endsAt": None}, now) == "running"


@needs_db
def test_campaign_lifecycle(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient
    name = f"nengoo_pytest_{uuid.uuid4().hex[:6]}"

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client[name]
        monkeypatch.setattr(ads, "db", db)
        ads.clear_cache()
        now = datetime.utcnow()
        try:
            await ads.ensure_indexes()
            home = await ads.admin_create_ad(banner(weight=3), request(admin="admin_1"))
            assert home["phase"] == "running" and home["createdBy"] == "admin_1" and home["views"] == 0
            targeted = await ads.admin_create_ad(
                banner(placement="category_top", categories=["cat_mode"], title="Mode"), request())
            everywhere = await ads.admin_create_ad(banner(placement="category_top", title="Partout"), request())
            await ads.admin_create_ad(banner(title="Plus tard", startsAt=now + timedelta(days=2)), request())
            await ads.admin_create_ad(banner(title="Fini", endsAt=now - timedelta(minutes=1)), request())
            await ads.admin_create_ad(banner(title="Pause", status="paused"), request())

            # Public : seulement les campagnes en cours, sans les champs internes
            response = Response()
            shown = await ads.list_running_ads(response, "home_middle")
            assert [a["id"] for a in shown] == [home["id"]]
            assert set(shown[0]) == {"id", "placement", "imageDesktop", "imageMobile", "alt", "link", "weight"}
            assert shown[0]["weight"] == 3
            assert "max-age" in response.headers["Cache-Control"]

            # Ciblage : sans catégorie ciblée, la campagne ciblée n'apparaît pas
            ids = lambda items: {a["id"] for a in items}  # noqa: E731
            assert ids(await ads.list_running_ads(Response(), "category_top")) == {everywhere["id"]}
            assert ids(await ads.list_running_ads(Response(), "category_top", "cat_mode")) == {targeted["id"], everywhere["id"]}
            assert ids(await ads.list_running_ads(Response(), "category_top", "cat_x,cat_mode")) == {targeted["id"], everywhere["id"]}
            assert ids(await ads.list_running_ads(Response(), "category_top", "cat_tech")) == {everywhere["id"]}

            # Une modification vide le cache : la pause est immédiate
            await ads.admin_set_ad_status(home["id"], ads.AdStatusIn(status="paused"))
            assert await ads.list_running_ads(Response(), "home_middle") == []
            await ads.admin_set_ad_status(home["id"], ads.AdStatusIn(status="active"))

            # Vues et clics, agrégés par jour ; les robots ne comptent pas
            for _ in range(4):
                await ads.count_impression(home["id"], request())
            await ads.count_impression(home["id"], request(ua="Googlebot/2.1"))
            await ads.count_click(home["id"], request())
            with pytest.raises(HTTPException) as missing:
                await ads.count_click("ad_inconnue", request())
            assert missing.value.status_code == 404
            assert await db.ad_stats.count_documents({}) == 1

            listed = {a["id"]: a for a in await ads.admin_list_ads()}
            assert len(listed) == 6
            assert (listed[home["id"]]["views"], listed[home["id"]]["clicks"]) == (4, 1)
            assert {a["phase"] for a in listed.values()} == {"running", "scheduled", "ended", "paused"}
            assert len(await ads.admin_list_ads("category_top")) == 2

            stats = await ads.admin_ad_stats(home["id"], days=7)
            assert len(stats["days"]) == 7 and stats["days"][-1] == {"day": ads._today(), "views": 4, "clicks": 1}
            assert stats["period"] == stats["total"] == {"views": 4, "clicks": 1}

            # App : nouvelle route et ancienne route des versions déjà installées
            app_ad = await ads.admin_create_ad(
                banner(placement="app_home", imageDesktop=None, link="/catalog/Mode", title="App"), request())
            assert [a["id"] for a in await ads.list_running_ads(Response(), "app_home")] == [app_ad["id"]]
            legacy = await server.get_active_ads()
            assert [(a.id, a.imageUrl, a.linkUrl, a.isActive) for a in legacy] == [
                (app_ad["id"], IMG_M, "https://www.nengoo.com/catalog/Mode", True)]

            # Modification complète puis suppression (statistiques comprises)
            updated = await ads.admin_update_ad(home["id"], banner(title="Promo Noël", link="https://partenaire.cm"))
            assert updated["title"] == "Promo Noël" and updated["views"] == 4
            await ads.admin_delete_ad(home["id"])
            assert await db.ad_stats.count_documents({"adId": home["id"]}) == 0
            with pytest.raises(HTTPException):
                await ads.admin_update_ad(home["id"], banner())
        finally:
            ads.clear_cache()
            await client.drop_database(name)

    asyncio.run(scenario())


def test_admin_routes_guarded():
    guarded = {r.path for r in ads.router.routes
               if any(d.dependency is server.admin_or_higher_required for d in r.dependencies)}
    admin_paths = {r.path for r in ads.router.routes if r.path.startswith("/admin/")}
    assert admin_paths and admin_paths <= guarded
    public = {r.path for r in ads.router.routes} - admin_paths
    assert all("ads" not in path for path in public)  # bloqueurs de publicité


def test_feed_placements():
    """Entre les produits : 4 bannières au plus par page, ciblables par catégorie."""
    for key in ("feed", "app_feed"):
        spec = ads.PLACEMENTS[key]
        assert spec["perPage"] == ads.FEED_PER_PAGE == 4 and spec["targetable"]
    # Site : multiple de 2, 3 et 4 colonnes (pas de rangée à moitié vide)
    assert ads.PLACEMENTS["feed"]["every"] % 12 == 0
    assert banner(placement="feed", categories=["cat_1"]).categories == ["cat_1"]
    app = banner(placement="app_feed", imageMobile=None)
    assert app.imageDesktop is None and app.imageMobile == IMG

