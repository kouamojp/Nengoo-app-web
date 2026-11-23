"""Fiche produit proposée par l'IA à partir d'une photo (site vendeur et application).

POST /products/ai-draft renvoie un brouillon ; il ne crée jamais de produit.
Voir product_draft.py.
"""
import asyncio
import os
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

import assistant as core
import product_draft as drafts
import server
from login_limiter import client_ip
from routers import media

router = APIRouter(tags=["products"])


class DraftRequest(BaseModel):
    # Photos en data URL (JPEG, PNG ou WebP, 8 Mo au plus chacune)
    images: List[str] = Field(default_factory=list, max_length=drafts.MAX_IMAGES)
    # Ou photos déjà dans la médiathèque (notre bucket uniquement)
    imageUrls: List[str] = Field(default_factory=list, max_length=drafts.MAX_IMAGES)
    price: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=120)
    kind: Literal["product", "service", "meal"] = "product"
    language: Literal["fr", "en"] = "fr"


@router.post("/products/ai-draft", dependencies=[Depends(server.seller_or_moderator_or_higher_required)])
async def ai_draft(payload: DraftRequest, request: Request,
                   seller_id: Optional[str] = Depends(server.get_current_seller_optional)):
    if os.environ.get("AI_PRODUCT_DRAFT_ENABLED", "true").strip().lower() == "false":
        raise HTTPException(status_code=503, detail="La rédaction automatique est momentanément indisponible.")
    if any(len(image) > 11_500_000 for image in payload.images):
        raise HTTPException(status_code=413, detail="Photo trop lourde (8 Mo au plus).")

    wait = drafts.over_limit(f"seller:{seller_id}" if seller_id else f"ip:{client_ip(request)}")
    if wait is not None:
        raise HTTPException(
            status_code=429,
            detail="Vous avez demandé beaucoup de fiches. Réessayez un peu plus tard.",
            headers={"Retry-After": str(wait)},
        )

    category = await server.db.categories.find_one({"id": payload.category}, {"_id": 0, "name": 1, "nameEn": 1, "parentId": 1})
    if not category:
        raise HTTPException(status_code=400, detail="Choisissez une catégorie existante.")
    parent = None
    if category.get("parentId"):
        parent = await server.db.categories.find_one({"id": category["parentId"]}, {"_id": 0, "name": 1, "nameEn": 1})
    label_key = "nameEn" if payload.language == "en" else "name"
    label = " › ".join(filter(None, [
        (parent or {}).get(label_key) or (parent or {}).get("name"),
        category.get(label_key) or category.get("name"),
    ]))

    sources = list(payload.images)
    for url in payload.imageUrls:
        try:
            sources.append(await media.image_data_url(url))
        except ValueError:  # adresse externe (ajoutée par URL) : l'IA ne la lit pas
            continue
    sources = sources[:drafts.MAX_IMAGES]
    if not sources:
        raise HTTPException(status_code=422, detail="Ajoutez une photo depuis la médiathèque pour que l'IA puisse l'analyser.")
    try:
        images = [await asyncio.to_thread(core.prepare_image, image) for image in sources]
    except ValueError:
        raise HTTPException(status_code=422, detail="Photo illisible. Essayez avec une image JPEG ou PNG.") from None

    try:
        draft = await drafts.generate(server.db, images, payload.price, label, payload.kind, payload.language)
    except drafts.DraftRejected:
        raise HTTPException(
            status_code=422,
            detail="La photo ne montre pas clairement un article. Essayez avec une photo du produit seul.",
        ) from None
    except drafts.DraftUnavailable:
        raise HTTPException(
            status_code=503,
            detail="La rédaction automatique est indisponible pour le moment. Remplissez la fiche vous-même.",
        ) from None
    return draft.as_dict()
