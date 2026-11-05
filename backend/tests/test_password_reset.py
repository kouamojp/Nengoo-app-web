"""Code de réinitialisation du mot de passe de l'app mobile.

Lancer depuis backend/ :  python -m pytest tests/test_password_reset.py
"""
import asyncio
import os
import re
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import password_reset  # noqa: E402

NOW = datetime(2026, 11, 4, 12, 0)
EMAIL = "Awa@Exemple.com"


class FakeCollection:
    def __init__(self, doc):
        self.doc = doc

    async def find_one_and_update(self, query, update):
        doc = self.doc
        if not re.match(query["email"]["$regex"], doc["email"], re.I):
            return None
        if "type" in query and doc.get("type") != query["type"]:
            return None
        if not doc.get("reset_code_expiry") or doc["reset_code_expiry"] <= query["reset_code_expiry"]["$gt"]:
            return None
        if doc["reset_code_attempts"] >= query["reset_code_attempts"]["$lt"]:
            return None
        before = dict(doc)
        doc["reset_code_attempts"] += update["$inc"]["reset_code_attempts"]
        return before


def account(code="123456"):
    return FakeCollection({"email": EMAIL, "type": "buyer", **password_reset.code_fields(code, NOW)})


def check(collection, code, email=EMAIL, user_type="buyer", now=NOW):
    return asyncio.run(password_reset.account_for_code(collection, email, user_type, code, now))


def test_code_has_six_digits():
    assert all(re.fullmatch(r"\d{6}", password_reset.new_code()) for _ in range(200))


def test_code_is_not_stored_in_clear():
    assert "123456" not in password_reset.code_fields("123456", NOW)["reset_code_hash"]


def test_good_code_returns_account():
    assert check(account(), "123456")["email"] == EMAIL


def test_code_ignores_surrounding_spaces_and_email_case():
    assert check(account(), " 123456 ", email=" awa@exemple.com ")


def test_wrong_code_is_refused():
    assert check(account(), "654321") is None


def test_code_falls_after_five_failures_even_if_correct_afterwards():
    collection = account()
    for _ in range(password_reset.MAX_ATTEMPTS):
        assert check(collection, "000000") is None
    assert check(collection, "123456") is None


def test_expired_code_is_refused():
    assert check(account(), "123456", now=NOW + password_reset.CODE_TTL + timedelta(seconds=1)) is None


def test_cleared_code_is_refused():
    collection = account()
    collection.doc.update(password_reset.CLEARED_FIELDS)
    assert check(collection, "123456") is None


def test_email_is_not_a_regex():
    assert check(account(), "123456", email=".*") is None


def test_only_buyers_are_filtered_by_type():
    assert password_reset.account_query("a@b.co", "buyer")["type"] == "buyer"
    assert "type" not in password_reset.account_query("a@b.co", "seller")
