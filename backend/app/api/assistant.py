from fastapi import APIRouter, Depends
from app.schemas.schemas import AssistantQuery, AssistantResponse
from app.core.firebase_auth import get_firebase_user as get_current_user
from app.ai_modules.rag_assistant import ask

router = APIRouter(prefix="/assistant", tags=["Assistant"])


@router.post("/ask", response_model=AssistantResponse)
async def assistant_ask(payload: AssistantQuery, current=Depends(get_current_user)):
    return ask(payload.query, case_id=payload.case_id, history=payload.history)
