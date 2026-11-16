"""
Coordonnées GPS d'une adresse (points de retrait) et distances.

Géocodage par Nominatim (OpenStreetMap) : une requête à la fois, au plus une
par seconde (règles d'usage), avec un User-Agent qui identifie le service.
On essaie l'adresse complète, puis la ville seule.
"""
import asyncio
import math
import re
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


# --- Suggestions d'adresses pendant la saisie -------------------------------
#
# Nominatim interdit l'autocomplétion : les suggestions passent par Photon
# (komoot), fait pour cela, sur les mêmes données OpenStreetMap. Requêtes
# limitées au Cameroun, gardées en cache, et le formulaire attend une pause
# dans la frappe avant d'appeler.

PHOTON_URL = "https://photon.komoot.io/api/"
CAMEROON_BBOX = "8.4,1.6,16.3,13.1"  # lon min, lat min, lon max, lat max
SUGGEST_MIN_CHARS = 3
SUGGEST_LIMIT = 6
_CACHE_TTL = 24 * 3600
_CACHE_MAX = 500
_suggest_cache: dict = {}
_suggest_lock = asyncio.Lock()
_last_suggest = 0.0
SUGGEST_MIN_INTERVAL = 0.3  # secondes entre deux appels à Photon

_ARRONDISSEMENT = re.compile(r"\s+(?:[IVX]+|\d+)(?:er|e|ème)?$", re.IGNORECASE)
_REGION_PREFIX = re.compile(r"^(?:région|region)\s+(?:du|de la|de l'|de l’|des|de)?\s*", re.IGNORECASE)


class SuggestUnavailable(Exception):
    """Service de suggestions injoignable."""


def clean_city(city: Optional[str]) -> str:
    """« Douala I », « Yaoundé IIIe » → « Douala », « Yaoundé » (forme de la liste)."""
    from catalog_rules import normalize_city
    city = _ARRONDISSEMENT.sub("", (city or "").strip())
    return normalize_city(city) or ""


def clean_region(region: Optional[str]) -> str:
    """« Région du Littoral » → « Littoral » (forme des points de retrait)."""
    region = (region or "").strip()
    region = _REGION_PREFIX.sub("", region).strip()
    return region[:1].upper() + region[1:] if region else ""


def parse_photon(features: list) -> list:
    """Suggestions lisibles : adresse (lieu, rue, quartier), ville, région, GPS."""
    out, seen = [], set()
    for feature in features:
        props = feature.get("properties") or {}
        coords = (feature.get("geometry") or {}).get("coordinates") or []
        if props.get("countrycode", "CM").upper() != "CM" or len(coords) != 2:
            continue
        city = clean_city(props.get("city") or props.get("locality")
                          or (props.get("name") if props.get("type") == "city" else None))
        street = props.get("street") or ""
        if street and props.get("housenumber"):
            street = f"{street} {props['housenumber']}"
        parts = []
        for value in (props.get("name"), street, props.get("district") or props.get("locality")):
            value = (value or "").strip()
            if value and value.lower() not in {p.lower() for p in parts} and clean_city(value) != city:
                parts.append(value)
        address = ", ".join(parts) or city
        if not address:
            continue
        key = (address.lower(), city.lower())
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "address": address,
            "city": city,
            "region": clean_region(props.get("state")),
            # Ligne affichée dans la liste : adresse, puis ville si elle n'y est pas
            "label": address if not city or city.lower() in address.lower() else f"{address}, {city}",
            "latitude": round(float(coords[1]), 6),
            "longitude": round(float(coords[0]), 6),
        })
    return out


def _photon(query: str) -> list:
    response = requests.get(
        PHOTON_URL,
        params={"q": query, "limit": SUGGEST_LIMIT + 4, "lang": "fr", "bbox": CAMEROON_BBOX},
        headers={"User-Agent": USER_AGENT},
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json().get("features") or []


async def suggest(query: str) -> list:
    """Adresses correspondant au début de saisie ; [] si trop court."""
    global _last_suggest
    query = " ".join((query or "").split())[:100]
    if len(query) < SUGGEST_MIN_CHARS:
        return []
    key = query.lower()
    cached = _suggest_cache.get(key)
    if cached and time.monotonic() - cached[0] < _CACHE_TTL:
        return cached[1]
    async with _suggest_lock:
        wait = SUGGEST_MIN_INTERVAL - (time.monotonic() - _last_suggest)
        if wait > 0:
            await asyncio.sleep(wait)
        _last_suggest = time.monotonic()
        try:
            features = await asyncio.to_thread(_photon, query)
        except Exception as exc:
            raise SuggestUnavailable(str(exc)) from exc
    items = parse_photon(features)[:SUGGEST_LIMIT]
    if len(_suggest_cache) >= _CACHE_MAX:
        _suggest_cache.pop(next(iter(_suggest_cache)))
    _suggest_cache[key] = (time.monotonic(), items)
    return items


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance à vol d'oiseau (formule de haversine)."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
