"""
Geocoding proxy using OpenStreetMap's Nominatim service.

Nominatim is free and requires no API key, but enforces a strict 1 req/sec
rate limit and requires a descriptive User-Agent. We proxy through the
backend so:
  • the rate limit is enforced server-side across all clients
  • the User-Agent header can be set correctly
  • lightweight in-memory caching reduces repeat lookups
"""
from __future__ import annotations
import asyncio
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
import httpx

from app.core.firebase_auth import get_firebase_user

router = APIRouter(prefix="/geocode", tags=["Geocoding"])

_NOMINATIM = "https://nominatim.openstreetmap.org"
_USER_AGENT = "AIVENTRA-Forensic-Platform/1.1 (https://github.com/aiventra)"

# VULN-027 fix: bounded LRU cache instead of unbounded dict
from collections import OrderedDict

_CACHE_MAX_SIZE = 2000


class _BoundedCache:
    """Simple LRU cache with max size to prevent memory exhaustion."""

    def __init__(self, max_size: int = _CACHE_MAX_SIZE):
        self._store: OrderedDict[str, dict] = OrderedDict()
        self._max_size = max_size

    def get(self, key: str) -> dict | None:
        if key in self._store:
            self._store.move_to_end(key)
            return self._store[key]
        return None

    def set(self, key: str, value: dict) -> None:
        self._store[key] = value
        self._store.move_to_end(key)
        while len(self._store) > self._max_size:
            self._store.popitem(last=False)


_cache = _BoundedCache()
_last_request_at: float = 0.0
_rate_limit_lock = asyncio.Lock()


async def _rate_limit():
    """Enforce 1 req/sec to Nominatim across all callers."""
    global _last_request_at
    async with _rate_limit_lock:
        now = time.time()
        wait = 1.05 - (now - _last_request_at)
        if wait > 0:
            await asyncio.sleep(wait)
        _last_request_at = time.time()


async def _nominatim_get(path: str, params: dict) -> list[dict]:
    await _rate_limit()
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{_NOMINATIM}{path}",
            params=params,
            headers={"User-Agent": _USER_AGENT, "Accept-Language": "en"},
        )
    r.raise_for_status()
    data = r.json()
    return data if isinstance(data, list) else [data]


@router.get("/forward")
async def geocode_forward(
    q: str = Query(..., description="Free-form address/place to geocode"),
    limit: int = Query(1, ge=1, le=5),
    current=Depends(get_firebase_user),
):
    """
    Forward geocoding — turn a place name into coordinates.

    Example:  /api/geocode/forward?q=Mylapore, Chennai
    """
    cache_key = f"fwd:{q.lower().strip()}:{limit}"
    cached = _cache.get(cache_key)
    if cached:
        return cached

    try:
        results = await _nominatim_get(
            "/search",
            {"q": q, "format": "json", "limit": limit, "addressdetails": 1},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Nominatim error: {e}")

    out = {
        "query": q,
        "results": [
            {
                "lat": float(r["lat"]),
                "lng": float(r["lon"]),
                "display_name": r.get("display_name"),
                "type": r.get("type"),
                "importance": r.get("importance"),
                "bounding_box": [float(b) for b in r.get("boundingbox", [])] or None,
                "address": r.get("address"),
            }
            for r in results
        ],
        "best": None,
    }
    if out["results"]:
        out["best"] = out["results"][0]
    _cache.set(cache_key, out)
    return out


@router.get("/reverse")
async def geocode_reverse(
    lat: float = Query(...),
    lng: float = Query(...),
    current=Depends(get_firebase_user),
):
    """
    Reverse geocoding — turn coordinates into a place name.

    Example:  /api/geocode/reverse?lat=13.0339&lng=80.2619
    """
    cache_key = f"rev:{lat:.5f},{lng:.5f}"
    cached = _cache.get(cache_key)
    if cached:
        return cached

    try:
        results = await _nominatim_get(
            "/reverse",
            {"lat": lat, "lon": lng, "format": "json", "addressdetails": 1},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Nominatim error: {e}")

    if not results:
        return {"display_name": None, "address": None}

    r = results[0]
    out = {
        "lat": lat,
        "lng": lng,
        "display_name": r.get("display_name"),
        "address": r.get("address"),
    }
    _cache.set(cache_key, out)
    return out
