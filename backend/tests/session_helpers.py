"""Requêtes factices pour les tests : session (jeton déjà vérifié par
IdentityMiddleware) et en-têtes d'identité hérités."""
from typing import Optional

from starlette.requests import Request


def fake_request(claims: Optional[dict] = None, headers: Optional[dict] = None) -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "state": {"auth": claims} if claims else {},
    }
    return Request(scope)


def session(user_type: str, user_id: str, role: Optional[str] = None) -> Request:
    claims = {"sub": user_id, "typ": user_type}
    if role:
        claims["role"] = role
    return fake_request(claims)
