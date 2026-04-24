from pathlib import Path
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

# Support direct launch
if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.routers import chat, meeting, suggestions, transcribe
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
app.include_router(meeting.router, prefix="/api")

# Backward-compatible aliases for clients configured without the /api prefix.
app.include_router(transcribe.router)
app.include_router(suggestions.router)
app.include_router(chat.router)
app.include_router(meeting.router)


@app.get("/", tags=["health"])
async def root():
    return {
        "status": "ok",
        "docs": "/docs",
        "api_docs": "/api/docs",
    }


@app.get("/api/health", tags=["health"])
async def api_health():
    return {"status": "ok"}


@app.get("/api/docs", include_in_schema=False)
async def api_docs_redirect():
    return RedirectResponse(url="/docs", status_code=307)


@app.get("/api/openapi.json", include_in_schema=False)
async def api_openapi_redirect():
    return RedirectResponse(url="/openapi.json", status_code=307)
