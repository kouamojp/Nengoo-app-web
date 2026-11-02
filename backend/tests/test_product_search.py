"""Recherche tolérante (fautes, accents, pluriels, synonymes) et pertinence.

Lancer depuis backend/ :  python -m pytest tests/test_product_search.py
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from product_search import normalize_query, search_products, tokenize  # noqa: E402

PRODUCTS = [
    {"id": "p1", "name": "Robe moulante", "description": "Robe en coton", "category": "cat_vf"},
    {"id": "p2", "name": "Ensemble jupe dame", "description": "Jupe et haut", "category": "cat_vf"},
    {"id": "p3", "name": "Babouches femmes", "description": "Cuir", "category": "cat_cf"},
    {"id": "p4", "name": "Samsung Galaxy A15", "description": "Smartphone 128 Go", "category": "cat_tel", "brand": "Samsung"},
    {"id": "p5", "name": "Air fryer", "description": "Friteuse sans huile 5 L", "category": "cat_elec"},
    {"id": "p6", "name": "Marmite chauffante", "description": "Garde au chaud", "category": "cat_cuisine"},
    {"id": "p7", "name": "Ceinture", "description": "Accessoire pour robe de soirée", "category": "cat_acc"},
]
CATEGORIES = {
    "cat_vf": "Vêtements femme Mode femme",
    "cat_cf": "Chaussures femme Mode femme",
    "cat_tel": "Smartphones Téléphones et accessoires",
    "cat_elec": "Petit électroménager Électroménager",
    "cat_cuisine": "Cuisine et vaisselle Maison et décoration",
    "cat_acc": "Sacs et accessoires femme Mode femme",
}


def ids(query):
    return [p["id"] for p in search_products(PRODUCTS, query, CATEGORIES)]


def test_tokenize():
    assert tokenize("Les Robes de l'été") == ["robe", "ete"]
    assert tokenize("T-shirt") == ["tshirt"]
    assert normalize_query("  Robes  ÉTÉ ") == "robe ete"


@pytest.mark.parametrize("query, first", [
    ("robe", "p1"),
    ("ROBES", "p1"),           # majuscules, pluriel
    ("rob", "p1"),             # début de mot
    ("babouche", "p3"),
    ("barbouche", "p3"),       # synonyme / variante locale
    ("marmitte", "p6"),        # faute de frappe
    ("telephone", "p4"),       # catégorie et synonyme
    ("portable samsung", "p4"),
    ("airfryer", "p5"),        # mots collés
    ("électroménager", "p5"),  # catégorie avec accents
])
def test_finds(query, first):
    assert ids(query)[0] == first


def test_name_before_description():
    # « robe » dans le nom passe devant « robe » dans la description
    assert ids("robe") == ["p1", "p7"]


def test_all_words_first():
    assert ids("jupe dame")[0] == "p2"


def test_nothing():
    assert ids("zzzz") == []
    assert ids("   ") == []
    assert ids("de la") == []


def test_partial_match_is_flagged():
    from product_search import search_products_detailed
    results, complete = search_products_detailed(PRODUCTS, "robe velo", CATEGORIES)
    assert results and not complete
    assert search_products_detailed(PRODUCTS, "robe", CATEGORIES)[1]
