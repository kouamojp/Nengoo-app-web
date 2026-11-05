"""E-mail unique par type de compte, et sa migration.

Lancer depuis backend/ :  python -m pytest tests/test_account_email.py
"""
import asyncio
import os
import re
import sys

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from account_email import ensure_email_free, normalize_email  # noqa: E402
from migrations.unique_emails_2026_11 import migrate  # noqa: E402


class FakeCollection:
    def __init__(self, docs=()):
        self.docs = [dict(d, _id=i) for i, d in enumerate(docs)]
        self.indexes = {}

    async def find_one(self, query):
        for doc in self.docs:
            if "type" in query and doc.get("type") != query["type"]:
                continue
            if "id" in query and doc.get("id") == query["id"]["$ne"]:
                continue
            if re.match(query["email"]["$regex"], doc.get("email") or "", re.I):
                return doc
        return None

    def find(self, query, _fields=None):
        return [dict(d) for d in self.docs if all(d.get(k) == v for k, v in query.items())]

    def update_one(self, query, update):
        next(d for d in self.docs if d["_id"] == query["_id"]).update(update["$set"])

    def index_information(self):
        return self.indexes

    def create_index(self, keys, name, **options):
        self.indexes[name] = {"key": keys, **options}


def free(collection, email, user_type="seller", exclude_id=None):
    return asyncio.run(ensure_email_free(collection, email, user_type, exclude_id))


def test_normalize_email():
    assert normalize_email("  Awa@Exemple.COM ") == "awa@exemple.com"
    assert normalize_email(None) == ""


def test_free_email_comes_back_normalized():
    assert free(FakeCollection(), " Awa@Exemple.com") == "awa@exemple.com"


def test_taken_email_is_refused_whatever_its_case():
    with pytest.raises(HTTPException) as refused:
        free(FakeCollection([{"id": "s1", "email": "AWA@exemple.com"}]), "awa@exemple.com")
    assert refused.value.status_code == 400


def test_account_can_keep_its_own_email():
    assert free(FakeCollection([{"id": "s1", "email": "awa@exemple.com"}]),
                "awa@exemple.com", exclude_id="s1") == "awa@exemple.com"


def test_several_accounts_can_have_no_email():
    assert free(FakeCollection([{"id": "s1", "email": ""}]), "") == ""


def test_buyer_lookup_ignores_other_account_types():
    users = FakeCollection([{"id": "u1", "type": "admin", "email": "awa@exemple.com"}])
    assert free(users, "awa@exemple.com", "buyer") == "awa@exemple.com"


def test_migration_normalizes_and_creates_partial_indexes():
    db = {"users": FakeCollection([{"type": "buyer", "email": " Awa@X.com"}, {"type": "buyer", "email": ""},
                                   {"type": "buyer", "email": ""}]),
          "sellers": FakeCollection([{"email": "awa@x.com"}])}
    migrate(db, True)
    assert db["users"].docs[0]["email"] == "awa@x.com"
    assert db["users"].indexes["unique_buyer_email"]["unique"] is True
    assert db["users"].indexes["unique_buyer_email"]["partialFilterExpression"]["email"] == {"$gt": ""}
    assert "unique_seller_email" in db["sellers"].indexes


def test_duplicates_block_only_their_collection_and_stay_listed():
    db = {"users": FakeCollection([{"type": "buyer", "email": "a@x.com"}]),
          "sellers": FakeCollection([{"email": "B@x.com"}, {"email": "b@x.com"}])}
    _, report = migrate(db, True)
    assert report["adresses en double, index non créé (sellers)"] == 1
    assert db["sellers"].indexes == {}
    assert "unique_buyer_email" in db["users"].indexes


def test_simulation_writes_nothing():
    db = {"users": FakeCollection([{"type": "buyer", "email": "Awa@x.com"}]), "sellers": FakeCollection()}
    migrate(db, False)
    assert db["users"].docs[0]["email"] == "Awa@x.com"
    assert db["users"].indexes == {}


def test_unique_index_conflict_gives_the_clear_message():
    import server
    from pymongo.errors import DuplicateKeyError

    error = DuplicateKeyError("E11000", 11000, {"keyPattern": {"email": 1}})
    response = asyncio.run(server.duplicate_key_handler(None, error))
    assert response.status_code == 400
    assert "e-mail" in response.body.decode()


def test_other_unique_index_conflicts_are_not_blamed_on_the_email():
    import server
    from pymongo.errors import DuplicateKeyError

    error = DuplicateKeyError("E11000", 11000, {"keyPattern": {"whatsapp": 1}})
    with pytest.raises(DuplicateKeyError):
        asyncio.run(server.duplicate_key_handler(None, error))
