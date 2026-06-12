import os
import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr
from functools import lru_cache


def _generate_default_secret() -> str:
    """Generate a cryptographically random 256-bit secret if none is provided."""
    return secrets.token_urlsafe(32)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    APP_NAME: str = "AIVENTRA"
    ENV: str = "development"
    DEBUG: bool = False  # VULN-029 fix: default to False; require explicit opt-in

    HOST: str = "127.0.0.1"  # VULN-030 fix: bind to loopback by default
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # VULN-001 fix: no hardcoded default — generated at startup
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # VULN-002 fix: reduced from 720 to 30

    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "aiventra"

    ENABLE_OCR: bool = False
    ENABLE_TRANSFORMERS: bool = False
    ENABLE_VECTOR_INDEX: bool = False

    # Firebase
    FIREBASE_PROJECT_ID: str = "trace-8e47e"
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""  # path to service account file, or empty for default ADC
    # If both are unset, the backend falls back to lightweight token verification
    # via Firebase public keys — no admin SDK required, but custom claims & revocation
    # checks are skipped.

    # LLM providers (forensic reasoning router) — use SecretStr to prevent leaks
    GEMINI_API_KEY: SecretStr = SecretStr("")
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OLLAMA_MODEL: str = "tinyllama"

    # Hugging Face — use SecretStr
    HF_TOKEN: SecretStr = SecretStr("")
    HF_MODEL: str = "Qwen/Qwen2.5-7B-Instruct"
    HF_FALLBACK_MODEL: str = "microsoft/Phi-3-mini-4k-instruct"

    # VULN-020 fix: rate limiting config
    RATE_LIMIT_DEFAULT: str = "60/minute"
    RATE_LIMIT_AI: str = "10/minute"

    # VULN-021 fix: request body size limit (bytes) — 50 MB
    MAX_REQUEST_SIZE: int = 50 * 1024 * 1024

    # VULN-012 fix: file upload size limit (bytes) — 25 MB
    MAX_UPLOAD_SIZE: int = 25 * 1024 * 1024

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    # VULN-001 fix: auto-generate JWT_SECRET if not set, and warn
    if not s.JWT_SECRET:
        s.JWT_SECRET = _generate_default_secret()
        print(
            "[SECURITY WARNING] JWT_SECRET not set in .env — using auto-generated "
            "ephemeral secret. Tokens will be invalidated on restart. "
            "Set a persistent JWT_SECRET in production."
        )
    return s


settings = get_settings()
