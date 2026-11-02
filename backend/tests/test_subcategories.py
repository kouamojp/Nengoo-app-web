"""Règles des sous-catégories (un seul niveau) et filtre des produits.

Lancer depuis backend/ :  python -m pytest tests/test_subcategories.py
"""
import asyncio
import os
import sys

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402


def _match(doc, query):
    for key, cond in query.items():
        value = doc.get(key)
        if isinstance(cond, dict):
            if "$in" in cond and value not in cond["$in"]:
                return False
            if "$nin" in cond and value in cond["$nin"]:
                return False
        elif value != cond:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _n):
        return list(self.docs)


class FakeCategories:
    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, query):
        return next((d for d in self.docs if _match(d, query)), None)

    def find(self, query, _projection=None):
        return _Cursor([d for d in self.docs if _match(d, query)])


class FakeDb:
    def __init__(self):
        self.categories = FakeCategories([
            {"id": "cat_mode", "name": "Mode", "parentId": None},
            {"id": "cat_robes", "name": "Robes", "parentId": "cat_mode"},
            {"id": "cat_pagnes", "name": "Pagnes", "parentId": "cat_mode"},
            {"id": "cat_meubles", "name": "Meubles"},
        ])


@pytest.fixture(autouse=True)
def fake_db(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDb())


def run(coro):
    return asyncio.run(coro)


def rejects(coro):
    with pytest.raises(HTTPException) as err:
        run(coro)
    return err.value.detail


def test_family_ids_include_subcategories():
    assert run(server.category_family_ids("cat_mode")) == ["cat_mode", "cat_robes", "cat_pagnes"]
    assert run(server.category_family_ids("cat_robes")) == ["cat_robes"]


def test_valid_parent():
    run(server.check_category_parent(None, "cat_meubles"))
    run(server.check_category_parent("cat_meubles", "cat_mode"))
    run(server.check_category_parent("cat_robes", None))


def test_one_level_only():
    assert "principale" in rejects(server.check_category_parent(None, "cat_robes"))
    # Mode a des sous-catégories : elle ne peut pas passer sous Meubles
    assert "sous-catégories" in rejects(server.check_category_parent("cat_mode", "cat_meubles"))


def test_invalid_parent():
    assert "introuvable" in rejects(server.check_category_parent(None, "cat_inconnue"))
    assert "propre" in rejects(server.check_category_parent("cat_mode", "cat_mode"))


def test_cannot_delete_category_with_children():
    assert "sous-catégories" in rejects(server.delete_category("cat_mode"))
    req = server.BulkDeleteRequest(ids=["cat_mode", "cat_robes"])
    assert "Pagnes" in rejects(server.bulk_delete_categories(req))
