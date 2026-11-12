"""
Coordonnées GPS d'une adresse (points de retrait) et distances.

Géocodage par Nominatim (OpenStreetMap) : une requête à la fois, au plus une
par seconde (règles d'usage), avec un User-Agent qui identifie le service.
On essaie l'adresse complète, puis la ville seule.
"""
import asyncio
import math
import time
from typing import Optional, Tuple

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "Nengoo/1.0 (+https://www.nengoo.com)"
TIMEOUT_SECONDS = 6

_lock = asyncio.Lock()
_last_call = 0.0


def _search(query: str) -> Optional[Tuple[float, float]]:
    response = requests.get(
        NOMINATIM_URL,
        params={"q": query, "format": "json", "limit": 1, "countrycodes": "cm"},
        headers={"User-Agent": USER_AGENT, "Accept-Language": "fr"},
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    results = response.json()
    if not results:
        return None
    return float(results[0]["lat"]), float(results[0]["lon"])


async def geocode(address: Optional[str], city: Optional[str], region: Optional[str] = None
                  ) -> Optional[Tuple[float, float]]:
    """(latitude, longitude) de l'adresse, sinon de la ville ; None si introuvable."""
    global _last_call
    parts = [p.strip() for p in (address, city, region) if p and p.strip()]
    queries = [", ".join(parts + ["Cameroun"])]
    if city and city.strip():
        queries.append(f"{city.strip()}, Cameroun")
    async with _lock:
        for query in dict.fromkeys(queries):
            wait = 1.0 - (time.monotonic() - _last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            _last_call = time.monotonic()
            try:
                found = await asyncio.to_thread(_search, query)
            except Exception as exc:  # réseau, quota : on réessaiera plus tard
                print(f"Géocodage impossible pour « {query} » : {exc}")
                return None
            if found:
                return found
    return None


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance à vol d'oiseau (formule de haversine)."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
