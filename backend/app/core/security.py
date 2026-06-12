"""
Security utilities — JWT token management and password hashing.

NOTE: This module is used as a secondary/legacy auth path.
Primary authentication uses Firebase ID tokens (see firebase_auth.py).
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Set
import hashlib
import os
import hmac
import logging
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings

logger = logging.getLogger(__name__)

# Prefer bcrypt when available and working; fall back to PBKDF2-HMAC-SHA256
# which is stdlib and avoids passlib/bcrypt version pinning headaches.
try:
    from passlib.context import CryptContext  # type: ignore
    _pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    # smoke test
    _pwd_context.verify("x", _pwd_context.hash("x"))
    _USE_BCRYPT = True
except Exception:
    _pwd_context = None
    _USE_BCRYPT = False


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# VULN-003 fix: token blacklist for revocation
_token_blacklist: Set[str] = set()
_BLACKLIST_MAX_SIZE = 10000  # prevent unbounded growth


def revoke_token(token: str) -> None:
    """Add a token to the blacklist (logout / revocation)."""
    if len(_token_blacklist) >= _BLACKLIST_MAX_SIZE:
        # Prune oldest entries — in production, use Redis with TTL
        _token_blacklist.clear()
        logger.warning("[security] Token blacklist pruned due to size limit.")
    _token_blacklist.add(token)


def is_token_revoked(token: str) -> bool:
    """Check if a token has been revoked."""
    return token in _token_blacklist


def _pbkdf2_hash(password: str, salt: Optional[bytes] = None) -> str:
    if salt is None:
        salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8")[:72], salt, 120_000)
    return "pbkdf2$" + salt.hex() + "$" + derived.hex()


def _pbkdf2_verify(password: str, encoded: str) -> bool:
    try:
        scheme, salt_hex, h_hex = encoded.split("$")
        if scheme != "pbkdf2":
            return False
        salt = bytes.fromhex(salt_hex)
        h = bytes.fromhex(h_hex)
        derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8")[:72], salt, 120_000)
        return hmac.compare_digest(derived, h)
    except Exception:
        return False


def hash_password(password: str) -> str:
    if _USE_BCRYPT and _pwd_context is not None:
        try:
            return _pwd_context.hash(password[:72])
        except Exception:
            pass
    return _pbkdf2_hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    if hashed.startswith("pbkdf2$"):
        return _pbkdf2_verify(plain, hashed)
    if _USE_BCRYPT and _pwd_context is not None:
        try:
            return _pwd_context.verify(plain[:72], hashed)
        except Exception:
            return False
    return False


def create_access_token(subject: str, extra: Optional[dict] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {"sub": subject, "exp": expire}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    # VULN-003 fix: check blacklist before decoding
    if is_token_revoked(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(token)
    if "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "role": payload.get("role", "investigator"),
    }
