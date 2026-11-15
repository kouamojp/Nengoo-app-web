"""
Modification de son profil par un client (PUT /api/buyers/me) : nom, e-mail
et numéro WhatsApp.

Le numéro WhatsApp sert d'identifiant de connexion : le changer demande le
mot de passe actuel (sauf compte sans mot de passe, connecté par Google), et
le nouveau numéro ne doit pas déjà servir à un autre compte client.
"""
import re
from typing import Callable, Optional

from fastapi import HTTPException
from pydantic import BaseModel

from account_email import ensure_email_free

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class BuyerSelfUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    # Exigé pour changer de numéro WhatsApp
    currentPassword: Optional[str] = None


async def update_own_profile(
    users,
    buyer_id: str,
    data: BuyerSelfUpdate,
    *,
    normalize_whatsapp: Callable[[str], str],
    whatsapp_lookup: Callable[[str], dict],
    verify_password: Callable[[str, str], bool],
) -> dict:
    """Applique les changements et renvoie le document à jour ; 400/401/404 sinon."""
    buyer = await users.find_one({"id": buyer_id, "type": "buyer"})
    if not buyer:
        raise HTTPException(status_code=404, detail="Compte introuvable.")

    changes = {}

    if data.name is not None:
        name = " ".join(data.name.split())
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Saisissez votre nom complet.")
        if len(name) > 100:
            raise HTTPException(status_code=400, detail="Le nom ne doit pas dépasser 100 caractères.")
        if name != buyer.get("name"):
            changes["name"] = name

    if data.email is not None:
        email = data.email.strip()
        if not EMAIL_PATTERN.match(email):
            raise HTTPException(status_code=400, detail="Saisissez une adresse e-mail valide.")
        email = await ensure_email_free(users, email, "buyer", buyer_id)
        if email != (buyer.get("email") or "").lower():
            changes["email"] = email

    if data.whatsapp is not None:
        whatsapp = normalize_whatsapp(data.whatsapp)
        if len(re.sub(r"\D", "", whatsapp)) < 8:
            raise HTTPException(status_code=400, detail="Saisissez un numéro WhatsApp valide.")
        if whatsapp != normalize_whatsapp(buyer.get("whatsapp") or ""):
            if buyer.get("password") and not (
                data.currentPassword and verify_password(data.currentPassword, buyer["password"])
            ):
                raise HTTPException(
                    status_code=401,
                    detail="Mot de passe incorrect : il est demandé pour changer de numéro WhatsApp.",
                )
            other = await users.find_one(
                {**whatsapp_lookup(whatsapp), "type": "buyer", "id": {"$ne": buyer_id}})
            if other:
                raise HTTPException(status_code=400, detail="Un compte avec ce numéro WhatsApp existe déjà")
            changes["whatsapp"] = whatsapp

    if changes:
        await users.update_one({"id": buyer_id, "type": "buyer"}, {"$set": changes})
        buyer = {**buyer, **changes}
    return buyer
