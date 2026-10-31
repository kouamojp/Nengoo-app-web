"""Recherche d'un compte par numéro WhatsApp, quel que soit le format enregistré.

Lancer depuis backend/ :  python -m pytest tests/test_whatsapp_lookup.py
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import whatsapp_lookup  # noqa: E402

STORED = ["690703689", "+237690703689", "+237 690703689", "237 690 703 689", "+237-690-703-689"]


def matches(user_input, stored):
    query = whatsapp_lookup(user_input)["whatsapp"]
    if isinstance(query, str):
        return query == stored
    return re.search(query["$regex"], stored) is not None


def test_every_stored_format_matches_every_input_format():
    for user_input in STORED:
        for stored in STORED:
            assert matches(user_input, stored), (user_input, stored)


def test_foreign_number_kept_international():
    assert matches("+33612345678", "+33612345678")
    assert matches("+33 6 12 34 56 78", "+33612345678")


def test_other_numbers_do_not_match():
    assert not matches("+237690703680", "690703689")
    assert not matches("69070368", "690703689")        # chiffre manquant
    assert not matches("+2376907036891", "690703689")  # chiffre en trop


def test_regex_metacharacters_are_not_injected():
    assert whatsapp_lookup(".*") == {"whatsapp": ".*"}
    assert whatsapp_lookup("vendeur@example.com") == {"whatsapp": "vendeur@example.com"}
