from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.core.firebase_auth import get_firebase_user as get_current_user
from app.ai_modules.image_analyzer import analyze_image
from app.ai_modules.autopsy_analyzer import analyze_autopsy
from app.utils.scan_logger import ScanLog
from app.utils.file_validators import (
    validate_upload,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_ALL_TYPES,
)

router = APIRouter(prefix="/images", tags=["Images"])


@router.post("/analyze")
async def analyze(file: UploadFile = File(...), current=Depends(get_current_user)):
    # VULN-012 + VULN-013 fix: validate file size and type
    contents = await validate_upload(file, allowed_types=ALLOWED_IMAGE_TYPES, max_size_mb=25)

    with ScanLog(
        "Image analysis",
        filename=file.filename or "scene.jpg",
        size_bytes=len(contents),
        user=current,
    ) as log:
        result = analyze_image(contents, filename=file.filename or "scene.jpg")
        n_injuries = len(result.get("inferred_injuries", []))
        n_detections = len(result.get("detections", []))
        body_conf = (result.get("body_location") or {}).get("confidence", 0)
        log.set_outcome(
            f"{n_detections} detections · {n_injuries} injuries inferred · "
            f"body silhouette confidence {int(body_conf * 100)}% · "
            f"body chart rendered"
        )
    return result


@router.post("/generate-body-chart")
async def generate_body_chart(file: UploadFile = File(...), current=Depends(get_current_user)):
    """Unified body-chart generation. Accepts images OR PDF autopsy reports."""
    # VULN-012 + VULN-013 fix: validate file size and type (allow both images and PDFs)
    contents = await validate_upload(file, allowed_types=ALLOWED_ALL_TYPES, max_size_mb=25)

    filename = (file.filename or "").lower()
    is_pdf = (
        filename.endswith(".pdf")
        or contents[:4] == b"%PDF"
        or (file.content_type or "").lower() == "application/pdf"
    )

    if is_pdf:
        with ScanLog(
            "Autopsy PDF → body chart",
            filename=file.filename or "report.pdf",
            size_bytes=len(contents),
            user=current,
        ) as log:
            analysis = analyze_autopsy(contents)
            n_injuries = len(analysis.get("injury_patterns", []))
            provider = (analysis.get("deep_reasoning") or {}).get("provider", "?")
            cod = (
                analysis.get("cause_of_death", {}).get("primary", "—")
                if isinstance(analysis.get("cause_of_death"), dict)
                else "—"
            )
            log.set_outcome(
                f"{n_injuries} injury patterns extracted · "
                f"CoD: {cod} · LLM: {provider} · body chart rendered"
            )
            return {
                "source_type": "pdf",
                "source_name": file.filename,
                "body_diagram": analysis.get("body_diagram"),
                "injuries": analysis.get("injury_patterns", []),
                "cause_of_death": analysis.get("cause_of_death"),
                "confidence": analysis.get("confidence"),
                "deep_reasoning": analysis.get("deep_reasoning"),
                "extra": {
                    "toxicology": analysis.get("toxicology", []),
                    "suspicious_indicators": analysis.get("suspicious_indicators", []),
                },
            }

    # Image path
    with ScanLog(
        "Image → body chart",
        filename=file.filename or "scene.jpg",
        size_bytes=len(contents),
        user=current,
    ) as log:
        analysis = analyze_image(contents, filename=file.filename or "scene.jpg")
        n_injuries = len(analysis.get("inferred_injuries", []))
        n_detections = len(analysis.get("detections", []))
        log.set_outcome(
            f"{n_detections} CV detections · {n_injuries} injuries mapped to anatomy · "
            f"body chart rendered"
        )
        return {
            "source_type": "image",
            "source_name": file.filename,
            "body_diagram": analysis.get("body_diagram"),
            "injuries": analysis.get("inferred_injuries", []),
            "detections": analysis.get("detections", []),
            "body_location": analysis.get("body_location"),
            "tampering": analysis.get("tampering"),
            "confidence": (analysis.get("body_location") or {}).get("confidence"),
            "extra": {
                "blood_pattern": analysis.get("blood_pattern"),
                "resolution": analysis.get("resolution"),
            },
        }
