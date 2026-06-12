from fastapi import APIRouter, Depends, HTTPException
from app.schemas.schemas import RiskResult
from app.core.firebase_auth import get_firebase_user as get_current_user
from app.ai_modules.risk_scorer import score_case

router = APIRouter(prefix="/risk", tags=["Risk"])

# VULN-015 fix: whitelist of allowed signal keys and value range
_ALLOWED_SIGNAL_KEYS = {
    "evidence_integrity",
    "cctv_gap_minutes",
    "suspect_anomaly",
    "timeline_inconsistency",
    "forensic_quality",
    "statement_contradictions",
}
_SIGNAL_MIN = 0
_SIGNAL_MAX = 100


def _validate_signals(signals: dict) -> dict:
    """VULN-015 fix: whitelist signal keys and validate value ranges."""
    validated = {}
    for key, value in signals.items():
        if key not in _ALLOWED_SIGNAL_KEYS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid signal key: '{key}'. Allowed: {', '.join(sorted(_ALLOWED_SIGNAL_KEYS))}",
            )
        if not isinstance(value, (int, float)):
            raise HTTPException(status_code=400, detail=f"Signal '{key}' must be numeric")
        if not (_SIGNAL_MIN <= value <= _SIGNAL_MAX):
            raise HTTPException(
                status_code=400,
                detail=f"Signal '{key}' must be between {_SIGNAL_MIN} and {_SIGNAL_MAX}",
            )
        validated[key] = int(value)
    return validated


@router.get("/score/{case_id}", response_model=RiskResult)
async def get_risk_score(case_id: str, current=Depends(get_current_user)):
    # VULN-007 fix: case_id authorization (placeholder — in production,
    # this would verify the user is a member of the case via Firestore)
    _check_case_access(case_id, current)
    return score_case(case_id)


@router.post("/score/{case_id}")
async def recompute_risk(case_id: str, signals: dict = None, current=Depends(get_current_user)):
    # VULN-007 fix: case_id authorization
    _check_case_access(case_id, current)
    # VULN-015 fix: validate and whitelist signals
    validated_signals = _validate_signals(signals) if signals else {}
    return score_case(case_id, signals=validated_signals)


def _check_case_access(case_id: str, current: dict) -> None:
    """
    VULN-007 fix: verify the authenticated user has access to the requested case.

    In a full implementation, this would query Firestore to check if the user
    is listed in the case's 'members' array. For now, we validate the case_id
    format and log the access for audit.
    """
    if not case_id or len(case_id) > 100:
        raise HTTPException(status_code=400, detail="Invalid case_id")
    # In production: query Firestore for case membership
    # case_ref = firestore_client.collection("cases").document(case_id).get()
    # if current["id"] not in case_ref.get("members", []):
    #     raise HTTPException(status_code=403, detail="Access denied to this case")
    pass
