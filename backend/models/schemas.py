from typing import Literal, Optional

from pydantic import BaseModel, Field


class SuggestionRequest(BaseModel):
    transcript_slice: str
    latest_transcript_chunk: Optional[str] = None
    meeting_memory: Optional[str] = None
    previous_suggestions: list[str] = Field(default_factory=list)
    silence_streak_count: int = 0
    suggestions_prompt: Optional[str] = None
    context_window: int = 800


class Suggestion(BaseModel):
    type: Literal[
        "QUESTION_TO_ASK",
        "TALKING_POINT",
        "ANSWER",
        "FACT_CHECK",
        "CLARIFICATION",
    ]
    title: str
    preview: str


class SuggestionsResponse(BaseModel):
    suggestions: list[Suggestion]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    full_transcript: str
    meeting_memory: Optional[str] = None
    mode: Literal["chat", "suggestion"] = "chat"
    chat_prompt: Optional[str] = None
    detail_prompt: Optional[str] = None
    context_window: int = 3000
