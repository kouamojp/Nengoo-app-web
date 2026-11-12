"""
Codes promo : validité et calcul de la réduction (sans base de données).

Deux origines :
- « platform » : créé par l'équipe Nengoo, valable sur tout le catalogue ou
  limité à une boutique / des catégories ; la réduction est financée par
  Nengoo (le vendeur est payé au prix plein) ;
- « seller » : créé par un vendeur, valable sur ses seuls produits ; la
  réduction est à sa charge.

Trois types : pourcentage (avec plafond facultatif), montant fixe, livraison
offerte. Une commande est découpée par vendeur : la réduction est répartie
entre les commandes concernées, au prorata des articles éligibles.
Montants en XAF entiers.
"""
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

CODE_PATTERN = re.compile(r"^[A-Z0-9][A-Z0-9_-]{2,29}$")
TYPES = ("percent", "fixed", "free_shipping")


class PromoError(Exception):
    """Code refusé : le message s'affiche tel quel au client."""


def normalize_code(code: Optional[str]) -> str:
    return re.sub(r"\s+", "", (code or "")).upper()


def _xaf(amount: float) -> str:
    return f"{int(round(amount)):,}".replace(",", " ") + " XAF"


def describe(promo: dict) -> str:
    """« -10 % (5 000 XAF au plus) », « -2 000 XAF », « Livraison offerte »."""
    if promo["type"] == "percent":
        value = promo["value"]
        text = f"-{int(value) if float(value).is_integer() else value} %"
        if promo.get("maxDiscount"):
            text += f" ({_xaf(promo['maxDiscount'])} au plus)"
        return text
    if promo["type"] == "fixed":
        return f"-{_xaf(promo['value'])}"
    return "Livraison offerte"


def check_validity(promo: Optional[dict], now: Optional[datetime] = None) -> dict:
    """Le code existe, est actif, dans ses dates et pas épuisé ; sinon PromoError."""
    now = now or datetime.utcnow()
    if not promo:
        raise PromoError("Ce code promo n'existe pas.")
    if not promo.get("active", True):
        raise PromoError("Ce code promo n'est plus valable.")
    if promo.get("startsAt") and promo["startsAt"] > now:
        raise PromoError("Ce code promo n'est pas encore valable.")
    if promo.get("endsAt") and promo["endsAt"] <= now:
        raise PromoError("Ce code promo a expiré.")
    if promo.get("maxUses") and (promo.get("usedCount") or 0) >= promo["maxUses"]:
        raise PromoError("Ce code promo a déjà été utilisé le nombre de fois prévu.")
    return promo


def is_eligible(promo: dict, product: dict) -> bool:
    """L'article bénéficie-t-il du code ? (boutique et catégories visées)"""
    if promo.get("sellerId") and product.get("sellerId") != promo["sellerId"]:
        return False
    categories = promo.get("categories") or []
    if categories and product.get("category") not in categories:
        return False
    return True


def _split(amount: int, weights: Dict[str, float]) -> Dict[str, int]:
    """Répartit `amount` (entier) au prorata, reste au plus gros poids."""
    total = sum(weights.values())
    if amount <= 0 or total <= 0:
        return {k: 0 for k in weights}
    shares = {k: int(amount * w // total) for k, w in weights.items()}
    rest = amount - sum(shares.values())
    if rest:
        biggest = max(weights, key=weights.get)
        shares[biggest] += rest
    return shares


def compute_discounts(promo: dict, sellers: Dict[str, dict]) -> Dict[str, int]:
    """Réduction par vendeur.

    `sellers` : {sellerId: {"lines": [(produit, quantité, prix unitaire)], "shipping": frais}}.
    Lève PromoError si le code ne s'applique pas à ce panier.
    """
    eligible: Dict[str, float] = {}
    for seller_id, entry in sellers.items():
        amount = sum(price * qty for product, qty, price in entry["lines"] if is_eligible(promo, product))
        if amount > 0:
            eligible[seller_id] = amount
    base = sum(eligible.values())
    if base <= 0:
        raise PromoError("Ce code promo ne s'applique à aucun article de votre panier.")
    minimum = promo.get("minOrder") or 0
    if base < minimum:
        raise PromoError(f"Ce code promo s'applique à partir de {_xaf(minimum)} d'achats sur les articles concernés.")

    if promo["type"] == "free_shipping":
        result = {k: int(round(sellers[k].get("shipping") or 0)) for k in eligible}
    else:
        if promo["type"] == "percent":
            amount = base * float(promo["value"]) / 100
            if promo.get("maxDiscount"):
                amount = min(amount, float(promo["maxDiscount"]))
        else:
            amount = min(float(promo["value"]), base)
        result = _split(int(amount), eligible)
    return {k: v for k, v in result.items() if v > 0}


def lines_by_seller(items: List[Tuple[dict, int]], shipping: Dict[str, float]) -> Dict[str, dict]:
    """[(produit, quantité)] → structure attendue par compute_discounts."""
    sellers: Dict[str, dict] = {}
    for product, qty in items:
        price = product.get("promoPrice") if (product.get("promoPrice") or 0) > 0 else product.get("price") or 0
        entry = sellers.setdefault(product["sellerId"], {"lines": [], "shipping": shipping.get(product["sellerId"], 0)})
        entry["lines"].append((product, qty, price))
    return sellers
