"""
Code de réinitialisation du mot de passe, à saisir dans l'app mobile.

Il accompagne le lien envoyé par e-mail : le lien ne peut pas rouvrir l'app,
le code si. Six chiffres se devinent vite : le code est stocké haché, expire
en 15 minutes et tombe après 5 essais ratés.
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional

import bcrypt

from account_email import account_query

CODE_TTL = timedelta(minutes=15)
MAX_ATTEMPTS = 5
MIN_PASSWORD_LENGTH = 6  # comme à l'inscription

# À appliquer ($set) dès qu'un mot de passe a été changé
CLEARED_FIELDS = {
    "reset_token": None,
    "reset_token_expiry": None,
    "reset_code_hash": None,
    "reset_code_expiry": None,
    "reset_code_attempts": 0,
}


def new_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def code_fields(code: str, now: Optional[datetime] = None) -> dict:
    return {
        "reset_code_hash": bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode(),
        "reset_code_expiry": (now or datetime.utcnow()) + CODE_TTL,
        "reset_code_attempts": 0,
    }


async def account_for_code(collection, email: str, user_type: str, code: str,
                           now: Optional[datetime] = None) -> Optional[dict]:
    """Compte dont le code est bon, sinon None. Chaque essai est compté, de façon
    atomique pour que des requêtes simultanées ne dépassent pas la limite."""
    account = await collection.find_one_and_update(
        {
            **account_query(email, user_type),
            "reset_code_expiry": {"$gt": now or datetime.utcnow()},
            "reset_code_attempts": {"$lt": MAX_ATTEMPTS},
        },
        {"$inc": {"reset_code_attempts": 1}},
    )
    if not account or not account.get("reset_code_hash"):
        return None
    if not bcrypt.checkpw(code.strip().encode(), account["reset_code_hash"].encode()):
        return None
    return account
