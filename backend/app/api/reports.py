import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from app.core.firebase_auth import get_firebase_user as get_current_user
from app.ai_modules.autopsy_analyzer import analyze_autopsy
from app.utils.scan_logger import ScanLog
from app.utils.file_validators import validate_upload, ALLOWED_PDF_TYPES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/analyze")
async def analyze_report(
    file: UploadFile = File(...),
    case_id: str = Form(None),
    current=Depends(get_current_user),
):
    # VULN-012 + VULN-013 fix: validate file size and type
    contents = await validate_upload(file, allowed_types=ALLOWED_PDF_TYPES, max_size_mb=25)

    with ScanLog(
        "Autopsy report analysis",
        filename=file.filename or "report.pdf",
        size_bytes=len(contents),
        case_id=case_id,
        user=current,
    ) as log:
        result = analyze_autopsy(contents, case_id=case_id)
        result["filename"] = file.filename
        n_inj = len(result.get("injury_patterns", []))
        n_tox = len(result.get("toxicology", []))
        n_sus = len(result.get("suspicious_indicators", []))
        provider = (result.get("deep_reasoning") or {}).get("provider", "?")
        cod_obj = result.get("cause_of_death")
        cod = cod_obj.get("primary") if isinstance(cod_obj, dict) else "—"
        log.set_outcome(
            f"CoD: {cod} · {n_inj} injuries · {n_tox} toxicology · "
            f"{n_sus} suspicious indicators · LLM: {provider} · confidence {result.get('confidence')}%"
        )
    return result
