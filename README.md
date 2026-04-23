# TwinMind Live Meeting Copilot

TwinMind is a real-time meeting assistant with three live workflows: transcription, context-aware suggestions, and streaming chat. It uses a React + Vite frontend and a FastAPI backend connected to Groq models.

## How to Use

1. Open the app after completing setup (setup section is at the end of this file).
2. Add your Groq API key from the `Settings` modal.
3. Optionally add meeting memory or prep notes in `Settings`.
4. Start recording from `Mic & Transcript`.
5. Let transcript chunks accumulate (captured in ~30-second segments).
6. Watch `Live Suggestion` update automatically, or click `Refresh now` for a manual refresh.
7. Click any suggestion card to stream a deeper response into `Chat`.
8. Ask direct questions in chat. Responses use current session context.
9. Use `Export` to download transcript, suggestion batches, chat history, and session settings (without the API key).

## Technical Implementation

### Architecture

- Frontend: React + Vite single-page app in `client/`
- Backend: FastAPI app in `backend/`
- API surface:
  - `POST /api/transcribe`
  - `POST /api/suggestions`
  - `POST /api/chat` (streaming)

### Frontend Pipeline

1. Audio capture and chunking
- `TranscriptPanel` uses `MediaRecorder` with a rolling segment strategy.
- Each segment runs for ~30 seconds, then stops, transcribes, and immediately starts a new segment.
- Manual refresh calls `flushCurrentSegment()` so the current audio segment is sent immediately.

2. Transcript state
- `App.jsx` stores transcript entries with timestamps.
- `fullTranscript` is used for chat and suggestion context.
- `spokenTranscript` excludes synthetic silence entries for cleaner suggestion triggers.

3. Suggestions lifecycle
- `LiveSuggestionsPanel` listens to refresh tokens from `App.jsx`.
- Refreshes are triggered by:
  - new transcript chunks (`auto`)
  - manual refresh button (`manual`)
  - selected silence checkpoints (`silence`)
- Duplicate requests are prevented with in-flight and completed request keys.

4. Chat lifecycle
- `ChatPanel` keeps one continuous in-session thread.
- Clicking a suggestion sends it in `suggestion` mode (detail prompt path).
- Freeform input sends in `chat` mode.
- Responses are streamed token-by-token from backend SSE.

### Added Feature: Silence Detection

Silence detection is handled as first-class behavior, not an error case.

- In `TranscriptPanel`, when a transcribed chunk returns empty text, a silence streak counter increments.
- `onSilencePeriod` reports:
  - `streakCount`
  - cumulative silent seconds (`streakCount * 30`)
- In `App.jsx`, consecutive silence windows are merged into one evolving transcript entry instead of creating noisy repeated lines.
- Suggestion refresh is rate-limited for silence:
  - trigger on first silence window
  - then trigger every third silence window
- This preserves context and avoids flooding the suggestions column when no one is speaking.

### Added Feature: Recursive Memory

Recursive memory is implemented as an iterative context loop across suggestion generations.

- Frontend collects suggestion memory from recent batches:
  - latest 3 batches
  - up to 9 compact suggestion strings
- Backend receives this as `previous_suggestions` in `SuggestionRequest`.
- Backend prompt construction injects:
  - latest transcript slice
  - latest transcript chunk
  - meeting memory
  - previous suggestions
  - silence streak count
- Prompt rules explicitly tell the model to continue unresolved threads and avoid repetition.

This creates a recursive memory effect where each new batch can build on earlier suggestions instead of resetting each refresh.

### Backend Flow

1. `POST /api/transcribe`
- Accepts multipart audio file.
- Sends to Groq transcription API.
- Returns `{ "text": "..." }`.
- Gracefully handles undecodable chunks by returning empty text.

2. `POST /api/suggestions`
- Applies transcript context window trimming server-side.
- Builds a structured user message with optional blocks.
- Runs up to three generation attempts with stricter fallback behavior if parsing fails.
- Enforces exactly 3 suggestions via schema validation.

3. `POST /api/chat`
- Chooses prompt template by mode (`chat` or `suggestion`).
- Injects transcript and optional meeting memory.
- Appends prior chat history and current user message.
- Streams model output as `text/event-stream`.

### Prompt and Model Configuration

- Transcription model: `whisper-large-v3`
- Suggestions model: `openai/gpt-oss-120b`
- Chat/detail model: `openai/gpt-oss-120b`

Prompt templates are centralized in `backend/prompts/defaults.py` and are overridable from session settings.

## Setup Instructions

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm 9+
- Groq API key

### Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
backend/.venv/bin/uvicorn backend.main:app --reload --port 8000
```

Backend URL: `http://127.0.0.1:8000`

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

Vite proxy forwards `/api/*` requests to the backend.
