from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse

from backend.models.schemas import ChatRequest
from backend.prompts.defaults import CHAT_MODEL, DEFAULT_CHAT_SYSTEM, DEFAULT_DETAIL_SYSTEM
from backend.services.groq_client import iter_groq_chat_stream

router = APIRouter()


def _append_optional_context(system_prompt: str, tag: str, value: str | None) -> str:
    if not value or not value.strip():
        return system_prompt
    return f"{system_prompt}\n\n<{tag}>\n{value.strip()}\n</{tag}>"


@router.post("/chat")
async def chat(
    body: ChatRequest,
    x_groq_api_key: str = Header(..., alias="X-Groq-API-Key"),
):
    words = body.full_transcript.split()[-body.context_window :]
    transcript = " ".join(words)

    prompt_template = (
        body.detail_prompt or DEFAULT_DETAIL_SYSTEM
        if body.mode == "suggestion"
        else body.chat_prompt or DEFAULT_CHAT_SYSTEM
    )
    system_prompt = prompt_template.replace("{{FULL_TRANSCRIPT}}", transcript)
    system_prompt = _append_optional_context(system_prompt, "meeting_memory", body.meeting_memory)

    messages = [{"role": "system", "content": system_prompt}]
    for message in body.history:
        messages.append({"role": message.role, "content": message.content})
    messages.append({"role": "user", "content": body.message})

    payload = {
        "model": CHAT_MODEL,
        "messages": messages,
        "temperature": 0.35,
        "max_tokens": 1000,
        "stream": True,
    }

    return StreamingResponse(
        iter_groq_chat_stream(x_groq_api_key, payload),
        media_type="text/event-stream",
    )
