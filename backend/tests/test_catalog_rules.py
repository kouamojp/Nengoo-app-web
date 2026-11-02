"""Villes, numéros WhatsApp et fiches produit.

Lancer depuis backend/ :  python -m pytest tests/test_catalog_rules.py
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from catalog_rules import normalize_city, product_issues, whatsapp_digits  # noqa: E402


@pytest.mark.parametrize("raw, expected", [
    ("DOUALA", "Douala"),
    ("Bafoussam  ", "Bafoussam"),
    ("YAOUNDE ", "Yaoundé"),
    ("yaoundé", "Yaoundé"),
    ("  Moscou ", "Moscou"),
    ("Saint  Petersbourg", "Saint Petersbourg"),
    (None, None),
])
def test_city(raw, expected):
    assert normalize_city(raw) == expected


@pytest.mark.parametrize("raw, expected", [
    ("+237 690 70 36 89", "237690703689"),
    ("690703689", "237690703689"),
    ("00237690703689", "237690703689"),
    ("+1 514 555 0199", "15145550199"),
    ("+7 912 345 67 89", "79123456789"),
    ("+23780818211", None),  # indicatif 237 avec 8 chiffres
    ("berthalida0@gmail.com", None),
    ("SYSTEM_NENGOO", None),
    ("fotsotjp", None),
    ("", None),
])
def test_whatsapp(raw, expected):
    assert whatsapp_digits(raw) == expected


def test_product_issues():
    assert product_issues(5000, ["https://x/1.jpg"], "Robe en coton, taille M à XL") == []
    issues = product_issues(0, ["", None], "Robe")
    assert len(issues) == 3
    # Seuls les champs modifiés sont contrôlés
    assert product_issues(None, None, "Robe", check=("description",)) == [
        "La description doit faire au moins 20 caractères."
    ]
