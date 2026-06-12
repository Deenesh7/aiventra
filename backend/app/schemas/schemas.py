"""AI request/response schemas used by the FastAPI inference service."""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List


# ─── TOD ────────────────────────────────────────────────────────────
class TODInput(BaseModel):
    body_temperature: float = Field(..., ge=0, le=50)
    ambient_temperature: float = Field(..., ge=-40, le=60)
    humidity: float = Field(50, ge=0, le=100)
    rigor_mortis: str = Field("partial", max_length=20)
    livor_mortis: str = Field("fixed", max_length=20)
    body_weight: float = Field(70, ge=1, le=500)
    clothing: str = Field("light", max_length=20)
    location_type: str = Field("indoor", max_length=30)


class CoolingPoint(BaseModel):
    hours: float
    temperature: float


class TODFactor(BaseModel):
    name: str
    weight: float
    note: str


class TODResult(BaseModel):
    pmi_hours_low: float
    pmi_hours_high: float
    confidence: int
    method: str
    cooling_coefficient: float
    correction_factor: float
    cooling_curve: List[CoolingPoint]
    factors: List[TODFactor]
    notes: str = ""


# ─── Risk ───────────────────────────────────────────────────────────
class RiskFactor(BaseModel):
    name: str
    score: int
    weight: float
    level: str
    reasoning: str
    evidence: List[str] = []


class RiskAnomaly(BaseModel):
    title: str
    severity: str
    description: str


class RiskResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    score: int
    level: str
    confidence: int
    model_version: str
    inference_ms: int
    features_count: int
    factors: List[RiskFactor]
    anomalies: List[RiskAnomaly]
    recommendations: List[str]


# ─── Assistant ──────────────────────────────────────────────────────
class AssistantQuery(BaseModel):
    # VULN-014 fix: enforce max_length on query and limit history size
    query: str = Field(..., min_length=1, max_length=5000)
    case_id: Optional[str] = Field(None, max_length=100)
    history: List[dict] = Field(default=[], max_length=50)


class AssistantResponse(BaseModel):
    answer: str
    citations: List[dict]
    reasoning: str
    inference_ms: int
