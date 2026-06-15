"""
Firebase ID token verification.

Three-tier strategy:
  1. Preferred — firebase-admin with explicit service account JSON.
  2. Default ADC — firebase-admin with Application Default Credentials.
  3. Fallback — verify the Google-signed JWT directly using public keys from
     https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
     This works without any credentials file, sufficient for read-only token
     verification in dev / single-tenant deployments.

The dependency `get_firebase_user` exposes a uniform user dict to API routes.
"""
from __future__ import annotations
import json
import time
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from jose import jwt as jose_jwt
from jose.utils import base64url_decode

from app.core.config import settings

_bearer = HTTPBearer(auto_error=False)


# ── Tier 1/2: firebase-admin ───────────────────────────────────────────────
_admin_ready = False
try:
    import firebase_admin  # type: ignore
    from firebase_admin import auth as fb_auth, credentials as fb_creds  # type: ignore

    try:
        firebase_admin.get_app()
        _admin_ready = True
    except ValueError:
        try:
            if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                cred = fb_creds.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
            else:
                firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
            _admin_ready = True
            print("[firebase] admin SDK initialized")
        except Exception as e:
            print(f"[firebase] admin SDK init failed ({e}). Falling back to public-key verification.")
except Exception:
    print("[firebase] firebase-admin not installed; using public-key fallback.")


# ── Tier 3: Google public-key verification ────────────────────────────────
_GOOGLE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)
_cert_cache: dict[str, str] = {}
_cert_cache_ts: float = 0
_CERT_TTL_S = 3600  # refresh hourly


async def _fetch_certs() -> dict[str, str]:
    global _cert_cache, _cert_cache_ts
    now = time.time()
    if _cert_cache and (now - _cert_cache_ts) < _CERT_TTL_S:
        return _cert_cache
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(_GOOGLE_CERTS_URL)
        r.raise_for_status()
        _cert_cache = r.json()
        _cert_cache_ts = now
        return _cert_cache


async def _verify_with_public_keys(token: str) -> dict:
    """Verify a Firebase ID token using Google's published x509 certs."""
    try:
        unverified_header = jose_jwt.get_unverified_header(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Malformed token: {e}")

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Token missing kid")

    certs = await _fetch_certs()
    pem = certs.get(kid)
    if not pem:
        # refresh once in case of key rotation
        _cert_cache_ts_reset()
        certs = await _fetch_certs()
        pem = certs.get(kid)
        if not pem:
            raise HTTPException(status_code=401, detail="Token kid not found in Google certs")

    issuer = f"https://securetoken.google.com/{settings.FIREBASE_PROJECT_ID}"
    try:
        claims = jose_jwt.decode(
            token,
            pem,
            algorithms=["RS256"],
            audience=settings.FIREBASE_PROJECT_ID,
            issuer=issuer,
            options={"verify_at_hash": False},
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {e}")

    # extra sanity checks
    if claims.get("auth_time", 0) > time.time() + 60:
        raise HTTPException(status_code=401, detail="Token auth_time in the future")
    return claims


def _cert_cache_ts_reset():
    global _cert_cache_ts
    _cert_cache_ts = 0


# ── Public dependency ─────────────────────────────────────────────────────
async def get_firebase_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials

    # Tier 1/2 — firebase-admin
    if _admin_ready:
        try:
            claims = fb_auth.verify_id_token(token)
            return {
                "id": claims.get("uid") or claims.get("user_id") or claims.get("sub"),
                "email": claims.get("email"),
                "name": claims.get("name") or (claims.get("email") or "").split("@")[0],
                "role": claims.get("role", "investigator"),
                "claims": claims,
            }
        except Exception as e:
            # fall through to public-key path
            err_msg = str(e)
            if "default credentials" in err_msg.lower():
                err_msg = "Application Default Credentials not configured (normal for dev)"
            print(f"[firebase] admin verify: {err_msg}; using public-key fallback.")

    # Tier 3 — public-key verification
    claims = await _verify_with_public_keys(token)
    return {
        "id": claims.get("user_id") or claims.get("sub"),
        "email": claims.get("email"),
        "name": claims.get("name") or (claims.get("email") or "").split("@")[0],
        "role": claims.get("role", "investigator"),
        "claims": claims,
    }


# Optional: for dev convenience, accept either Firebase tokens or none
async def get_firebase_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[dict]:
    if credentials is None:
        return None
    try:
        return await get_firebase_user(credentials)
    except HTTPException:
        return None
