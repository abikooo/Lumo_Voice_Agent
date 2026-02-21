# LumoAI — Voice AI Study Companion

[![GitHub](https://img.shields.io/badge/GitHub-abikooo%2FLumo__Voice__Agent-181717?logo=github)](https://github.com/abikooo/Lumo_Voice_Agent)

LumoAI is an open-source, browser-based AI study companion. It listens to educational videos you watch, builds a real-time understanding of the content, and lets you ask voice questions about it — hands-free, without switching tabs.

The project has three parts that work together:

- **Chrome Extension** — captures tab audio, handles the mic, and manages wake word detection ("Hey Lumo")
- **FastAPI Backend** — runs the STT → LLM → TTS streaming pipeline
- **React Frontend** — a dashboard for session history, smart notes, file uploads, and quizzes

---

## Features

- 🎙️ **Real-time voice Q&A** — ask questions while watching a video and hear the answer spoken back before the full response even finishes generating
- 🧠 **Video context awareness** — the extension continuously transcribes tab audio in the background so the AI always knows what you're watching
- 💬 **Session history** — every conversation is saved; you can review, resume, or quiz yourself on past sessions
- 📝 **Smart notes & file uploads** — upload PDFs or text files to use as study material or quiz sources
- 🔔 **"Hey Lumo" wake word** — say "Lumo" and the extension automatically starts recording your question
- ⚡ **Low-latency streaming** — text and audio are streamed sentence-by-sentence while the LLM is still generating

---

## Architecture

```
┌────────────────────────────────────────────────────┐
│                  Chrome Extension                  │
│  (Manifest V3 — background.js / offscreen.js)      │
│                                                    │
│  - Tab audio capture via tabCapture API            │
│  - Mic recording via offscreen document            │
│  - Wake word detection (Web Speech API)            │
│  - Streams NDJSON from backend, queues audio       │
└───────────────────┬────────────────────────────────┘
                    │  HTTP / Streaming
┌───────────────────▼────────────────────────────────┐
│              FastAPI Backend                       │
│                                                    │
│  /api/voice/ask-stream  — STT → LLM → TTS pipeline │
│  /api/voice/transcribe-video  — background context │
│  /api/auth  — JWT register / login                 │
│  /api/notes, /api/history, /api/uploads            │
│                                                    │
│  Services: FAL.ai (STT, TTS), Gemini via OpenRouter│
│  DB: SQLite (dev) / PostgreSQL (prod)              │
└───────────────────┬────────────────────────────────┘
                    │  REST API
┌───────────────────▼────────────────────────────────┐
│          React Frontend (Vite + TypeScript)        │
│                                                    │
│  Dashboard · History · Smart Notes · Study / Quiz  │
└────────────────────────────────────────────────────┘
```

**Streaming pipeline** (what happens when you ask a question):

1. Extension sends a `.webm` audio blob to `/api/voice/ask-stream`
2. Backend transcribes it with FAL.ai STT
3. Transcript + last 3 000 chars of video context + last 6 messages → Gemini 2.0 Flash via OpenRouter (SSE)
4. Complete sentences are detected as text deltas arrive and immediately sent to FAL.ai TTS
5. Each TTS chunk (PCM16 wrapped in WAV) is base64-encoded and forwarded as an NDJSON `audio_chunk` event
6. The extension's offscreen document decodes and plays each chunk sequentially

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLModel, SQLite / PostgreSQL |
| AI services | FAL.ai (Freya STT + TTS), Gemini 2.0 Flash (via OpenRouter) |
| Frontend | React 19, TypeScript, Vite, React Router |
| Extension | Chrome Manifest V3, Offscreen API, tabCapture, Web Speech API |
| Auth | JWT (python-jose), bcrypt (passlib) |

---

## Prerequisites

Before you start, make sure you have:

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Google Chrome | any recent | required for the extension |
| FAL.ai API key | — | free tier available at [fal.ai](https://fal.ai) |

---

## Installation

Clone the repository:

```bash
git clone https://github.com/abikooo/Lumo_Voice_Agent.git
cd Lumo_Voice_Agent
```

### Backend

```bash
cd Backend

# create a virtual environment
python -m venv .venv

# activate it
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

# install dependencies
pip install -r requirements.txt
```

Copy the example environment file and fill in your API key:

```bash
cp .env.example .env
```

Open `.env` and set your values:

```env
FAL_KEY=your-fal-ai-key-here

# these defaults work out of the box — only change if you use different endpoints
STT_ENDPOINT=freya-mypsdi253hbk/freya-stt
TTS_STREAM_ENDPOINT=freya-mypsdi253hbk/freya-tts/stream
LLM_ENDPOINT=openrouter/router

FRONTEND_URL=http://localhost:5173
```

> **Where to get `FAL_KEY`:** sign up at [fal.ai](https://fal.ai), go to your dashboard → API Keys, and create a new key.

### Frontend

```bash
cd Frontend/Lumo
npm install
```

### Chrome Extension

No build step needed — the extension loads directly from the `Extension/` folder.

---

## Running locally

You need three things running at the same time: the backend, the frontend, and the extension loaded in Chrome.

### 1. Start the backend

```bash
cd Backend
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

uvicorn main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`.  
Interactive API docs: [`http://localhost:8000/docs`](http://localhost:8000/docs)

---

### 2. Start the frontend

Open a second terminal:

```bash
cd Frontend/Lumo
npm run dev
```

The dashboard opens at [`http://localhost:5173`](http://localhost:5173).  
Register an account, then log in.

---

### 3. Load the Chrome extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `Extension/` folder from this repo
5. The LumoAI icon will appear in your Chrome toolbar

---

### 4. Use it

1. Open any YouTube video (or any tab with audio)
2. Click the **LumoAI** extension icon in the toolbar
3. Log in with the same account you created in the frontend
4. Click **Start Lumo** — the extension starts capturing tab audio and building context
5. Click the **microphone button** (or say **"Hey Lumo"**) and ask your question
6. The AI will respond in text and voice, in real time

---

## Project structure

```
Lumo_Voice_Agent/
├── Backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── models.py            # SQLModel database models
│       ├── database.py          # Engine and session setup
│       ├── auth.py              # JWT utilities
│       ├── config.py            # Pydantic settings (reads .env)
│       ├── routers/
│       │   ├── voice.py         # Core STT / LLM / TTS endpoints
│       │   ├── auth.py          # Register and login
│       │   ├── notes.py         # Notes CRUD
│       │   ├── history.py       # Session and message history
│       │   ├── uploads.py       # File upload and text extraction
│       │   └── health.py        # Health check
│       └── services/
│           ├── fal_service.py      # FAL.ai STT, TTS, LLM integration
│           └── context_manager.py  # In-memory session context store
│
├── Extension/
│   ├── manifest.json
│   ├── background.js            # Service worker — capture, wake word, routing
│   ├── offscreen.js             # Audio recording and TTS playback
│   ├── popup.html / popup.js    # Extension popup UI
│   ├── options.html / options.js # Microphone permission helper page
│   └── assets/
│
└── Frontend/
    └── Lumo/
        ├── src/
        │   ├── pages/           # Dashboard, Study, History, Notes, Profile
        │   ├── components/      # QuizInterface and UI primitives
        │   ├── api/             # Axios endpoint wrappers
        │   └── context/         # Auth context (JWT)
        └── package.json
```

---

## Configuration reference

All backend settings are read from `.env` via Pydantic:

| Variable | Default | Description |
|---|---|---|
| `FAL_KEY` | — | **Required.** Your FAL.ai API key |
| `STT_ENDPOINT` | `freya-mypsdi253hbk/freya-stt` | FAL.ai speech-to-text endpoint path |
| `TTS_STREAM_ENDPOINT` | `freya-mypsdi253hbk/freya-tts/stream` | FAL.ai TTS streaming endpoint path |
| `LLM_ENDPOINT` | `openrouter/router` | LLM endpoint (OpenRouter-compatible) |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `8000` | Port |

For production, point `DATABASE_URL` at a PostgreSQL instance and set `DEBUG=False`.

---

## API overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new user account |
| `POST` | `/api/auth/token` | Log in and receive a JWT |
| `GET` | `/api/auth/me` | Get the currently authenticated user |
| `POST` | `/api/voice/ask-stream` | Main streaming Q&A endpoint (NDJSON) |
| `POST` | `/api/voice/transcribe-video` | Add a video audio chunk to session context |
| `POST` | `/api/voice/session/new` | Create a new voice session |
| `DELETE` | `/api/voice/session/{id}` | Delete a session |
| `POST` | `/api/voice/quiz-setup` | Prepare a quiz context from a session or note |
| `POST` | `/api/voice/speak-stream` | Streaming TTS for arbitrary text |
| `GET` | `/api/history/sessions` | List all sessions for the current user |
| `GET` | `/api/notes/` | List all notes |
| `POST` | `/api/notes/` | Create a note |
| `POST` | `/api/uploads/` | Upload a file (PDF or TXT) |

Full interactive docs at [`http://localhost:8000/docs`](http://localhost:8000/docs).

---

## Potential improvements

- WebSocket transport for lower latency on the question pathway
- Persistent wake word model (Picovoice / OpenWakeWord) to replace Web Speech API dependency
- PostgreSQL + Docker Compose setup for one-command production deployment
- Multi-language support beyond English
- Automatic summary generation from session transcripts
- Chrome Web Store listing

---

## License

MIT
