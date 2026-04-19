# TwinMind Live Suggestions

TwinMind is a two-part app for live meeting assistance:

- `client/`: React + Vite frontend for microphone capture, transcript display, live suggestions, chat, export, and session settings.
- `backend/`: FastAPI service for Groq transcription, live suggestion generation, and streaming chat responses.

## Assignment Coverage

Implemented in this repo:

- Mic start/stop with transcript chunking every ~30 seconds
- Auto-scrolling transcript panel
- Live suggestions that refresh automatically as new transcript chunks arrive
- Manual refresh that flushes the current audio segment, then refreshes suggestions
- Exactly 3 suggestion cards per batch, with older batches preserved below newer ones
- Click-to-expand suggestions into the chat panel
- Direct freeform chat in the same session
- Export of transcript, suggestion batches, and chat history with timestamps as JSON
- Session settings for:
  - Groq API key
  - optional meeting memory / prep notes
  - live suggestion prompt
  - detailed answer prompt
  - chat prompt
  - context windows for suggestions, clicked suggestions, and direct chat
- Silence handling that rolls consecutive silent windows into one visible streak and triggers occasional silence-aware suggestions instead of spamming empty batches
- Recursive suggestion context using recent prior batches so the assistant can continue unresolved threads instead of resetting every refresh

## Models

The backend now uses the assignment-required Groq models:

- Transcription: `whisper-large-v3`
- Live suggestions: `openai/gpt-oss-120b`
- Detailed answers and chat: `openai/gpt-oss-120b`

I verified the current Groq model IDs from Groq Docs:

- GPT-OSS 120B: https://console.groq.com/docs/model/openai/gpt-oss-120b
- Supported models list: https://console.groq.com/docs/models

## Repository Structure

```text
TwinMind/
  backend/
    main.py
    requirements.txt
    routers/
    services/
    models/
    prompts/
  client/
    src/
    package.json
README.md
```

## Prerequisites

- Python 3.9+
- Node.js 18+
- npm 9+
- A Groq API key

## Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
backend/.venv/bin/uvicorn backend.main:app --reload --port 8000
```

The backend runs at `http://127.0.0.1:8000`.

## Frontend Setup

```bash
cd client
npm install
npm run dev
```

The Vite dev server runs at `http://127.0.0.1:5173` and proxies `/api/*` to the backend.

## Running the App

1. Start backend and frontend in separate terminals.
2. Open the frontend URL shown by Vite.
3. Open `Settings` and paste your Groq API key.
4. Optionally tune prompts or context windows.
5. Start microphone capture from the transcript panel.
6. Wait for transcript chunks and live suggestion batches.
7. Click a suggestion to stream a detailed answer in chat.
8. Use `Export` to download the full session JSON.

## API Endpoints

- `POST /api/transcribe`
  - Accepts audio multipart form data and returns transcript text.
- `POST /api/suggestions`
  - Accepts transcript context and returns exactly 3 suggestions.
- `POST /api/chat`
  - Accepts transcript context plus chat history and returns a streaming response.

## Prompt Strategy

- Live suggestions use a strict JSON prompt and recent transcript window so each refresh produces 3 actionable cards.
- Optional meeting memory is included only when the user provided it for the current session.
- Clicked suggestions use a separate prompt tuned for deeper, meeting-ready expansions.
- Direct chat uses a broader assistant prompt with the longer transcript window.
- Prior suggestion batches are fed back into later suggestion requests so the system can revisit unresolved items without blindly repeating itself.
- Prompt and context settings are editable in-session so evaluators can inspect and tune behavior quickly.

## Tradeoffs

- Session state lives entirely in-browser. Reloading clears the active session, which matches the assignment.
- Suggestions refresh after transcript updates instead of on a separate timer, so the middle column stays aligned with fresh audio context.
- Consecutive silence is represented as one evolving transcript event, with suggestion refreshes on the first silent interval and then periodically for longer pauses.
- Export is client-side JSON download for simplicity and transparency.

## Verification

Validated locally with:

```bash
cd client && npm run lint
cd client && npm run build
python3 -m py_compile backend/main.py backend/routers/*.py backend/models/*.py backend/prompts/*.py backend/services/*.py
```

## Known Non-Code Deliverables

Still required outside the repo:

- A public deployed URL
- A public or shared GitHub repo URL for submission
