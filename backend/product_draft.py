"""
Brouillon de fiche produit par l'IA : le vendeur donne une photo, un prix et une
catégorie, le modèle propose titre, description et caractéristiques.

Rien n'est publié ici : le brouillon remplit le formulaire, le vendeur le vérifie
et publie avec POST /products, qui applique les contrôles habituels.

Le modèle est celui du besoin « image » (AI_PROVIDER_IMAGE, puis les secours qui
lisent les photos). Coût compté dans le budget du jour de l'assistant
(AI_DAILY_BUDGET_USD) et dans ses statistiques (besoin « product_draft »).

Ce qui ne dépend pas des consignes du modèle :
- la réponse est relue champ par champ : longueurs, couleurs #RRGGBB, état connu ;
- liens, numéros et e-mails sont retirés du texte (pas de démarchage hors Nengoo) ;
- prix et catégorie restent ceux du vendeur, le modèle ne peut pas les changer.
"""
import asyncio
import json
import logging
import re
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

import ai_providers
import assistant as core
from ai_providers import ProviderError
from catalog_rules import MIN_DESCRIPTION_LENGTH

logger = logging.getLogger(__name__)

NEED = "product_draft"
MAX_IMAGES = 3
MAX_NAME = 80
MAX_DESCRIPTION = 1200
MAX_SPECS = 10
MAX_SPEC_KEY = 40
MAX_SPEC_VALUE = 120
MAX_BRAND = 40
MAX_COLORS = 6
CONDITIONS = ("new", "used", "refurbished")

_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
_CONTACT = re.compile(r"\b(?:whatsapp|appelez|appeler|contactez|call|contact us)\b[^.\n]*[.\n]?", re.I)

SYSTEM_PROMPT = """Tu rédiges des fiches produit pour Nengoo, une marketplace au Cameroun.
Le vendeur t'envoie une ou plusieurs photos d'un article, son prix et sa catégorie.
Tu proposes un titre, une description et des caractéristiques. Le vendeur relira tout avant de publier.

Règles
- Décris uniquement ce que montrent les photos. N'invente ni matière, ni taille, ni capacité, ni compatibilité, ni garantie.
- Une caractéristique incertaine est omise, jamais devinée.
- Marque : seulement si un logo ou un nom est lisible sur la photo. Ne dis jamais qu'un article est « original », « authentique » ou « officiel ».
- Titre : court et précis (type d'article, marque visible, trait distinctif), 60 caractères au plus, sans majuscules partout, sans emoji, sans prix.
- Description : 2 à 4 phrases simples et concrètes, sans superlatifs, sans prix, sans numéro, sans lien, sans livraison ni délai.
- Caractéristiques : 3 à 8 paires courtes et vérifiables sur la photo (ex. « Couleur » : « Noir », « Type de col » : « Rond »).
- Couleurs : celles de l'article lui-même (pas du fond), au format #RRGGBB.
- État : « new » si l'article paraît neuf (étiquette, emballage), « used » s'il porte des traces d'usage, sinon null.
- Si la photo ne correspond pas à la catégorie choisie, mets categoryMatches à false.
- Si la photo ne montre aucun article à vendre (capture d'écran, document, personne seule), mets usable à false.

Réponds uniquement avec un objet JSON, sans texte autour :
{"usable": true, "name": "...", "description": "...", "specs": {"Clé": "Valeur"},
 "brand": null, "condition": null, "colors": ["#000000"], "categoryMatches": true}"""

LANGUAGE = {
    "fr": "Rédige en français.",
    "en": "Write in English.",
}

SERVICE_HINT = ("C'est un service (prestation), pas un objet : décris la prestation montrée, "
                "sans état ni couleurs.")
MEAL_HINT = ("C'est un plat de restaurant : décris le plat montré (ingrédients visibles, "
             "accompagnement, portion), sans état, couleurs ni marque.")


class DraftUnavailable(Exception):
    """Aucun fournisseur n'a pu répondre (sans clé, budget atteint, panne)."""


class DraftRejected(Exception):
    """Le modèle a répondu, mais la photo ne montre pas d'article exploitable."""


@dataclass
class Draft:
    name: str
    description: str
    specs: Dict[str, str] = field(default_factory=dict)
    brand: Optional[str] = None
    condition: Optional[str] = None
    colors: List[str] = field(default_factory=list)
    category_matches: bool = True

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "specs": self.specs,
            "brand": self.brand,
            "condition": self.condition,
            "colors": self.colors,
            "categoryMatches": self.category_matches,
        }


# --- Relecture de la réponse du modèle ---

def _clean_text(value, limit: int) -> str:
    """Texte brut d'une ligne ou d'un paragraphe, sans contact ni lien."""
    if not isinstance(value, str):
        return ""
    text = re.sub(r"<[^>]+>", " ", value)
    text = core._URL_RE.sub("", text)
    text = core._EMAIL_RE.sub("", text)
    text = core._PHONE_RE.sub("", text)
    text = _CONTACT.sub("", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text).strip()
    if len(text) > limit:
        cut = text[:limit]
        # Coupe à la dernière phrase complète si elle n'est pas trop loin
        end = max(cut.rfind(". "), cut.rfind(".\n"))
        text = cut[:end + 1] if end > limit // 2 else cut.rstrip()
    return text


def _json_object(text: str) -> dict:
    """L'objet JSON de la réponse, même entouré de ```json ou de texte."""
    text = (text or "").strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    if fenced:
        text = fenced.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("pas d'objet JSON")
    data = json.loads(text[start:end + 1])
    if not isinstance(data, dict):
        raise ValueError("objet JSON attendu")
    return data


def parse_draft(text: str, kind: str = "product") -> Draft:
    """Brouillon relu. ValueError si la réponse est inutilisable, DraftRejected
    si le modèle dit que la photo ne montre pas d'article."""
    data = _json_object(text)
    if data.get("usable") is False:
        raise DraftRejected()

    name = _clean_text(data.get("name"), MAX_NAME).replace("\n", " ")
    description = _clean_text(data.get("description"), MAX_DESCRIPTION)
    if len(name) < 3 or len(description) < MIN_DESCRIPTION_LENGTH:
        raise ValueError("titre ou description trop court")

    specs: Dict[str, str] = {}
    raw_specs = data.get("specs") if isinstance(data.get("specs"), dict) else {}
    for key, value in raw_specs.items():
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            value = str(value)
        key = _clean_text(key, MAX_SPEC_KEY).replace("\n", " ")
        value = _clean_text(value, MAX_SPEC_VALUE).replace("\n", " ")
        if key and value and value.lower() not in ("null", "none", "inconnu", "unknown", "n/a", "-"):
            specs[key[0].upper() + key[1:]] = value
        if len(specs) >= MAX_SPECS:
            break

    brand = _clean_text(data.get("brand"), MAX_BRAND).replace("\n", " ") or None
    if brand and brand.lower() in ("null", "none", "inconnue", "inconnu", "unknown"):
        brand = None

    condition = data.get("condition") if data.get("condition") in CONDITIONS else None
    colors: List[str] = []
    for color in data.get("colors") if isinstance(data.get("colors"), list) else []:
        if isinstance(color, str) and _HEX.match(color.strip()) and color.strip().lower() not in colors:
            colors.append(color.strip().lower())
    if kind in ("service", "meal"):
        condition, colors = None, []

    return Draft(
        name=name,
        description=description,
        specs=specs,
        brand=brand,
        condition=condition,
        colors=colors[:MAX_COLORS],
        category_matches=data.get("categoryMatches") is not False,
    )


# --- Appel au modèle ---

def _money(amount: float) -> str:
    return f"{int(round(amount)):,}".replace(",", " ") + " FCFA"


def build_messages(images: List[str], price: float, category: str, kind: str, language: str) -> List[dict]:
    """`images` : photos déjà passées par prepare_image (data URL JPEG sans métadonnées)."""
    details = [
        f"Catégorie choisie par le vendeur : {category}.",
        f"Prix : {_money(price)} (pour situer la gamme, ne le cite pas).",
        LANGUAGE.get(language, LANGUAGE["fr"]),
    ]
    if kind == "service":
        details.append(SERVICE_HINT)
    elif kind == "meal":
        details.append(MEAL_HINT)
    content = [{"type": "text", "text": "\n".join(details)}]
    content += [{"type": "image_url", "image_url": {"url": image}} for image in images]
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": content},
    ]


async def _record(db, provider: Optional[str], model: Optional[str], mode: str,
                  input_tokens: int, output_tokens: int, cost: float, started: float, language: str) -> None:
    """Statistiques comme l'assistant : compteurs seulement, ni photo ni vendeur."""
    await db.ai_usage.insert_one({
        "createdAt": datetime.utcnow(),
        "conversationId": None,
        "language": language,
        "need": NEED,
        "mode": mode,
        "provider": provider,
        "model": model,
        "fallback": False,
        "guarded": False,
        "noResult": mode != "ai",
        "productCount": 0,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "costUsd": cost,
        "latencyMs": int((time.monotonic() - started) * 1000),
    })
    if cost:
        await db.ai_daily.update_one({"_id": core._today()}, {"$inc": {"costUsd": cost}}, upsert=True)


async def generate(db, images: List[str], price: float, category: str,
                   kind: str = "product", language: str = "fr") -> Draft:
    """Brouillon de fiche. Lève DraftUnavailable ou DraftRejected."""
    started = time.monotonic()
    chain = ai_providers.chain_for("image")
    if chain and await core._best_effort(core._budget_left(db), "lecture du budget") is False:
        logger.warning("Fiche IA : budget du jour atteint")
        chain = []
    messages = build_messages(images, price, category, kind, language)
    max_tokens = int(core._setting("AI_DRAFT_MAX_OUTPUT_TOKENS", 2000))
    deadline = started + core._setting("AI_DRAFT_TIMEOUT_SECONDS", 45)

    rejected = False
    input_tokens = output_tokens = 0
    cost = 0.0
    last = None
    for provider in chain:
        remaining = deadline - time.monotonic()
        if remaining < 5:
            break
        last = provider
        try:
            completion = await asyncio.to_thread(
                ai_providers.complete, provider, messages, None,
                force_text=True, max_tokens=max_tokens, timeout=remaining,
            )
        except ProviderError as error:
            logger.warning("Fiche IA : %s", error)
            continue
        input_tokens += completion.input_tokens
        output_tokens += completion.output_tokens
        cost += ai_providers.cost_usd(provider, completion.input_tokens, completion.output_tokens)
        try:
            draft = parse_draft(completion.message.get("content") or "", kind)
        except DraftRejected:
            rejected = True
            break
        except (ValueError, json.JSONDecodeError) as error:
            logger.warning("Fiche IA : réponse inutilisable de %s (%s)", provider.name, error)
            continue
        await core._best_effort(_record(db, provider.name, ai_providers.model_of(provider), "ai",
                                        input_tokens, output_tokens, cost, started, language),
                                "enregistrement des statistiques")
        return draft

    await core._best_effort(_record(db, last.name if last else None,
                                    ai_providers.model_of(last) if last else None,
                                    "rejected" if rejected else "unavailable",
                                    input_tokens, output_tokens, cost, started, language),
                            "enregistrement des statistiques")
    if rejected:
        raise DraftRejected()
    raise DraftUnavailable()


# --- Limite par vendeur ---

_windows: Dict[str, deque] = defaultdict(deque)


def over_limit(key: str) -> Optional[int]:
    """Secondes à attendre si ce compte a dépassé son quota horaire, sinon None.
    En mémoire, comme l'assistant : le budget du jour reste le plafond réel."""
    limit = int(core._setting("AI_DRAFT_RATE_PER_SELLER_HOUR", 20))
    now = time.monotonic()
    window = _windows[key]
    while window and window[0] <= now - 3600:
        window.popleft()
    if len(window) >= limit:
        return int(window[0] + 3600 - now) + 1
    window.append(now)
    return None


def reset_limits() -> None:
    _windows.clear()
