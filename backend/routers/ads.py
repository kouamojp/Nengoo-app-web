"""
Bannières publicitaires (régie interne, V1 gérée par l'administration).

Une campagne = une image (version large et version mobile), un lien, un
emplacement, une période et, au besoin, des catégories ciblées. Le site et
l'app demandent les bannières actives d'un emplacement (GET /promotions), en
affichent une (tirage pondéré par `weight`) et signalent vues et clics
(POST /promotions/{id}/view, /promotions/{id}/open). Chemins sans « ads » :
les bloqueurs de publicité filtrent ces adresses, et ces bannières sont
celles de Nengoo et de ses vendeurs. Les compteurs sont agrégés par
jour dans `ad_stats` (une ligne par campagne et par jour).

Droits : la gestion est réservée aux rôles admin et super_admin (jeton vérifié
par IdentityMiddleware).
"""
import re
import time
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field, field_validator, model_validator
from pymongo import ReturnDocument

from server import admin_or_higher_required, db

router = APIRouter(tags=["ads"])

# Emplacements : taille conseillée des images (largeur × hauteur, en pixels).
# Le site affiche l'image large à partir de 640 px de large, la mobile en dessous.
PLACEMENTS: Dict[str, dict] = {
    "home_middle": {
        "label": "Accueil : milieu de page",
        "surface": "site",
        "desktop": [1200, 300],
        "mobile": [800, 400],
    },
    "category_top": {
        "label": "Catalogue : haut des pages catégorie",
        "surface": "site",
        "desktop": [1200, 200],
        "mobile": [800, 300],
        "targetable": True,
    },
    "app_home": {
        "label": "App mobile : accueil",
        "surface": "app",
        "desktop": None,
        "mobile": [800, 400],
    },
    # Bannières glissées entre les produits des listes : une tous les
    # `every` produits, `perPage` au plus par page, jamais deux fois la même
    "feed": {
        "label": "Site : entre les produits (accueil et catalogue)",
        "surface": "site",
        "desktop": [1200, 300],
        "mobile": [800, 400],
        "targetable": True,
        "every": 12,
        "perPage": 4,
    },
    "app_feed": {
        "label": "App mobile : entre les produits (accueil et catégories)",
        "surface": "app",
        "desktop": None,
        "mobile": [800, 400],
        "targetable": True,
        "every": 6,
        "perPage": 4,
    },
}
Placement = Literal["home_middle", "category_top", "app_home", "feed", "app_feed"]
# Au plus tant de bannières sur une même page de liste
FEED_PER_PAGE = 4

MAX_PER_PLACEMENT = 10
CACHE_SECONDS = 60
STATS_DAYS_MAX = 90
BOT_UA = re.compile(r"bot|crawl|spider|slurp|preview|lighthouse|headless|facebookexternalhit|whatsapp", re.I)


def _check_link(link: str) -> str:
    link = (link or "").strip()
    # Même règle que les liens du carrousel : chemin interne ou http(s)
    if not link or not ((link.startswith("/") and not link.startswith("//")) or re.match(r"^https?://\S+$", link, re.I)):
        raise ValueError("Lien invalide : indiquez une page du site (/catalog) ou une adresse complète (https://…).")
    return link


def _check_image(url: Optional[str]) -> Optional[str]:
    url = (url or "").strip()
    if not url:
        return None
    if not re.match(r"^https://\S+$", url, re.I):
        raise ValueError("Image invalide : adresse https:// attendue.")
    return url


class AdBannerIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)  # nom interne de la campagne
    advertiser: str = Field("", max_length=120)
    sellerId: Optional[str] = Field(None, max_length=64)
    placement: Placement
    imageDesktop: Optional[str] = None
    imageMobile: Optional[str] = None
    alt: str = Field(..., min_length=2, max_length=160)  # texte de l'image, lu par les lecteurs d'écran
    link: str
    startsAt: Optional[datetime] = None
    endsAt: Optional[datetime] = None
    categories: List[str] = Field(default_factory=list, max_length=50)
    weight: int = Field(1, ge=1, le=10)
    status: Literal["active", "paused"] = "active"

    @field_validator("title", "advertiser", "alt")
    @classmethod
    def _strip(cls, v):
        return (v or "").strip()

    @field_validator("link")
    @classmethod
    def _link(cls, v):
        return _check_link(v)

    @field_validator("imageDesktop", "imageMobile")
    @classmethod
    def _image(cls, v):
        return _check_image(v)

    @field_validator("sellerId")
    @classmethod
    def _seller(cls, v):
        return (v or "").strip() or None

    @field_validator("startsAt", "endsAt")
    @classmethod
    def _utc(cls, v):
        # Stocké en UTC sans fuseau, comme le reste de la base
        if v is not None and v.tzinfo is not None:
            v = (v - v.utcoffset()).replace(tzinfo=None)
        return v

    @field_validator("categories")
    @classmethod
    def _categories(cls, v):
        return sorted({c.strip() for c in v if c and c.strip()})

    @model_validator(mode="after")
    def _coherent(self):
        spec = PLACEMENTS[self.placement]
        if spec["desktop"] is None:
            # App : une seule image, la mobile
            self.imageMobile = self.imageMobile or self.imageDesktop
            self.imageDesktop = None
            if not self.imageMobile:
                raise ValueError("Ajoutez l'image de la bannière.")
        elif not self.imageDesktop:
            raise ValueError("Ajoutez l'image grand écran de la bannière.")
        if not spec.get("targetable"):
            self.categories = []
        if self.startsAt and self.endsAt and self.endsAt <= self.startsAt:
            raise ValueError("La date de fin doit suivre la date de début.")
        return self


class AdBanner(AdBannerIn):
    id: str
    createdAt: datetime
    updatedAt: datetime
    createdBy: Optional[str] = None


def _phase(ad: dict, now: datetime) -> str:
    """paused / scheduled / running / ended : ce que voit l'admin."""
    if ad.get("status") == "paused":
        return "paused"
    if ad.get("startsAt") and ad["startsAt"] > now:
        return "scheduled"
    if ad.get("endsAt") and ad["endsAt"] <= now:
        return "ended"
    return "running"


def _running_query(placement: str, now: datetime) -> dict:
    return {
        "placement": placement,
        "status": "active",
        "$and": [
            {"$or": [{"startsAt": None}, {"startsAt": {"$exists": False}}, {"startsAt": {"$lte": now}}]},
            {"$or": [{"endsAt": None}, {"endsAt": {"$exists": False}}, {"endsAt": {"$gt": now}}]},
        ],
    }


# Cache des bannières en cours, par emplacement (vidé à chaque modification)
_cache: Dict[str, tuple] = {}


def clear_cache():
    _cache.clear()


async def running_ads(placement: str) -> List[dict]:
    hit = _cache.get(placement)
    if hit and hit[0] > time.monotonic():
        return hit[1]
    now = datetime.utcnow()
    ads = await db.ad_banners.find(_running_query(placement, now), {"_id": 0}).sort("createdAt", -1).to_list(MAX_PER_PLACEMENT)
    # Une campagne qui commence ou se termine avant l'expiration du cache
    # doit apparaître ou disparaître à l'heure : on raccourcit le cache.
    expires = CACHE_SECONDS
    upcoming = await db.ad_banners.find_one(
        {"placement": placement, "status": "active", "startsAt": {"$gt": now}}, sort=[("startsAt", 1)]
    )
    edges = [a["endsAt"] for a in ads if a.get("endsAt")] + ([upcoming["startsAt"]] if upcoming else [])
    for edge in edges:
        expires = min(expires, max(1, (edge - now).total_seconds()))
    _cache[placement] = (time.monotonic() + expires, ads)
    return ads


def public_view(ad: dict) -> dict:
    return {
        "id": ad["id"],
        "placement": ad["placement"],
        "imageDesktop": ad.get("imageDesktop"),
        "imageMobile": ad.get("imageMobile") or ad.get("imageDesktop"),
        "alt": ad.get("alt", ""),
        "link": ad["link"],
        "weight": ad.get("weight", 1),
    }


# --- Public -----------------------------------------------------------------

@router.get("/promotions")
async def list_running_ads(
    response: Response,
    placement: Placement,
    # Catégorie de la page (id) ; plusieurs séparées par des virgules
    category: Annotated[Optional[str], Query(max_length=200)] = None,
):
    """Bannières à afficher maintenant pour un emplacement (ciblage par catégorie)."""
    wanted = {c.strip() for c in (category or "").split(",") if c.strip()}
    ads = [
        public_view(ad)
        for ad in await running_ads(placement)
        # Sans ciblage : partout. Avec ciblage : seulement sur ces catégories.
        if not ad.get("categories") or wanted & set(ad["categories"])
    ]
    response.headers["Cache-Control"] = f"public, max-age={CACHE_SECONDS}"
    return ads


def _today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


async def _count(ad_id: str, field: str, request: Request):
    if BOT_UA.search(request.headers.get("user-agent", "")):
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    if not await db.ad_banners.find_one({"id": ad_id}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Bannière introuvable.")
    day = _today()
    await db.ad_stats.update_one(
        {"_id": f"{ad_id}:{day}"},
        {"$inc": {field: 1}, "$setOnInsert": {"adId": ad_id, "day": day}},
        upsert=True,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/promotions/{ad_id}/view", status_code=status.HTTP_204_NO_CONTENT)
async def count_impression(ad_id: str, request: Request):
    """Bannière vue (au moins à moitié visible). Envoyé par navigator.sendBeacon."""
    return await _count(ad_id, "views", request)


@router.post("/promotions/{ad_id}/open", status_code=status.HTTP_204_NO_CONTENT)
async def count_click(ad_id: str, request: Request):
    return await _count(ad_id, "clicks", request)


# --- Administration ------------------------------------------------------------

def _since(days: int) -> str:
    return (datetime.utcnow() - timedelta(days=days - 1)).strftime("%Y-%m-%d")


async def _totals(ad_ids: List[str], since: Optional[str] = None) -> Dict[str, dict]:
    match: dict = {"adId": {"$in": ad_ids}}
    if since:
        match["day"] = {"$gte": since}
    rows = await db.ad_stats.aggregate([
        {"$match": match},
        {"$group": {"_id": "$adId", "views": {"$sum": "$views"}, "clicks": {"$sum": "$clicks"}}},
    ]).to_list(None)
    return {r["_id"]: {"views": r.get("views", 0), "clicks": r.get("clicks", 0)} for r in rows}


def _admin_view(ad: dict, totals: dict, now: datetime) -> dict:
    stats = totals.get(ad["id"], {"views": 0, "clicks": 0})
    return {**ad, "phase": _phase(ad, now), "views": stats["views"], "clicks": stats["clicks"]}


@router.get("/admin/promotions/placements", dependencies=[Depends(admin_or_higher_required)])
async def ad_placements():
    return [{"id": key, **spec} for key, spec in PLACEMENTS.items()]


@router.get("/admin/promotions", dependencies=[Depends(admin_or_higher_required)])
async def admin_list_ads(placement: Optional[Placement] = None):
    query = {"placement": placement} if placement else {}
    ads = await db.ad_banners.find(query, {"_id": 0}).sort("createdAt", -1).to_list(500)
    totals = await _totals([a["id"] for a in ads])
    now = datetime.utcnow()
    return [_admin_view(ad, totals, now) for ad in ads]


@router.post("/admin/promotions", status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_or_higher_required)])
async def admin_create_ad(payload: AdBannerIn, request: Request):
    now = datetime.utcnow()
    ad = AdBanner(
        **payload.model_dump(),
        id=f"ad_{uuid.uuid4().hex[:10]}",
        createdAt=now,
        updatedAt=now,
        createdBy=request.headers.get("x-admin-id"),
    ).model_dump()
    await db.ad_banners.insert_one(dict(ad))
    clear_cache()
    return _admin_view(ad, {}, now)


@router.put("/admin/promotions/{ad_id}", dependencies=[Depends(admin_or_higher_required)])
async def admin_update_ad(ad_id: str, payload: AdBannerIn):
    now = datetime.utcnow()
    ad = await db.ad_banners.find_one_and_update(
        {"id": ad_id},
        {"$set": {**payload.model_dump(), "updatedAt": now}},
        projection={"_id": 0},
        return_document=ReturnDocument.AFTER,
    )
    if not ad:
        raise HTTPException(status_code=404, detail="Bannière introuvable.")
    clear_cache()
    return _admin_view(ad, await _totals([ad_id]), now)


class AdStatusIn(BaseModel):
    status: Literal["active", "paused"]


@router.put("/admin/promotions/{ad_id}/status", dependencies=[Depends(admin_or_higher_required)])
async def admin_set_ad_status(ad_id: str, payload: AdStatusIn):
    now = datetime.utcnow()
    ad = await db.ad_banners.find_one_and_update(
        {"id": ad_id},
        {"$set": {"status": payload.status, "updatedAt": now}},
        projection={"_id": 0},
        return_document=ReturnDocument.AFTER,
    )
    if not ad:
        raise HTTPException(status_code=404, detail="Bannière introuvable.")
    clear_cache()
    return _admin_view(ad, await _totals([ad_id]), now)


@router.delete("/admin/promotions/{ad_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_or_higher_required)])
async def admin_delete_ad(ad_id: str):
    result = await db.ad_banners.delete_one({"id": ad_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Bannière introuvable.")
    await db.ad_stats.delete_many({"adId": ad_id})
    clear_cache()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/admin/promotions/{ad_id}/stats", dependencies=[Depends(admin_or_higher_required)])
async def admin_ad_stats(ad_id: str, days: Annotated[int, Query(ge=1, le=STATS_DAYS_MAX)] = 30):
    """Vues et clics jour par jour (jours sans activité inclus, à zéro)."""
    if not await db.ad_banners.find_one({"id": ad_id}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Bannière introuvable.")
    since = _since(days)
    rows = await db.ad_stats.find({"adId": ad_id, "day": {"$gte": since}}, {"_id": 0}).to_list(None)
    by_day = {r["day"]: r for r in rows}
    start = datetime.strptime(since, "%Y-%m-%d")
    series = []
    for offset in range(days):
        day = (start + timedelta(days=offset)).strftime("%Y-%m-%d")
        row = by_day.get(day, {})
        series.append({"day": day, "views": row.get("views", 0), "clicks": row.get("clicks", 0)})
    all_time = (await _totals([ad_id])).get(ad_id, {"views": 0, "clicks": 0})
    return {
        "days": series,
        "period": {"views": sum(d["views"] for d in series), "clicks": sum(d["clicks"] for d in series)},
        "total": all_time,
    }


async def ensure_indexes():
    await db.ad_banners.create_index("id", unique=True)
    await db.ad_banners.create_index([("placement", 1), ("status", 1)])
    await db.ad_stats.create_index([("adId", 1), ("day", 1)])
