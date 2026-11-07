"""API de l'assistant Nengoo, commune au site et à l'application."""
import os
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

import assistant as core
import server
from assistant_tools import Catalog
from login_limiter import client_ip

router = APIRouter(tags=["assistant"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)
    # Fiches montrées avec cette réponse : le modèle peut y revenir
    productIds: List[str] = Field(default_factory=list, max_length=6)


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(min_length=1, max_length=12)
    language: Literal["fr", "en"] = "fr"
    # Identifiant aléatoire créé par le client : compte les conversations, sans identifier personne
    conversationId: Optional[str] = Field(None, pattern=r"^[\w-]{8,64}$")
    # Fiche produit ouverte (id ou slug)
    productId: Optional[str] = Field(None, pattern=r"^[\w-]{1,120}$")


@router.post("/assistant/chat")
async def chat(payload: ChatRequest, request: Request):
    if os.environ.get("AI_ASSISTANT_ENABLED", "true").strip().lower() == "false":
        raise HTTPException(status_code=503, detail="L'assistant est momentanément indisponible.")
    history = [m.model_dump() for m in payload.messages]
    if history[-1]["role"] != "user" or not history[-1]["content"].strip():
        raise HTTPException(status_code=422, detail="Le dernier message doit venir du client.")
    if len(history[-1]["content"]) > 500:
        raise HTTPException(status_code=422, detail="Message trop long (500 caractères au maximum).")

    wait = core.over_limit(client_ip(request), payload.conversationId)
    if wait is not None:
        raise HTTPException(
            status_code=429,
            detail="Tu as envoyé beaucoup de messages. Réessaie un peu plus tard.",
            headers={"Retry-After": str(wait)},
        )

    catalog = Catalog(server.db, server.category_search_names, server.log_search_miss)
    reply = await core.answer(server.db, catalog, history, payload.language,
                              payload.conversationId, payload.productId)
    return {
        "reply": reply.text,
        "products": reply.products,
        "action": reply.action,
        # « catalog » : réponse sans IA, tirée directement du catalogue
        "mode": reply.mode,
    }


@router.get("/admin/assistant/stats", dependencies=[Depends(server.moderator_or_higher_required)])
async def assistant_stats(days: int = Query(30, ge=1, le=180)):
    """Usage, coût par conversation et état des fournisseurs (jamais les clés)."""
    return await core.stats(server.db, days)
