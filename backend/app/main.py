"""
AIVENTRA — AI inference microservice.
Data plane (users, cases, evidence, geo, dashboard) lives in Firebase.
This service exposes AI endpoints only:
  • /reports/analyze       autopsy NLP
  • /tod/estimate          time-of-death modeling
  • /risk/score/{case_id}  explainable risk scoring
  • /timeline/{case_id}    timeline reconstruction
  • /assistant/ask         RAG forensic assistant
  • /images/analyze        OpenCV image analysis
Every endpoint requires a valid Firebase ID token.
"""
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from app.core.config import settings
from app.api import reports, tod, risk, timeline, assistant, images, geocode


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[startup] {settings.APP_NAME} AI service ready · env={settings.ENV}")
    yield


# VULN-025 fix: disable Swagger/ReDoc in non-development environments
_docs_url = "/docs" if settings.ENV == "development" else None
_redoc_url = "/redoc" if settings.ENV == "development" else None

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "AIVENTRA AI inference microservice. Provides autopsy NLP, TOD modeling, "
        "evidence correlation, geospatial intelligence, risk scoring, image analysis "
        "and a RAG investigator assistant. Authentication: Firebase ID tokens."
    ),
    version="1.1.0",
    lifespan=lifespan,
    docs_url=_docs_url,       # VULN-025 fix
    redoc_url=_redoc_url,     # VULN-025 fix
)

# VULN-022 fix: explicit methods and headers instead of wildcards
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


# VULN-023 fix: security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    start = time.time()
    response: Response = await call_next(request)
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # Timing header (only in dev)
    if settings.ENV == "development":
        response.headers["X-Process-Time-ms"] = f"{(time.time() - start) * 1000:.1f}"
    return response


# VULN-021 fix: request body size limit middleware
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.MAX_REQUEST_SIZE:
        return JSONResponse(
            status_code=413,
            content={"detail": f"Request body too large. Max: {settings.MAX_REQUEST_SIZE // (1024*1024)} MB"},
        )
    return await call_next(request)


# AI routes only — data routes have moved to Firebase
app.include_router(reports.router, prefix="/api")
app.include_router(tod.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
app.include_router(timeline.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")
app.include_router(images.router, prefix="/api")
app.include_router(geocode.router, prefix="/api")


# VULN-016 fix: removed Firebase project ID and internal details from public endpoint
@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": "1.1.0",
        "status": "online",
        "tagline": "Transforming Forensic Intelligence with AI.",
    }


# VULN-024 fix: health endpoint returns minimal info publicly
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "auth": "firebase",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        limit_max_request_size=settings.MAX_REQUEST_SIZE,  # VULN-021 fix
    )
