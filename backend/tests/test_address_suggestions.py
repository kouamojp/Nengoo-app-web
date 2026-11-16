"""Suggestions d'adresses du formulaire des points de retrait (geocode.suggest).

Lancer depuis backend/ :  python -m pytest tests/test_address_suggestions.py
"""
import asyncio
import os
import sys

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import geocode  # noqa: E402
import server  # noqa: E402


def feature(lon, lat, **props):
    return {"type": "Feature", "properties": {"countrycode": "CM", **props},
            "geometry": {"type": "Point", "coordinates": [lon, lat]}}


AKWA = feature(9.69633, 4.052544, name="Akwa", type="district", city="Douala I",
               county="Wouri", state="Région du Littoral")
BASTOS = feature(11.511543, 3.892355, name="Carrefour Bastos", street="Rue 1.771", district="Bastos",
                 city="Yaoundé IIIe", state="Région du Centre")
ABROAD = dict(feature(9.2, 4.1, name="Ailleurs", city="Calabar"), properties={"countrycode": "NG", "name": "Ailleurs"})


@pytest.fixture(autouse=True)
def fresh_cache(monkeypatch):
    monkeypatch.setattr(geocode, "_suggest_cache", {})
    monkeypatch.setattr(geocode, "SUGGEST_MIN_INTERVAL", 0)


def test_city_and_region_in_nengoo_form():
    assert geocode.clean_city("Douala I") == "Douala"
    assert geocode.clean_city("Yaoundé IIIe") == "Yaoundé"
    assert geocode.clean_city("yaounde 6") == "Yaoundé"
    assert geocode.clean_city("Bafoussam") == "Bafoussam"
    assert geocode.clean_region("Région du Littoral") == "Littoral"
    assert geocode.clean_region("Région de l'Extrême-Nord") == "Extrême-Nord"
    assert geocode.clean_region("Centre") == "Centre"


def test_suggestions_are_readable_and_located():
    items = geocode.parse_photon([AKWA, BASTOS, ABROAD, AKWA])
    assert items == [
        {"address": "Akwa", "city": "Douala", "region": "Littoral", "label": "Akwa, Douala",
         "latitude": 4.052544, "longitude": 9.69633},
        {"address": "Carrefour Bastos, Rue 1.771, Bastos", "city": "Yaoundé", "region": "Centre",
         "label": "Carrefour Bastos, Rue 1.771, Bastos, Yaoundé", "latitude": 3.892355, "longitude": 11.511543},
    ]


def test_short_input_and_cache(monkeypatch):
    calls = []

    def fake_photon(query):
        calls.append(query)
        return [AKWA]

    monkeypatch.setattr(geocode, "_photon", fake_photon)
    assert asyncio.run(geocode.suggest("ak")) == []
    assert asyncio.run(geocode.suggest("  Akwa   Douala ")) [0]["city"] == "Douala"
    asyncio.run(geocode.suggest("akwa douala"))
    assert calls == ["Akwa Douala"]


def test_endpoint_reports_unavailable_service(monkeypatch):
    def down(query):
        raise ConnectionError("réseau")

    monkeypatch.setattr(geocode, "_photon", down)
    with pytest.raises(HTTPException) as err:
        asyncio.run(server.address_suggestions(q="Akwa"))
    assert err.value.status_code == 503

    monkeypatch.setattr(geocode, "_photon", lambda q: [BASTOS])
    assert asyncio.run(server.address_suggestions(q="Bastos"))["items"][0]["region"] == "Centre"
