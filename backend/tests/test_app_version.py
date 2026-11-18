"""Versions de l'app mobile (routers/app_version.py).

Le scénario avec base s'exécute sur une base MongoDB LOCALE jetable
(ignoré si MongoDB n'est pas lancé).
Lancer depuis backend/ :  python -m pytest tests/test_app_version.py
"""
import asyncio
import os
import sys

import pytest
from fastapi import Response
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402,F401  (avant les routeurs : ils importent server)
from routers import app_version  # noqa: E402

PlatformVersion = app_version.PlatformVersion


def _local_mongo():
    from pymongo import MongoClient
    try:
        MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500).server_info()
        return True
    except Exception:
        return False


needs_db = pytest.mark.skipif(not _local_mongo(), reason="pas de MongoDB local")


def test_defaults_force_nothing():
    s = app_version.AppVersionSettings()
    assert s.android.minBuild == 0 and s.android.latestBuild == 0
    assert s.android.storeUrl == app_version.PLAY_STORE_URL
    assert s.ios.storeUrl == ""


def test_minimum_cannot_exceed_recommended():
    with pytest.raises(ValidationError):
        PlatformVersion(minBuild=22, latestBuild=21, storeUrl="https://example.com")
    assert PlatformVersion(minBuild=21, latestBuild=21, storeUrl="https://example.com").minBuild == 21


def test_store_link_required_once_a_version_is_set():
    # Sans lien, l'app ne saurait pas où envoyer l'utilisateur
    with pytest.raises(ValidationError):
        PlatformVersion(latestBuild=21)
    with pytest.raises(ValidationError):
        PlatformVersion(latestBuild=21, storeUrl="http://example.com")
    assert PlatformVersion(latestBuild=21, storeUrl="  https://example.com ").storeUrl == "https://example.com"
    assert PlatformVersion().storeUrl == ""


def test_negative_build_rejected():
    with pytest.raises(ValidationError):
        PlatformVersion(minBuild=-1)


@needs_db
def test_saved_settings_are_served(monkeypatch):
    from motor.motor_asyncio import AsyncIOMotorClient

    async def scenario():
        client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
        db = client["nengoo_test_app_version"]
        monkeypatch.setattr(app_version, "db", db)
        try:
            response = Response()
            first = await app_version.get_app_version(response)
            assert first.android.minBuild == 0
            assert response.headers["Cache-Control"] == "public, max-age=60"

            await app_version.update_app_version(app_version.AppVersionSettings(
                android=PlatformVersion(minBuild=18, latestBuild=21, storeUrl=app_version.PLAY_STORE_URL),
                ios=PlatformVersion(latestBuild=21, storeUrl="https://apps.apple.com/app/id123"),
            ))
            saved = await app_version.get_app_version(Response())
            assert (saved.android.minBuild, saved.android.latestBuild) == (18, 21)
            assert saved.ios.storeUrl == "https://apps.apple.com/app/id123"
        finally:
            await client.drop_database("nengoo_test_app_version")
            client.close()

    asyncio.run(scenario())
