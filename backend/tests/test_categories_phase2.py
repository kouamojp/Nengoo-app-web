"""Phase 2 : noms de catégories, suppression protégée, prix promo, suggestions
de reclassement et migration (sur une base MongoDB locale si disponible).

Lancer depuis backend/ :  python -m pytest tests/test_categories_phase2.py
"""
import asyncio
import os
import sys
import uuid

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402
from category_tree import TREE, RULES, normalize_name, suggest_category_name, tree_names  # noqa: E402


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _n):
        return list(self.docs)


class FakeCollection:
    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, query, _projection=None):
        return next((d for d in self.docs if all(d.get(k) == v for k, v in query.items())), None)

    def find(self, _query=None, _projection=None):
        return _Cursor(self.docs)

    async def count_documents(self, query):
        wanted = query["category"]["$in"]
        return sum(1 for d in self.docs if d.get("category") in wanted)


class FakeDb:
    def __init__(self):
        self.categories = FakeCollection([
            {"id": "cat_1", "name": "Vêtements femmes "},
            {"id": "cat_2", "name": "Meubles"},
        ])
        self.products = FakeCollection([{"id": "p1", "category": "cat_2"}])


@pytest.fixture(autouse=True)
def fake_db(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDb())


def rejects(coro):
    with pytest.raises(HTTPException) as err:
        asyncio.run(coro)
    return err.value.detail


def test_normalized_names():
    assert normalize_name("  Vêtements Femmes ") == normalize_name("vetement femme")
    assert normalize_name("Électroniques") == normalize_name("electronique")


def test_duplicate_category_names_refused():
    assert "Vêtements femmes" in rejects(server.check_category_name_free("vetement femme"))
    asyncio.run(server.check_category_name_free("Vêtements femmes", "cat_1"))  # renommer soi-même
    asyncio.run(server.check_category_name_free("Mode homme"))


def test_category_with_products_cannot_be_deleted():
    assert "1 produit" in rejects(server.check_categories_empty(["cat_2"]))
    asyncio.run(server.check_categories_empty(["cat_1"]))


def test_product_category_must_exist():
    assert "existante" in rejects(server.check_product_category("clothing_accessories"))
    asyncio.run(server.check_product_category("cat_2"))


def test_promo_price_below_price():
    with pytest.raises(HTTPException):
        server.check_promo_price(10000, 10000)
    server.check_promo_price(10000, 8000)
    server.check_promo_price(10000, None)
    server.check_promo_price(10000, 0)


def test_tree_is_consistent():
    names = list(tree_names())
    assert len({normalize_name(n) for n in names}) == len(names)
    assert {t for _, t in RULES} <= set(names)
    assert len(TREE) >= 20


@pytest.mark.parametrize("name, expected", [
    ("Robe moulante avec fente", "Vêtements femme"),
    ("Pantalon évasé", "Vêtements femme"),
    ("Polo homme", "Vêtements homme"),
    ("Jupe enfant", "Vêtements enfant"),
    ("Babouches femmes", "Chaussures femme"),
    ("Tennis Dior luxe pour homme", "Chaussures homme"),
    ("Soutien string", "Lingerie et nuit"),
    ("Air fryer", "Petit électroménager"),
    ("Chargeur iphone Original", "Chargeurs et câbles"),
    ("Mèche Indienne", "Cheveux et perruques"),
    ("Tissu pagne du 8mars", "Pagnes et tissus traditionnels"),
    ("Carte de voeux", None),
])
def test_suggestions(name, expected):
    assert suggest_category_name(name) == expected


def _local_mongo():
    from pymongo import MongoClient
    try:
        client = MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=500)
        client.server_info()
        return client
    except Exception:
        return None


def test_migration_and_undo_on_local_mongo(tmp_path):
    client = _local_mongo()
    if not client:
        pytest.skip("pas de MongoDB local")
    from migrations import categories_2026_11 as migration

    db = client[f"nengoo_pytest_{uuid.uuid4().hex[:6]}"]
    try:
        db.categories.insert_many([
            {"name": "Vetements femmes", "description": "sans id"},
            {"id": "cat_shoes", "name": "Chaussures femmes"},
            {"id": "cat_misc", "name": "Hors liste"},
            {"id": "cat_acc", "name": "Accessoires femmes"},
        ])
        db.products.insert_many([
            {"id": "p1", "name": "Robe", "category": "Vetements femmes", "slug": "robe", "price": 1},
            {"id": "p2", "name": "Robe", "category": "cat_shoes", "slug": "robe", "price": 2},
            {"id": "p3", "name": "Jupe", "category": "cat_supprimee", "slug": "jupe", "price": 3},
        ])
        before = sorted(map(str, db.products.find({}, {"_id": 0}))), sorted(map(str, db.categories.find({}, {"_id": 0})))

        journal, report = migration.migrate(db, apply=True)
        log = journal.save(str(tmp_path))
        dress = db.products.find_one({"id": "p1"})
        women = db.categories.find_one({"id": dress["category"]})
        assert women["name"] == "Vêtements femme"
        # Même nom au pluriel et aux accents près : rien à retenir
        assert "formerNames" not in women
        assert db.categories.find_one({"id": "cat_acc"})["formerNames"] == ["Accessoires femmes"]
        assert db.categories.find_one({"id": women["parentId"]})["name"] == "Mode femme"
        assert db.categories.find_one({"id": "cat_shoes"})["parentId"] == women["parentId"]
        assert db.categories.find_one({"id": "cat_misc"}).get("parentId") is None
        assert {p["slug"] for p in db.products.find()} == {"robe", "robe-2", "jupe"}
        assert report["produits restant sans catégorie valide"] == 1

        # Deuxième passage : plus rien à faire
        again, _ = migration.migrate(db, apply=False)
        assert again.entries == [] and again.indexes == []

        migration.undo(db, log)
        after = sorted(map(str, db.products.find({}, {"_id": 0}))), sorted(map(str, db.categories.find({}, {"_id": 0})))
        assert after == before
        assert sorted(db.products.index_information()) == ["_id_"]
    finally:
        client.drop_database(db.name)
