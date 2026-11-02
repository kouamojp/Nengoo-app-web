"""
Jetons d'accès (JWT) et middleware d'identité.

Historique : le site et l'app s'identifiaient avec de simples en-têtes
(X-Seller-Id, X-Buyer-Id, X-User-Id, X-Admin-Role…) que n'importe qui pouvait
forger. Les routes lisent toujours ces en-têtes ; ce middleware les rend fiables :

- requête avec un JWT valide (Authorization: Bearer <jwt>) : les en-têtes
  d'identité envoyés doivent correspondre au jeton (sinon 403) et ceux qui
  manquent sont ajoutés à partir du jeton ;
- requête sans JWT : les anciens en-têtes vendeur/acheteur sont acceptés tant
  que LEGACY_AUTH_HEADERS=true (transition). Une fois le site et l'app
  déployés, passer LEGACY_AUTH_HEADERS=false : toute identité doit alors venir
  d'un JWT.

Les droits administrateur ne viennent QUE d'un jeton admin, même pendant la
transition : X-Admin-Role et X-Admin-Id envoyés par le client sont toujours
ignorés, puis remis à partir du jeton.
"""
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
_PLACEHOLDER_SECRETS = {"", "changeme", "change-me", "your-secret-key"}

TOKEN_LIFETIME = {
    "seller": timedelta(days=30),
    "buyer": timedelta(days=30),
    "admin": timedelta(hours=12),
}

# En-têtes d'identité lus par les routes (noms HTTP en minuscules)
_ID_HEADERS = {b"x-user-id", b"user-id", b"sender-id"}
_TYPE_HEADERS = {b"x-user-type", b"user-type", b"sender-type"}
_ADMIN_HEADERS = {b"x-admin-role", b"x-admin-id"}
_IDENTITY_HEADERS = (
    _ID_HEADERS | _TYPE_HEADERS | _ADMIN_HEADERS | {b"x-seller-id", b"x-buyer-id"}
)


def _secret() -> Optional[str]:
    secret = os.environ.get("JWT_SECRET_KEY", "").strip()
    return None if secret.lower() in _PLACEHOLDER_SECRETS else secret


def legacy_headers_allowed() -> bool:
    return os.environ.get("LEGACY_AUTH_HEADERS", "true").strip().lower() != "false"


def create_access_token(subject: str, user_type: str, role: Optional[str] = None) -> Optional[str]:
    """Jeton signé pour un vendeur, un acheteur ou un admin.
    Renvoie None si JWT_SECRET_KEY n'est pas configurée (mode transition)."""
    secret = _secret()
    if not secret:
        logger.warning("JWT_SECRET_KEY absente : aucun jeton émis, en-têtes hérités seulement")
        return None
    now = datetime.now(timezone.utc)
    claims = {
        "sub": subject,
        "typ": user_type,
        "iat": now,
        "exp": now + TOKEN_LIFETIME.get(user_type, timedelta(days=1)),
    }
    if role:
        claims["role"] = role
    return jwt.encode(claims, secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Lève jwt.PyJWTError si le jeton est invalide ou expiré."""
    secret = _secret()
    if not secret:
        raise jwt.InvalidTokenError("JWT désactivé")
    claims = jwt.decode(token, secret, algorithms=[ALGORITHM], options={"require": ["sub", "typ", "exp"]})
    if claims.get("typ") not in TOKEN_LIFETIME:
        raise jwt.InvalidTokenError("Type de jeton inconnu")
    return claims


def _looks_like_jwt(token: str) -> bool:
    return token.count(".") == 2


def _check_and_complete(headers: dict, claims: dict) -> Optional[str]:
    """Vérifie les en-têtes d'identité contre le jeton et complète ceux qui
    manquent. Renvoie un message d'erreur, ou None si tout concorde."""
    sub, typ, role = claims["sub"], claims["typ"], claims.get("role")

    if typ == "admin":
        # Un admin peut agir pour un vendeur ou un acheteur (gestion), mais son
        # rôle et son identifiant viennent du jeton (les pages envoient encore
        # un rôle écrit en dur : il est remplacé, pas comparé).
        if role:
            headers[b"x-admin-role"] = role.encode()
        headers[b"x-admin-id"] = sub.encode()
        return None

    own_id_header = b"x-seller-id" if typ == "seller" else b"x-buyer-id"
    other_id_header = b"x-buyer-id" if typ == "seller" else b"x-seller-id"
    if other_id_header in headers:
        return "Type de compte incohérent avec la session"
    for name in _ID_HEADERS | {own_id_header}:
        if name in headers and headers[name] != sub.encode():
            return "Identifiant incohérent avec la session"
    for name in _TYPE_HEADERS:
        if name in headers and headers[name] != typ.encode():
            return "Type de compte incohérent avec la session"

    headers[own_id_header] = sub.encode()
    headers.setdefault(b"x-user-id", sub.encode())
    headers.setdefault(b"x-user-type", typ.encode())
    return None


class IdentityMiddleware:
    """Middleware ASGI : à enregistrer AVANT CORSMiddleware pour que ses
    réponses d'erreur portent les en-têtes CORS."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") == "OPTIONS":
            return await self.app(scope, receive, send)

        headers = {}
        for name, value in scope.get("headers", []):
            headers[name.lower()] = value  # dernier gagnant, comme Starlette
        # Jamais de droits admin déclarés par le client
        for name in _ADMIN_HEADERS:
            headers.pop(name, None)

        auth = headers.get(b"authorization", b"").decode("latin-1")
        token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""

        if token and _looks_like_jwt(token):
            try:
                claims = decode_access_token(token)
            except jwt.ExpiredSignatureError:
                return await _reject(send, 401, "Session expirée, reconnectez-vous", "token_expired")
            except jwt.PyJWTError:
                return await _reject(send, 401, "Session invalide, reconnectez-vous", "token_invalid")

            error = _check_and_complete(headers, claims)
            if error:
                return await _reject(send, 403, error, "identity_mismatch")
            # Les routes qui lisent « Authorization » comme un id hérité
            # reçoivent l'identifiant du jeton
            headers[b"authorization"] = f"Bearer {claims['sub']}".encode()
            scope = dict(scope)
            scope["headers"] = list(headers.items())
            scope.setdefault("state", {})["auth"] = claims
            return await self.app(scope, receive, send)

        uses_identity = bool(token) or any(h in headers for h in _IDENTITY_HEADERS)
        if uses_identity and not legacy_headers_allowed():
            return await _reject(send, 401, "Authentification requise", "auth_required")
        scope = dict(scope)
        scope["headers"] = list(headers.items())
        return await self.app(scope, receive, send)


async def _reject(send, status: int, detail: str, code: str):
    body = json.dumps({"detail": detail, "code": code}).encode()
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
    })
    await send({"type": "http.response.body", "body": body})
