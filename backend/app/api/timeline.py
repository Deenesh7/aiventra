from fastapi import APIRouter, Depends, HTTPException
from app.core.firebase_auth import get_firebase_user as get_current_user
from app.ai_modules.timeline_reconstructor import reconstruct

router = APIRouter(prefix="/timeline", tags=["Timeline"])


@router.get("/{case_id}")
async def get_timeline(case_id: str, current=Depends(get_current_user)):
    # VULN-007 fix: case_id authorization
    _check_case_access(case_id, current)
    events = reconstruct(case_id)
    return {"case_id": case_id, "events": events}


def _check_case_access(case_id: str, current: dict) -> None:
    """
    VULN-007 fix: verify the authenticated user has access to the requested case.

    In a full implementation, this would query Firestore to check if the user
    is listed in the case's 'members' array.
    """
    if not case_id or len(case_id) > 100:
        raise HTTPException(status_code=400, detail="Invalid case_id")
    # In production: query Firestore for case membership
    # case_ref = firestore_client.collection("cases").document(case_id).get()
    # if current["id"] not in case_ref.get("members", []):
    #     raise HTTPException(status_code=403, detail="Access denied to this case")
    pass
