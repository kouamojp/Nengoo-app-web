"""Tests du middleware d'identité (sans base de données ni client HTTP).

Lancer depuis backend/ :  python -m pytest tests/test_auth_tokens.py
"""
import asyncio
import json
import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import auth_tokens  # noqa: E402
from auth_tokens import IdentityMiddleware, create_access_token  # noqa: E402

SECRET = "test-secret-0123456789abcdef0123456789abcdef"


def call(headers, method="GET"):
    """Exécute le middleware ; renvoie (status, en-têtes vus par l'app, corps)."""
    seen = {}

    async def app(scope, receive, send):
        seen["headers"] = {k.decode(): v.decode() for k, v in scope["headers"]}
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})

    sent = []

    async def send(message):
        sent.append(message)

    async def receive():
        return {"type": "http.request", "body": b""}

    scope = {
        "type": "http",
        "method": method,
        "path": "/api/products",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
    }
    asyncio.run(IdentityMiddleware(app)(scope, receive, send))
    status = sent[0]["status"]
    body = sent[1]["body"]
    return status, seen.get("headers"), (json.loads(body) if status != 200 else body)


def setup_function():
    os.environ["JWT_SECRET_KEY"] = SECRET
    os.environ["LEGACY_AUTH_HEADERS"] = "true"


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_seller_token_injects_identity_headers():
    token = create_access_token("seller_1", "seller")
    status, headers, _ = call(bearer(token))
    assert status == 200
    assert headers["x-seller-id"] == "seller_1"
    assert headers["x-user-type"] == "seller"
    # Les routes héritées lisent Authorization comme un identifiant
    assert headers["authorization"] == "Bearer seller_1"


def test_seller_cannot_impersonate_another_seller():
    token = create_access_token("seller_1", "seller")
    status, _, body = call({**bearer(token), "X-Seller-Id": "seller_2"})
    assert status == 403 and body["code"] == "identity_mismatch"


def test_seller_cannot_claim_admin_role():
    token = create_access_token("seller_1", "seller")
    status, _, _ = call({**bearer(token), "X-Admin-Role": "super_admin"})
    assert status == 403


def test_admin_role_comes_from_token():
    token = create_access_token("admin_1", "admin", "moderator")
    status, headers, _ = call(bearer(token))
    assert status == 200 and headers["x-admin-role"] == "moderator"
    status, _, _ = call({**bearer(token), "X-Admin-Role": "super_admin"})
    assert status == 403


def test_admin_may_act_for_a_seller():
    token = create_access_token("admin_1", "admin", "admin")
    status, headers, _ = call({**bearer(token), "X-Seller-Id": "seller_9"})
    assert status == 200 and headers["x-seller-id"] == "seller_9"


def test_expired_and_forged_tokens_rejected():
    auth_tokens.TOKEN_LIFETIME["seller"] = timedelta(seconds=-1)
    try:
        expired = create_access_token("seller_1", "seller")
    finally:
        auth_tokens.TOKEN_LIFETIME["seller"] = timedelta(days=30)
    status, _, body = call(bearer(expired))
    assert status == 401 and body["code"] == "token_expired"

    forged = create_access_token("seller_1", "seller")[:-4] + "AAAA"
    status, _, body = call(bearer(forged))
    assert status == 401 and body["code"] == "token_invalid"


def test_legacy_headers_during_transition_only():
    status, headers, _ = call({"X-Seller-Id": "seller_1"})
    assert status == 200 and headers["x-seller-id"] == "seller_1"

    os.environ["LEGACY_AUTH_HEADERS"] = "false"
    status, _, body = call({"X-Seller-Id": "seller_1"})
    assert status == 401 and body["code"] == "auth_required"
    # Bearer non-JWT (ancien « token = id ») refusé aussi
    status, _, _ = call(bearer("buyer_123"))
    assert status == 401
    # Requêtes anonymes toujours servies (catalogue public)
    status, _, _ = call({})
    assert status == 200


def test_preflight_is_never_blocked():
    os.environ["LEGACY_AUTH_HEADERS"] = "false"
    status, _, _ = call({"X-Seller-Id": "seller_1"}, method="OPTIONS")
    assert status == 200


def test_no_secret_means_no_token():
    os.environ["JWT_SECRET_KEY"] = ""
    assert create_access_token("seller_1", "seller") is None
