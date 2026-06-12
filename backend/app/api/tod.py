from fastapi import APIRouter, Depends
from app.schemas.schemas import TODInput, TODResult
from app.core.firebase_auth import get_firebase_user as get_current_user
from app.ai_modules.tod_estimator import estimate_pmi

router = APIRouter(prefix="/tod", tags=["TOD"])


@router.post("/estimate", response_model=TODResult)
async def estimate(payload: TODInput, current=Depends(get_current_user)):
    return estimate_pmi(
        body_temperature=payload.body_temperature,
        ambient_temperature=payload.ambient_temperature,
        rigor_mortis=payload.rigor_mortis,
        livor_mortis=payload.livor_mortis,
        body_weight=payload.body_weight,
        clothing=payload.clothing,
        location_type=payload.location_type,
        humidity=payload.humidity,
    )
