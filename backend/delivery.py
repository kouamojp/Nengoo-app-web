"""
Frais de livraison (phase 5).

Règle, pour chaque vendeur d'une commande livrée à domicile :
1. le vendeur a fixé son propre tarif (`deliveryPrice`) : il l'applique ;
2. sinon le tarif du quartier, à défaut celui de la ville (réglages admin) ;
3. sinon le tarif standard (réglage historique `shipping_price`).
La livraison est offerte si le sous-total du vendeur atteint `freeAbove`.
Le retrait en point relais est toujours gratuit.

Réglages : collection settings, document `_id: "delivery_zones"` :
  {"zones": [{"city": "Douala", "fee": 1500,
              "neighborhoods": [{"name": "Akwa", "fee": 1000}]}],
   "freeAbove": 50000}
"""
import secrets
from typing import Dict, List, Optional

from category_tree import normalize_name
from catalog_rules import normalize_city

DEFAULT_STANDARD_FEE = 2500


def zone_fee(zones: List[dict], city: Optional[str], neighborhood: Optional[str]) -> Optional[float]:
    """Tarif du quartier, à défaut de la ville ; None si la ville n'est pas réglée."""
    wanted_city = normalize_name(normalize_city(city) or "")
    wanted_area = normalize_name(neighborhood or "")
    for zone in zones or []:
        if normalize_name(normalize_city(zone.get("city")) or "") != wanted_city or not wanted_city:
            continue
        for area in zone.get("neighborhoods") or []:
            if wanted_area and normalize_name(area.get("name")) == wanted_area:
                return float(area.get("fee") or 0)
        return float(zone.get("fee") or 0)
    return None


def seller_fee(seller: dict, subtotal: float, settings: dict, standard_fee: float,
               city: Optional[str], neighborhood: Optional[str], pickup: bool) -> float:
    """Frais de livraison d'un vendeur pour une commande."""
    if pickup:
        return 0.0
    free_above = settings.get("freeAbove")
    if free_above and subtotal >= free_above:
        return 0.0
    if seller.get("deliveryPrice") is not None:
        return float(seller["deliveryPrice"])
    fee = zone_fee(settings.get("zones") or [], city, neighborhood)
    return float(standard_fee if fee is None else fee)


async def load_settings(db) -> Dict:
    """Réglages des zones et tarif standard."""
    zones = await db.settings.find_one({"_id": "delivery_zones"}) or {}
    standard = await db.settings.find_one({"_id": "shipping_price"})
    return {
        "zones": zones.get("zones") or [],
        "freeAbove": zones.get("freeAbove"),
        "standardFee": float(standard["price"]) if standard else DEFAULT_STANDARD_FEE,
    }


def new_delivery_code() -> str:
    """Code à 4 chiffres donné au client, demandé au livreur à la remise du colis."""
    return f"{secrets.randbelow(10000):04d}"


def new_courier_token() -> str:
    """Lien secret de la page du livreur (aucun mot de passe à retenir)."""
    return secrets.token_urlsafe(18)
