"""
Forensic event logger.

Prints clearly-formatted upload + scan events to the backend console so
investigators / developers can see exactly what's being analyzed, how big it
is, how long it took, and what the system found.

VULN-018 fix: PII (emails, UIDs) is redacted in non-development environments.
Uses structured logging instead of raw print statements.
"""
from __future__ import annotations
import time
import logging
from datetime import datetime
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("aiventra.scan")


def _fmt_size(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB"
    return f"{n / (1024 * 1024):.2f} MB"


def _redact_email(email: str | None) -> str:
    """VULN-018 fix: redact email in non-dev environments."""
    if not email:
        return "anonymous"
    if settings.ENV == "development":
        return email
    # Redact: show first 2 chars + domain
    parts = email.split("@")
    if len(parts) == 2:
        return f"{parts[0][:2]}***@{parts[1]}"
    return "***"


def _redact_uid(uid: str | None) -> str:
    """VULN-018 fix: redact UID in non-dev environments."""
    if not uid:
        return "?"
    if settings.ENV == "development":
        return uid[:8]
    return uid[:4] + "****"


class ScanLog:
    """Context manager that logs a banner before/after a scan."""

    def __init__(
        self,
        kind: str,
        filename: str,
        size_bytes: int,
        *,
        case_id: Optional[str] = None,
        user: Optional[dict] = None,
    ):
        self.kind = kind
        self.filename = filename
        self.size_bytes = size_bytes
        self.case_id = case_id
        self.user = user
        self.start = 0.0
        self.outcome = "no outcome recorded"

    def __enter__(self):
        self.start = time.time()
        u = self.user or {}
        # VULN-018 fix: redact PII
        user_label = (
            f"{_redact_email(u.get('email'))} · uid={_redact_uid(u.get('id'))}"
            if u
            else "anonymous"
        )
        logger.info(
            f"[SCAN] {self.kind} | file={self.filename} | "
            f"size={_fmt_size(self.size_bytes)} | user={user_label}"
            + (f" | case_id={self.case_id}" if self.case_id else "")
        )
        return self

    def set_outcome(self, outcome: str):
        self.outcome = outcome

    def __exit__(self, exc_type, exc, tb):
        duration = time.time() - self.start
        if exc:
            logger.error(
                f"[SCAN] {self.kind} | duration={duration:.2f}s | "
                f"outcome=FAILED — {exc_type.__name__}"
            )
            return False  # propagate exception
        logger.info(
            f"[SCAN] {self.kind} | duration={duration:.2f}s | "
            f"outcome={self.outcome}"
        )
        return False
