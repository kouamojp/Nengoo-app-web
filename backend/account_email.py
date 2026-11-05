"""
Un e-mail ne sert qu'à un seul compte par type : une même personne peut être
acheteuse et vendeuse avec la même adresse, mais pas avoir deux comptes vendeur.

Les e-mails sont enregistrés en minuscules. L'index unique créé par
migrations/unique_emails_2026_11 garantit la règle même entre deux requêtes
simultanées ; les contrôles d'ici donnent un message clair avant d'y arriver.
Un compte peut rester sans e-mail (client invité au moment de la commande).
"""
import re
from typing import Optional

from fastapi import HTTPException

EMAIL_TAKEN = "Un compte existe déjà avec cet e-mail."


def normalize_email(raw: Optional[str]) -> str:
    return (raw or "").strip().lower()


def account_query(email: str, user_type: str) -> dict:
    """Sans tenir compte de la casse : d'anciens comptes peuvent avoir des majuscules."""
    query = {"email": {"$regex": f"^{re.escape(email.strip())}$", "$options": "i"}}
    if user_type == "buyer":
        query["type"] = "buyer"
    return query


async def email_taken(collection, email: Optional[str], user_type: str,
                      exclude_id: Optional[str] = None) -> bool:
    email = normalize_email(email)
    if not email:
        return False
    query = account_query(email, user_type)
    if exclude_id:
        query["id"] = {"$ne": exclude_id}
    return await collection.find_one(query) is not None


async def ensure_email_free(collection, email: Optional[str], user_type: str,
                            exclude_id: Optional[str] = None) -> str:
    """E-mail normalisé, ou erreur 400 s'il sert déjà à un autre compte."""
    if await email_taken(collection, email, user_type, exclude_id):
        raise HTTPException(status_code=400, detail=EMAIL_TAKEN)
    return normalize_email(email)
