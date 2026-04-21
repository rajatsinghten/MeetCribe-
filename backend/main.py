from pathlib import Path
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Support direct launch
if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.routers import chat, suggestions, transcribe
from backend.services.groq_client import close_http_client, get_http_client


@asynccontextmanager
async def lifespan(_: FastAPI):
    await get_http_client()
    try:
        yield
    finally:
        await close_http_client()


app = FastAPI(title="TwinMind Live Suggestions", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transcribe.router, prefix="/api")
app.include_router(suggestions.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
