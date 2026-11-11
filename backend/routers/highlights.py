"""
Produits et services « À la une » de l'accueil.

En tête, ceux que l'équipe met en avant (champ `featured`, réservé aux
admins). Ensuite, un classement sur les 90 derniers jours qui mêle :
commandes (hors annulées), contacts WhatsApp (la demande des services),
visites de la fiche et note des clients (corrigée par le nombre d'avis :
un seul 5/5 ne passe pas devant vingt avis à 4,6). Chaque annonce porte la
raison de sa présence (`highlight`), affichée en étiquette.

Les visites des fiches du site sont comptées par POST /products/{id}/view.
"""
import math
import time
from datetime import datetime, timedelta
from typing import Annotated, Dict, List

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from routers.ads import BOT_UA
from server import Product, db, with_seller_details

router = APIRouter(tags=["highlights"])

WINDOW_DAYS = 90
CACHE_SECONDS = 600
MAX_PER_SELLER = 2  # variété : pas une seule boutique sur toute la section

# Note bayésienne : moyenne tirée vers PRIOR_RATING tant qu'il y a peu d'avis
PRIOR_RATING = 3.5
PRIOR_WEIGHT = 3

WEIGHTS = {"orders": 3.0, "contacts": 2.0, "views": 1.0, "rating": 2.0}
# Étiquette : signal qui pèse le plus dans le score
LABELS = {"orders": "top_ordered", "contacts": "most_requested", "views": "most_viewed", "rating": "top_rated"}


class HighlightProduct(Product):
    # promoted | top_ordered | most_requested | most_viewed | top_rated
    highlight: str


def sellable(p: dict) -> bool:
    return (
        p.get("status") == "approved"
        and (p.get("price") or 0) > 0
        and (p.get("kind") == "service" or (p.get("stock") or 0) > 0)
    )


def signals(p: dict, orders: Dict[str, int], contacts: Dict[str, int]) -> Dict[str, float]:
    n = p.get("reviewsCount") or 0
    rating = ((p.get("rating") or 0) * n + PRIOR_RATING * PRIOR_WEIGHT) / (n + PRIOR_WEIGHT)
    return {
        "orders": WEIGHTS["orders"] * math.log1p(orders.get(p["id"], 0)),
        "contacts": WEIGHTS["contacts"] * math.log1p(contacts.get(p["id"], 0)),
        "views": WEIGHTS["views"] * math.log1p(p.get("views") or 0),
        "rating": WEIGHTS["rating"] * max(0.0, rating - PRIOR_RATING),
    }


def rank(products: List[dict], orders: Dict[str, int], contacts: Dict[str, int], limit: int) -> List[dict]:
    """Annonces à la une, chacune avec sa raison (`highlight`)."""
    candidates = [p for p in products if sellable(p)]
    promoted = sorted((p for p in candidates if p.get("featured")),
                      key=lambda p: p.get("updatedAt") or datetime.min, reverse=True)
    scored = []
    for p in candidates:
        if p.get("featured"):
            continue
        parts = signals(p, orders, contacts)
        score = sum(parts.values())
        if score > 0:
            scored.append((score, LABELS[max(parts, key=parts.get)], p))
    scored.sort(key=lambda item: item[0], reverse=True)

    picked, per_seller = [], {}
    for label, p in [("promoted", p) for p in promoted] + [(label, p) for _, label, p in scored]:
        seller = p.get("sellerId")
        # Les annonces promues ne comptent pas dans la limite par boutique
        if label != "promoted" and per_seller.get(seller, 0) >= MAX_PER_SELLER:
            continue
        per_seller[seller] = per_seller.get(seller, 0) + 1
        picked.append({**p, "highlight": label})
        if len(picked) >= limit:
            break
    return picked


async def demand(since: datetime):
    """Commandes (quantités) et contacts WhatsApp par produit, depuis `since`."""
    orders = await db.orders.aggregate([
        {"$match": {"status": {"$ne": "cancelled"}, "createdAt": {"$gte": since}}},
        {"$unwind": "$products"},
        {"$group": {"_id": "$products.productId", "n": {"$sum": "$products.quantity"}}},
    ]).to_list(None)
    contacts = await db.whatsapp_clicks.aggregate([
        {"$match": {"timestamp": {"$gte": since}}},
        {"$group": {"_id": "$productId", "n": {"$sum": 1}}},
    ]).to_list(None)
    return {r["_id"]: r["n"] for r in orders}, {r["_id"]: r["n"] for r in contacts}


_cache: Dict[int, tuple] = {}


def clear_cache():
    _cache.clear()


@router.get("/highlights", response_model=List[HighlightProduct])
async def get_highlights(response: Response, limit: Annotated[int, Query(ge=1, le=24)] = 8):
    hit = _cache.get(limit)
    if hit and hit[0] > time.monotonic():
        items = hit[1]
    else:
        products = await db.products.find(
            {"status": "approved", "price": {"$gt": 0}}, {"_id": 0}
        ).to_list(None)
        orders, contacts = await demand(datetime.utcnow() - timedelta(days=WINDOW_DAYS))
        items = await with_seller_details(rank(products, orders, contacts, limit))
        _cache[limit] = (time.monotonic() + CACHE_SECONDS, items)
    response.headers["Cache-Control"] = "public, max-age=300"
    return [HighlightProduct(**p) for p in items]


@router.post("/products/{product_id}/view", status_code=status.HTTP_204_NO_CONTENT)
async def count_product_view(product_id: str, request: Request):
    """Visite d'une fiche sur le site (une par fiche et par session, côté site)."""
    if not BOT_UA.search(request.headers.get("user-agent", "")):
        result = await db.products.update_one({"id": product_id}, {"$inc": {"views": 1}})
        if not result.matched_count:
            raise HTTPException(status_code=404, detail="Produit introuvable.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
