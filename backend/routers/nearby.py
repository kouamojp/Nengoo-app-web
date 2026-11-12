"""
« Près de chez vous » : point de retrait le plus proche d'une position GPS
et produits des boutiques de sa ville (app mobile).

GET /api/nearby?lat=&lng= renvoie les points de retrait triés par distance
(les plus proches seulement) et les produits en vente des vendeurs installés
dans la ville du plus proche. Les points sans coordonnées sont géocodés au
passage, quelques-uns par requête, puis enregistrés.
"""
from datetime import datetime, timedelta
from typing import Annotated, List, Optional

from fastapi import APIRouter, Query, Response
from pydantic import BaseModel

from category_tree import normalize_name
from geocode import distance_km
from routers.highlights import sellable
from server import PickupPoint, Product, db, has_coordinates, locate_pickup_point, with_seller_details

router = APIRouter(tags=["nearby"])

# Masqués sur le site et à la commande (frontend PickupPointsMap.js)
HIDDEN_STATUSES = {"rejected", "inactive", "suspended"}
MAX_POINTS = 5
# Géocodage paresseux : Nominatim limite à une requête par seconde
GEOCODE_PER_REQUEST = 3
GEOCODE_RETRY = timedelta(days=1)


class NearbyPickupPoint(PickupPoint):
    distanceKm: float


class NearbyResponse(BaseModel):
    pickupPoint: Optional[NearbyPickupPoint] = None
    pickupPoints: List[NearbyPickupPoint] = []
    products: List[Product] = []


async def located_points() -> List[dict]:
    """Points visibles ; ceux sans coordonnées sont géocodés (quelques-uns)."""
    points = [p for p in await db.pickupPoints.find({}, {"_id": 0}).to_list(1000)
              if p.get("status") not in HIDDEN_STATUSES]
    budget = GEOCODE_PER_REQUEST
    retry_before = datetime.utcnow() - GEOCODE_RETRY
    for p in points:
        if budget == 0:
            break
        if has_coordinates(p) or (p.get("geocodedAt") and p["geocodedAt"] > retry_before):
            continue
        budget -= 1
        point = PickupPoint(**p)
        await locate_pickup_point(point)
        fields = {"latitude": point.latitude, "longitude": point.longitude, "geocodedAt": point.geocodedAt}
        await db.pickupPoints.update_one({"id": p["id"]}, {"$set": fields})
        p.update(fields)
    return [p for p in points if has_coordinates(p)]


def by_distance(points: List[dict], lat: float, lng: float) -> List[dict]:
    ranked = [{**p, "distanceKm": round(distance_km(lat, lng, p["latitude"], p["longitude"]), 1)} for p in points]
    return sorted(ranked, key=lambda p: p["distanceKm"])


def rank_products(products: List[dict]) -> List[dict]:
    """En vente ; mis en avant, puis les plus vendus, puis les plus récents."""
    items = [p for p in products if sellable(p)]
    items.sort(key=lambda p: (bool(p.get("featured")), p.get("sold") or 0, p.get("createdAt") or datetime.min),
               reverse=True)
    return items


async def city_products(city: Optional[str], limit: int) -> List[dict]:
    key = normalize_name(city)
    if not key:
        return []
    sellers = await db.sellers.find({}, {"_id": 0, "id": 1, "city": 1}).to_list(None)
    seller_ids = [s["id"] for s in sellers if s.get("id") and normalize_name(s.get("city")) == key]
    if not seller_ids:
        return []
    products = await db.products.find(
        {"status": "approved", "price": {"$gt": 0}, "sellerId": {"$in": seller_ids}}, {"_id": 0}
    ).to_list(None)
    return await with_seller_details(rank_products(products)[:limit])


@router.get("/nearby", response_model=NearbyResponse)
async def get_nearby(
    response: Response,
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
    limit: Annotated[int, Query(ge=1, le=40)] = 12,
):
    points = by_distance(await located_points(), lat, lng)[:MAX_POINTS]
    # Réponse propre à une position : pas de cache partagé
    response.headers["Cache-Control"] = "private, max-age=120"
    if not points:
        return NearbyResponse()
    nearest = points[0]
    products = await city_products(nearest.get("city"), limit)
    return NearbyResponse(
        pickupPoint=NearbyPickupPoint(**nearest),
        pickupPoints=[NearbyPickupPoint(**p) for p in points],
        products=[Product(**p) for p in products],
    )
