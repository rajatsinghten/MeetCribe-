from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Header
from pydantic import BaseModel

router = APIRouter()

_active_sessions: dict[str, dict] = {}


class MeetingStartRequest(BaseModel):
    meeting_memory: str | None = None


class MeetingStartResponse(BaseModel):
    session_id: str
    started_at: str
    status: str


class MeetingEndRequest(BaseModel):
    session_id: str


class MeetingEndResponse(BaseModel):
    session_id: str
    ended_at: str
    status: str


@router.post("/meeting/start", response_model=MeetingStartResponse)
async def start_meeting(
    body: MeetingStartRequest,
    x_groq_api_key: str = Header(..., alias="X-Groq-API-Key"),
):
    del x_groq_api_key
    session_id = str(uuid4())
    started_at = datetime.now(timezone.utc).isoformat()
    _active_sessions[session_id] = {
        "started_at": started_at,
        "meeting_memory": body.meeting_memory or "",
        "status": "active",
    }
    return MeetingStartResponse(session_id=session_id, started_at=started_at, status="active")


@router.post("/meeting/end", response_model=MeetingEndResponse)
async def end_meeting(
    body: MeetingEndRequest,
    x_groq_api_key: str = Header(..., alias="X-Groq-API-Key"),
):
    del x_groq_api_key
    _active_sessions.pop(body.session_id, None)
    ended_at = datetime.now(timezone.utc).isoformat()
    return MeetingEndResponse(session_id=body.session_id, ended_at=ended_at, status="ended")
