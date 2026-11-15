"""Modification de son profil par un client (PUT /api/buyers/me).

Lancer depuis backend/ :  python -m pytest tests/test_buyer_profile.py
"""
import asyncio
import os
import re
import sys

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from buyer_profile import BuyerSelfUpdate, update_own_profile  # noqa: E402


def digits(value):
    return re.sub(r"\D", "", value or "")[-9:]


class FakeUsers:
    """Le strict nécessaire des requêtes Mongo utilisées par buyer_profile."""

    def __init__(self, docs):
        self.docs = [dict(d) for d in docs]

    def _match(self, doc, query):
        for key, value in query.items():
            if key == "type" and doc.get("type") != value:
                return False
            if key == "id":
                if isinstance(value, dict):
                    if doc.get("id") == value["$ne"]:
                        return False
                elif doc.get("id") != value:
                    return False
            if key == "email" and not re.match(value["$regex"], doc.get("email") or "", re.I):
                return False
            if key == "whatsapp_digits" and digits(doc.get("whatsapp")) != value:
                return False
        return True

    async def find_one(self, query):
        return next((dict(d) for d in self.docs if self._match(d, query)), None)

    async def update_one(self, query, update):
        doc = next(d for d in self.docs if self._match(d, query))
        doc.update(update["$set"])


def run(users, data, buyer_id="buyer_1"):
    return asyncio.run(update_own_profile(
        users, buyer_id, BuyerSelfUpdate(**data),
        normalize_whatsapp=lambda w: (w or "").replace(" ", "").strip(),
        whatsapp_lookup=lambda w: {"whatsapp_digits": digits(w)},
        verify_password=lambda plain, hashed: hashed == f"hash:{plain}",
    ))


def users():
    return FakeUsers([
        {"id": "buyer_1", "type": "buyer", "name": "Awa", "email": "awa@exemple.com",
         "whatsapp": "+237690000001", "password": "hash:secret"},
        {"id": "buyer_2", "type": "buyer", "name": "Paul", "email": "paul@exemple.com",
         "whatsapp": "+237690000002", "password": "hash:autre"},
        # Même e-mail chez les vendeurs : autorisé
        {"id": "seller_1", "type": "seller", "email": "boutique@exemple.com"},
    ])


def test_name_and_email_are_saved_normalized():
    db = users()
    updated = run(db, {"name": "  Awa   Ngono ", "email": " Awa.Ngono@Exemple.com "})
    assert updated["name"] == "Awa Ngono"
    assert updated["email"] == "awa.ngono@exemple.com"
    assert db.docs[0]["name"] == "Awa Ngono"


def test_email_of_another_buyer_is_refused():
    with pytest.raises(HTTPException) as err:
        run(users(), {"email": "PAUL@exemple.com"})
    assert err.value.status_code == 400


def test_invalid_values_are_refused():
    for data in ({"name": " a "}, {"email": "pas-un-email"}, {"whatsapp": "12"}):
        with pytest.raises(HTTPException) as err:
            run(users(), data)
        assert err.value.status_code == 400, data


def test_whatsapp_change_needs_current_password():
    with pytest.raises(HTTPException) as err:
        run(users(), {"whatsapp": "+237 690000009"})
    assert err.value.status_code == 401
    with pytest.raises(HTTPException):
        run(users(), {"whatsapp": "+237690000009", "currentPassword": "faux"})

    db = users()
    updated = run(db, {"whatsapp": "+237 690000009", "currentPassword": "secret"})
    assert updated["whatsapp"] == "+237690000009"


def test_same_whatsapp_in_another_format_needs_no_password():
    updated = run(users(), {"whatsapp": "+237 690000001", "name": "Awa N."})
    assert updated["whatsapp"] == "+237690000001"
    assert updated["name"] == "Awa N."


def test_whatsapp_of_another_buyer_is_refused():
    with pytest.raises(HTTPException) as err:
        run(users(), {"whatsapp": "690000002", "currentPassword": "secret"})
    assert err.value.status_code == 400


def test_account_without_password_can_add_its_number():
    db = FakeUsers([{"id": "buyer_g", "type": "buyer", "name": "Google", "email": "g@exemple.com",
                     "whatsapp": "", "password": None}])
    updated = run(db, {"whatsapp": "+237690000123"}, buyer_id="buyer_g")
    assert updated["whatsapp"] == "+237690000123"


def test_unknown_account():
    with pytest.raises(HTTPException) as err:
        run(users(), {"name": "Qui"}, buyer_id="buyer_x")
    assert err.value.status_code == 404
