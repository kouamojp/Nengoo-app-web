"""
Gestion des codes promo (règles de calcul : promo.py).

- Équipe (admin, super_admin) : /admin/promo-codes — codes « platform »,
  financés par Nengoo, éventuellement limités à une boutique ou des catégories.
- Vendeurs (session vendeur) : /seller/promo-codes — codes « seller », valables
  sur leurs seuls produits et à leur charge.

Chaque utilisation est enregistrée dans `promo_redemptions` (client,
commandes, réduction) : limite par client et statistiques.
"""
import uuid
from datetime import datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator, model_validator
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

import promo as rules
from server import admin_or_higher_required, db
from session_auth import require_session

router = APIRouter(tags=["promo-codes"])


class PromoCodeIn(BaseModel):
    code: str
    description: str = Field("", max_length=160)  # note interne / texte de la campagne
    type: Literal["percent", "fixed", "free_shipping"]
    value: float = 0
    maxDiscount: Optional[float] = Field(None, gt=0)
    minOrder: Optional[float] = Field(None, ge=0)
    startsAt: Optional[datetime] = None
    endsAt: Optional[datetime] = None
    maxUses: Optional[int] = Field(None, ge=1)
    perCustomer: Optional[int] = Field(1, ge=1)  # None : sans limite par client
    active: bool = True
    # Réservé à l'équipe : limiter un code Nengoo à une boutique / des catégories
    sellerId: Optional[str] = None
    categories: List[str] = Field(default_factory=list, max_length=50)

    @field_validator("code")
    @classmethod
    def _code(cls, v):
        v = rules.normalize_code(v)
        if not rules.CODE_PATTERN.match(v):
            raise ValueError("Code invalide : 3 à 30 lettres, chiffres, - ou _, sans espace.")
        return v

    @field_validator("startsAt", "endsAt")
    @classmethod
    def _utc(cls, v):
        if v is not None and v.tzinfo is not None:
            v = (v - v.utcoffset()).replace(tzinfo=None)
        return v

    @model_validator(mode="after")
    def _coherent(self):
        if self.type == "percent" and not 0 < self.value <= 90:
            raise ValueError("Pourcentage entre 1 et 90.")
        if self.type == "fixed" and self.value < 1:
            raise ValueError("Indiquez le montant de la réduction.")
        if self.type == "free_shipping":
            self.value, self.maxDiscount = 0, None
        if self.type == "fixed":
            self.maxDiscount = None
        if self.startsAt and self.endsAt and self.endsAt <= self.startsAt:
            raise ValueError("La date de fin doit suivre la date de début.")
        self.sellerId = (self.sellerId or "").strip() or None
        self.categories = sorted({c.strip() for c in self.categories if c and c.strip()})
        return self


# --- Utilisés par la commande et le devis ----------------------------------------

async def find_valid(code: Optional[str], buyer_id: Optional[str] = None) -> dict:
    """Code existant, actif, dans ses dates, pas épuisé ni déjà utilisé par ce client."""
    normalized = rules.normalize_code(code)
    promo = await db.promo_codes.find_one({"code": normalized}, {"_id": 0}) if normalized else None
    rules.check_validity(promo)
    if buyer_id and promo.get("perCustomer"):
        used = await db.promo_redemptions.count_documents({"promoId": promo["id"], "buyerId": buyer_id})
        if used >= promo["perCustomer"]:
            raise rules.PromoError("Vous avez déjà utilisé ce code promo.")
    return promo


async def claim(promo: dict) -> bool:
    """Compte une utilisation, sans dépasser le nombre prévu (atomique)."""
    query = {"id": promo["id"]}
    if promo.get("maxUses"):
        query["usedCount"] = {"$lt": promo["maxUses"]}
    return bool(await db.promo_codes.find_one_and_update(query, {"$inc": {"usedCount": 1}}))


async def release(promo: dict) -> None:
    await db.promo_codes.update_one({"id": promo["id"], "usedCount": {"$gt": 0}}, {"$inc": {"usedCount": -1}})


async def record(promo: dict, buyer_id: str, order_ids: List[str], discount: int) -> None:
    await db.promo_redemptions.insert_one({
        "id": f"promored_{uuid.uuid4().hex[:10]}",
        "promoId": promo["id"],
        "code": promo["code"],
        "buyerId": buyer_id,
        "orderIds": order_ids,
        "discount": discount,
        "createdAt": datetime.utcnow(),
    })


async def cancel_order(order_id: str) -> None:
    """Commande annulée : retirée de son utilisation du code ; si plus aucune
    commande n'en dépend, l'utilisation est rendue (client et compteur)."""
    redemption = await db.promo_redemptions.find_one_and_update(
        {"orderIds": order_id}, {"$pull": {"orderIds": order_id}}, return_document=ReturnDocument.AFTER)
    if redemption and not redemption.get("orderIds"):
        await db.promo_redemptions.delete_one({"id": redemption["id"]})
        await release({"id": redemption["promoId"]})


# --- Gestion --------------------------------------------------------------------

async def _with_stats(codes: List[dict]) -> List[dict]:
    rows = await db.promo_redemptions.aggregate([
        {"$match": {"promoId": {"$in": [c["id"] for c in codes]}}},
        {"$group": {"_id": "$promoId", "discount": {"$sum": "$discount"}, "orders": {"$sum": {"$size": "$orderIds"}}}},
    ]).to_list(None)
    stats = {r["_id"]: r for r in rows}
    now = datetime.utcnow()
    out = []
    for c in codes:
        try:
            rules.check_validity(c, now)
            state = "running"
        except rules.PromoError as e:
            state = "paused" if not c.get("active", True) else ("scheduled" if "pas encore" in str(e) else "ended")
        s = stats.get(c["id"], {})
        out.append({**c, "label": rules.describe(c), "state": state,
                    "totalDiscount": s.get("discount", 0), "ordersCount": s.get("orders", 0)})
    return out


async def _create(payload: PromoCodeIn, owner_type: str, seller_id: Optional[str], created_by: str) -> dict:
    now = datetime.utcnow()
    doc = {**payload.dict(), "id": f"promo_{uuid.uuid4().hex[:10]}", "ownerType": owner_type,
           "usedCount": 0, "createdAt": now, "updatedAt": now, "createdBy": created_by}
    if owner_type == "seller":
        doc["sellerId"], doc["categories"] = seller_id, []
    try:
        await db.promo_codes.insert_one(dict(doc))
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail=f"Le code {payload.code} existe déjà : choisissez-en un autre.")
    doc.pop("_id", None)
    return (await _with_stats([doc]))[0]


async def _update(query: dict, payload: PromoCodeIn, seller_only: bool) -> dict:
    data = payload.dict()
    if seller_only:
        data.pop("sellerId"), data.pop("categories")
    data["updatedAt"] = datetime.utcnow()
    try:
        doc = await db.promo_codes.find_one_and_update(query, {"$set": data}, projection={"_id": 0},
                                                       return_document=ReturnDocument.AFTER)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail=f"Le code {payload.code} existe déjà : choisissez-en un autre.")
    if not doc:
        raise HTTPException(status_code=404, detail="Code promo introuvable.")
    return (await _with_stats([doc]))[0]


@router.get("/admin/promo-codes", dependencies=[Depends(admin_or_higher_required)])
async def admin_list():
    """Tous les codes, ceux de l'équipe et ceux des vendeurs."""
    return await _with_stats(await db.promo_codes.find({}, {"_id": 0}).sort("createdAt", -1).to_list(1000))


@router.post("/admin/promo-codes", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(admin_or_higher_required)])
async def admin_create(payload: PromoCodeIn, request: Request):
    claims = require_session(request)
    return await _create(payload, "platform", None, f"admin:{claims['sub']}")


@router.put("/admin/promo-codes/{promo_id}", dependencies=[Depends(admin_or_higher_required)])
async def admin_update(promo_id: str, payload: PromoCodeIn):
    return await _update({"id": promo_id}, payload, seller_only=False)


@router.delete("/admin/promo-codes/{promo_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(admin_or_higher_required)])
async def admin_delete(promo_id: str):
    if not (await db.promo_codes.delete_one({"id": promo_id})).deleted_count:
        raise HTTPException(status_code=404, detail="Code promo introuvable.")


def _seller(request: Request) -> str:
    claims = require_session(request)
    if claims.get("typ") != "seller":
        raise HTTPException(status_code=403, detail="Réservé aux vendeurs.")
    return claims["sub"]


@router.get("/seller/promo-codes")
async def seller_list(request: Request):
    seller_id = _seller(request)
    codes = await db.promo_codes.find({"ownerType": "seller", "sellerId": seller_id}, {"_id": 0}) \
        .sort("createdAt", -1).to_list(500)
    return await _with_stats(codes)


@router.post("/seller/promo-codes", status_code=status.HTTP_201_CREATED)
async def seller_create(payload: PromoCodeIn, request: Request):
    seller_id = _seller(request)
    return await _create(payload, "seller", seller_id, f"seller:{seller_id}")


@router.put("/seller/promo-codes/{promo_id}")
async def seller_update(promo_id: str, payload: PromoCodeIn, request: Request):
    seller_id = _seller(request)
    return await _update({"id": promo_id, "ownerType": "seller", "sellerId": seller_id}, payload, seller_only=True)


@router.delete("/seller/promo-codes/{promo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def seller_delete(promo_id: str, request: Request):
    seller_id = _seller(request)
    result = await db.promo_codes.delete_one({"id": promo_id, "ownerType": "seller", "sellerId": seller_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Code promo introuvable.")


async def ensure_indexes() -> None:
    await db.promo_codes.create_index("code", unique=True)
    await db.promo_codes.create_index("id", unique=True)
    await db.promo_redemptions.create_index([("promoId", 1), ("buyerId", 1)])
