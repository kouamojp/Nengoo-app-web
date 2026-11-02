"""Tests de la limite de tentatives de connexion.

Lancer depuis backend/ :  python -m pytest tests/test_login_limiter.py
"""
import os
import sys

import pytest
from fastapi import HTTPException
from starlette.requests import Request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import login_limiter  # noqa: E402


def request(ip="1.2.3.4"):
    return Request({
        "type": "http",
        "headers": [(b"x-forwarded-for", f"{ip}, 10.0.0.1".encode())],
        "client": ("10.0.0.1", 1234),
    })


def setup_function():
    login_limiter.reset()


def fail(n, number="+237 690 70 36 89", ip="1.2.3.4", scope="seller"):
    for _ in range(n):
        login_limiter.check(scope, request(ip), number)
        login_limiter.record_failure(scope, request(ip), number)


def test_account_blocked_after_five_failures_whatever_the_format():
    fail(5)
    with pytest.raises(HTTPException) as exc:
        # Même numéro écrit autrement, depuis une autre IP
        login_limiter.check("seller", request("5.6.7.8"), "690703689")
    assert exc.value.status_code == 429
    assert int(exc.value.headers["Retry-After"]) > 0


def test_success_resets_the_account_counter():
    fail(4)
    login_limiter.record_success("seller", request(), "690703689")
    fail(4)  # ne lève pas


def test_ip_blocked_after_twenty_failures_on_different_numbers():
    for i in range(20):
        fail(1, number=f"69000{i:04d}")
    with pytest.raises(HTTPException):
        login_limiter.check("seller", request(), "655555555")
    # Une autre IP n'est pas concernée
    login_limiter.check("seller", request("9.9.9.9"), "655555555")


def test_scopes_are_separate():
    fail(5, scope="admin")
    login_limiter.check("buyer", request(), "+237 690 70 36 89")


def test_window_expiry(monkeypatch):
    fail(5)
    real = login_limiter.time.monotonic()
    monkeypatch.setattr(login_limiter.time, "monotonic", lambda: real + login_limiter.WINDOW_SECONDS + 1)
    login_limiter.check("seller", request(), "690703689")
