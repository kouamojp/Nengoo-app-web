"""Fiche produit proposée par l'IA : relecture de la réponse, secours, budget, quota.

Les modèles sont simulés, la base aussi (pas besoin de MongoDB).
Lancer depuis backend/ :  python -m pytest tests/test_product_draft.py
"""
import asyncio
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ai_providers  # noqa: E402
import product_draft as drafts  # noqa: E402
from ai_providers import Completion, ProviderError  # noqa: E402

GOOD = {
    "usable": True,
    "name": "Robe longue fleurie à manches courtes",
    "description": "Robe longue à motif fleuri, col en V et manches courtes. Taille ajustée par une ceinture nouée.",
    "specs": {"couleur": "Bleu et blanc", "Col": "En V", "Matière": None, "Taille": "inconnu"},
    "brand": None,
    "condition": "new",
    "colors": ["#1E3A8A", "#ffffff", "bleu", "#ffffff"],
    "categoryMatches": True,
}


class _Collection:
    def __init__(self):
        self.rows = []
        self.daily = {}

    async def insert_one(self, row):
        self.rows.append(row)

    async def find_one(self, query):
        return self.daily.get(query["_id"])

    async def update_one(self, query, update, upsert=False):
        row = self.daily.setdefault(query["_id"], {"costUsd": 0})
        row["costUsd"] += update["$inc"]["costUsd"]


class FakeDb:
    def __init__(self):
        self.ai_usage = _Collection()
        self.ai_daily = _Collection()


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    for key in ["AI_PROVIDER", "AI_PROVIDER_IMAGE", "AI_FALLBACK_PROVIDERS", "AI_DAILY_BUDGET_USD",
                "AI_DRAFT_RATE_PER_SELLER_HOUR"]:
        monkeypatch.delenv(key, raising=False)
    for name in ai_providers.PROVIDERS:
        monkeypatch.delenv(f"{name.upper()}_API_KEY", raising=False)
        monkeypatch.delenv(f"{name.upper()}_VISION", raising=False)
    drafts.reset_limits()


def answer(data, tokens=(1000, 200)):
    text = data if isinstance(data, str) else json.dumps(data)
    return Completion(message={"role": "assistant", "content": text},
                      input_tokens=tokens[0], output_tokens=tokens[1])


def run(db, **kwargs):
    args = {"images": ["data:image/jpeg;base64,AAAA"], "price": 15000, "category": "Mode femme › Robes"}
    args.update(kwargs)
    return asyncio.run(drafts.generate(db, **args))


# --- Relecture ---

def test_draft_keeps_only_checked_fields():
    draft = drafts.parse_draft(json.dumps(GOOD))
    assert draft.name == GOOD["name"]
    # Valeurs vides ou « inconnu » écartées, première lettre en majuscule
    assert draft.specs == {"Couleur": "Bleu et blanc", "Col": "En V"}
    # Couleurs au format #rrggbb, sans doublon ni nom en clair
    assert draft.colors == ["#1e3a8a", "#ffffff"]
    assert draft.condition == "new"
    assert draft.category_matches is True


def test_draft_inside_code_fence_or_text():
    text = "Voici la fiche :\n```json\n" + json.dumps(GOOD) + "\n```"
    assert drafts.parse_draft(text).name == GOOD["name"]


def test_contacts_and_links_are_removed():
    data = dict(GOOD, description="Belle robe fleurie, très légère. Contactez-moi au 6 99 12 34 56 "
                                  "ou sur www.exemple.com. Écrivez à vente@exemple.com.")
    description = drafts.parse_draft(json.dumps(data)).description
    assert "99" not in description and "exemple" not in description and "@" not in description
    assert description.startswith("Belle robe fleurie")


def test_unknown_condition_brand_and_service_fields():
    data = dict(GOOD, condition="comme neuf", brand="unknown")
    draft = drafts.parse_draft(json.dumps(data))
    assert draft.condition is None and draft.brand is None
    service = drafts.parse_draft(json.dumps(GOOD), kind="service")
    assert service.condition is None and service.colors == []


def test_long_text_is_cut_and_specs_are_limited():
    data = dict(GOOD, name="Robe " * 40, description="Une phrase assez longue pour remplir. " * 80,
                specs={f"Clé {i}": "Valeur" for i in range(30)})
    draft = drafts.parse_draft(json.dumps(data))
    assert len(draft.name) <= drafts.MAX_NAME
    assert len(draft.description) <= drafts.MAX_DESCRIPTION and draft.description.endswith(".")
    assert len(draft.specs) == drafts.MAX_SPECS


def test_unusable_answers():
    with pytest.raises(drafts.DraftRejected):
        drafts.parse_draft('{"usable": false}')
    for text in ("Je ne peux pas.", json.dumps(dict(GOOD, description="Robe")), "[1, 2]"):
        with pytest.raises(ValueError):
            drafts.parse_draft(text)


def test_category_mismatch_is_reported():
    assert drafts.parse_draft(json.dumps(dict(GOOD, categoryMatches=False))).category_matches is False


# --- Appel au modèle ---

def test_prompt_carries_price_category_language_and_photos():
    messages = drafts.build_messages(["data:a", "data:b"], 15000, "Robes", "service", "en")
    text = messages[1]["content"][0]["text"]
    assert "15 000 FCFA" in text and "Robes" in text and "English" in text and "service" in text
    assert [part["image_url"]["url"] for part in messages[1]["content"][1:]] == ["data:a", "data:b"]


def test_image_provider_is_used_and_cost_counted(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("OPENAI_API_KEY", "k")
    monkeypatch.setenv("AI_PROVIDER_IMAGE", "gemini")
    calls = []

    def fake_complete(provider, messages, tools, **kwargs):
        calls.append(provider.name)
        assert tools is None
        return answer(GOOD)

    monkeypatch.setattr(ai_providers, "complete", fake_complete)
    db = FakeDb()
    draft = run(db)
    assert calls == ["gemini"]
    assert draft.name == GOOD["name"]
    row = db.ai_usage.rows[-1]
    assert row["need"] == "product_draft" and row["mode"] == "ai" and row["costUsd"] > 0
    assert sum(d["costUsd"] for d in db.ai_daily.daily.values()) == pytest.approx(row["costUsd"])


def test_fallback_after_failure_or_bad_json(monkeypatch):
    for key in ("GEMINI_API_KEY", "OPENAI_API_KEY", "KIMI_API_KEY"):
        monkeypatch.setenv(key, "k")
    monkeypatch.setenv("AI_PROVIDER_IMAGE", "gemini")
    monkeypatch.setenv("AI_FALLBACK_PROVIDERS", "openai,kimi")
    replies = {"gemini": ProviderError("panne"), "openai": answer("pas du JSON"), "kimi": answer(GOOD)}

    def fake_complete(provider, messages, tools, **kwargs):
        reply = replies[provider.name]
        if isinstance(reply, Exception):
            raise reply
        return reply

    monkeypatch.setattr(ai_providers, "complete", fake_complete)
    db = FakeDb()
    assert run(db).name == GOOD["name"]
    # Le coût de la réponse illisible compte aussi
    assert db.ai_usage.rows[-1]["inputTokens"] == 2000


def test_rejected_photo_stops_the_chain(monkeypatch):
    for key in ("GEMINI_API_KEY", "OPENAI_API_KEY"):
        monkeypatch.setenv(key, "k")
    calls = []

    def fake_complete(provider, messages, tools, **kwargs):
        calls.append(provider.name)
        return answer({"usable": False})

    monkeypatch.setattr(ai_providers, "complete", fake_complete)
    with pytest.raises(drafts.DraftRejected):
        run(FakeDb())
    assert len(calls) == 1


def test_unavailable_without_key_vision_or_budget(monkeypatch):
    with pytest.raises(drafts.DraftUnavailable):
        run(FakeDb())
    # DeepSeek ne lit pas les photos
    monkeypatch.setenv("DEEPSEEK_API_KEY", "k")
    with pytest.raises(drafts.DraftUnavailable):
        run(FakeDb())

    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("AI_DAILY_BUDGET_USD", "1")
    monkeypatch.setattr(ai_providers, "complete", lambda *a, **k: pytest.fail("budget atteint"))
    db = FakeDb()
    db.ai_daily.daily[drafts.core._today()] = {"costUsd": 1.5}
    with pytest.raises(drafts.DraftUnavailable):
        run(db)


def test_hourly_limit_per_account(monkeypatch):
    monkeypatch.setenv("AI_DRAFT_RATE_PER_SELLER_HOUR", "2")
    assert drafts.over_limit("seller:a") is None
    assert drafts.over_limit("seller:a") is None
    assert drafts.over_limit("seller:a") > 0
    assert drafts.over_limit("seller:b") is None
