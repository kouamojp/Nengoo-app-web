"""
Identité tirée du seul jeton de session (JWT vérifié par IdentityMiddleware).

Les anciens en-têtes d'identité (X-Seller-Id, X-Buyer-Id, X-User-Id…) sont
encore acceptés sans jeton tant que LEGACY_AUTH_HEADERS=true : n'importe qui
peut alors se faire passer pour un autre compte. Les routes qui exposent des
données privées (conversations, adresses, notifications, chiffre d'affaires,
profil complet) ou qui touchent au compte s'appuient sur ce module, qui
n'accepte que le jeton, quel que soit ce réglage.
"""
from typing import Optional

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

STAFF_ROLES = {"super_admin", "admin", "moderator", "support"}


class SessionRequired(Exception):
    """Pas de session valide : 401 avec le code que le site et l'app
    reconnaissent (retour à l'écran de connexion)."""


def session_claims(request: Request) -> Optional[dict]:
    return (request.scope.get("state") or {}).get("auth")


def require_session(request: Request) -> dict:
    claims = session_claims(request)
    if not claims:
        raise SessionRequired()
    return claims


def is_staff(claims: Optional[dict], roles=STAFF_ROLES) -> bool:
    return bool(claims) and claims.get("typ") == "admin" and claims.get("role") in roles


def is_account(claims: Optional[dict], user_type: str, user_id: str) -> bool:
    return bool(claims) and claims.get("typ") == user_type and claims.get("sub") == user_id


def require_account_or_staff(request: Request, user_type: str, user_id: str, roles=STAFF_ROLES) -> dict:
    """Le compte lui-même, ou un membre de l'équipe ; sinon 401/403."""
    claims = require_session(request)
    if not (is_account(claims, user_type, user_id) or is_staff(claims, roles)):
        raise HTTPException(status_code=403, detail="Accès réservé au titulaire du compte.")
    return claims


def install(app) -> None:
    @app.exception_handler(SessionRequired)
    async def _session_required(_request, _exc):
        return JSONResponse(
            status_code=401,
            content={"detail": "Connectez-vous pour continuer.", "code": "auth_required"},
        )
