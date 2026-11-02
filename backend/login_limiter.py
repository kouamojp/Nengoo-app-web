"""
Limite les tentatives de connexion ratées (force brute sur les mots de passe).

Deux compteurs par tentative, sur une fenêtre glissante :
- par numéro WhatsApp visé : 5 échecs en 15 minutes ;
- par adresse IP : 20 échecs en 15 minutes (plusieurs numéros essayés).

Au-delà, la route répond 429 jusqu'à la fin de la fenêtre. Une connexion
réussie remet à zéro le compteur du numéro. Les compteurs sont en mémoire,
propres à chaque processus du serveur : un redémarrage les vide.
"""
import re
import time
from collections import defaultdict, deque
from typing import Optional

from fastapi import HTTPException, Request

WINDOW_SECONDS = 15 * 60
MAX_PER_ACCOUNT = 5
MAX_PER_IP = 20

_failures: dict = defaultdict(deque)


def client_ip(request: Request) -> str:
    # Derrière le proxy de l'hébergeur, l'IP du client est le premier
    # élément de X-Forwarded-For
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _keys(scope: str, request: Request, identifier: Optional[str]):
    keys = [(f"{scope}:ip:{client_ip(request)}", MAX_PER_IP)]
    digits = re.sub(r"\D", "", identifier or "")[-9:]
    if digits:
        keys.append((f"{scope}:id:{digits}", MAX_PER_ACCOUNT))
    return keys


def _recent(key: str, now: float) -> deque:
    attempts = _failures[key]
    while attempts and attempts[0] <= now - WINDOW_SECONDS:
        attempts.popleft()
    return attempts


def check(scope: str, request: Request, identifier: Optional[str]) -> None:
    """Lève 429 si le numéro ou l'IP a dépassé son quota d'échecs."""
    now = time.monotonic()
    for key, limit in _keys(scope, request, identifier):
        attempts = _recent(key, now)
        if len(attempts) >= limit:
            retry_after = int(attempts[0] + WINDOW_SECONDS - now) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Trop de tentatives. Réessayez dans {retry_after // 60 + 1} minutes.",
                headers={"Retry-After": str(retry_after)},
            )


def record_failure(scope: str, request: Request, identifier: Optional[str]) -> None:
    now = time.monotonic()
    for key, _ in _keys(scope, request, identifier):
        _recent(key, now).append(now)


def record_success(scope: str, request: Request, identifier: Optional[str]) -> None:
    for key, _ in _keys(scope, request, identifier)[1:]:
        _failures.pop(key, None)


def reset() -> None:
    _failures.clear()
