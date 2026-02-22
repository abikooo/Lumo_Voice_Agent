# LumoAI

[![GitHub](https://img.shields.io/badge/GitHub-abikooo%2FLumo__Voice__Agent-181717?logo=github)](https://github.com/abikooo/Lumo_Voice_Agent)

LumoAI is an open-source AI-powered study companion that lives inside your browser. It listens to whatever educational video you are watching, understands the content in real time, and lets you ask voice questions about it — hands-free, without switching tabs.

The project is made up of three parts that work together: a Chrome extension that handles audio capture and the voice interface, a React dashboard for managing notes and session history, and a FastAPI backend that wires up speech-to-text, a language model, and text-to-speech into a low-latency streaming pipeline.

---

## What it does

**Real-time voice Q&A while watching videos**
The extension captures tab audio in the background, continuously transcribes it, and builds a rolling context window from the video content. When you press the microphone button (or say "Hey Lumo"), it records your question, sends it to the backend alongside that context, streams the LLM response sentence by sentence, converts each sentence to speech as it arrives, and plays the audio back — all before the full response is even finished generating.

**Session-aware conversation history**
Every question and answer is stored under a session tied to your account. You can review past conversations, resume where you left off, or use a previous session as the basis for a quiz.

**Voice-driven quizzes**
Pick any past session or note from the dashboard and start a quiz. Lumo generates questions based on the material and quizzes you in a back-and-forth voice conversation.

**Smart notes and file uploads**
Upload PDFs or text files to use as quiz material or study references. Notes can also be created manually or auto-generated from session transcripts.

**"Hey Lumo" wake word**
The extension listens passively using the Web Speech API. When it detects the word "Lumo", it automatically starts recording your question, waits for silence, then sends it — no button press needed.

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
│  /api/voice/ask-stream  — STT → LLM → TTS pipeline│
│  /api/voice/transcribe-video  — background context │
│  /api/auth  — JWT register / login                 │
│  /api/notes, /api/history, /api/uploads            │
│                                                    │
│  Services: FAL.ai (STT, TTS, LLM via OpenRouter)  │
│  DB: SQLite (dev) / PostgreSQL (production)        │
└───────────────────┬────────────────────────────────┘
                    │  REST API
┌───────────────────▼────────────────────────────────┐
│          React Frontend (Vite + TypeScript)        │
│                                                    │
│  Dashboard · History · Smart Notes · Study / Quiz  │
└────────────────────────────────────────────────────┘
```

The streaming pipeline works like this:

1. The extension sends a `.webm` audio blob to `/api/voice/ask-stream`
2. The backend transcribes it with FAL.ai STT
3. The transcript, along with the last 3000 characters of video context and up to 6 previous messages, is sent to Gemini 2.0 Flash via OpenRouter as an SSE stream
4. As text deltas arrive, complete sentences are detected and immediately sent to FAL.ai TTS
5. Each TTS chunk (PCM16 wrapped in WAV) is base64-encoded and forwarded to the extension as an NDJSON `audio_chunk` event
6. The offscreen document decodes and queues each chunk for sequential playback

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

## Getting started

### Requirements

- Python 3.11 or newer
- Node.js 18 or newer
- A FAL.ai API key — get one at [fal.ai](https://fal.ai)
- Google Chrome (for the extension)

---

### 1. Backend

```bash
cd Backend

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Open .env and set your FAL_KEY
```

Your `.env` should look like this:

```env
FAL_KEY=your-fal-key-here
STT_ENDPOINT=freya-mypsdi253hbk/freya-stt
TTS_STREAM_ENDPOINT=freya-mypsdi253hbk/freya-tts/stream
LLM_ENDPOINT=openrouter/router
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs are at `/docs`.

---

### 2. Frontend

```bash
cd Frontend/Lumo
npm install
npm run dev
```

The dashboard opens at `http://localhost:5173`. Register an account, then log in.

---

### 3. Chrome Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `Extension/` folder
4. The LumoAI icon will appear in your toolbar

Open any video on YouTube or another platform, click the extension icon, log in with the same account you created in the frontend, and press **Start Lumo**.

---

## Project structure

```
Lumo_Last/
├── Backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── models.py            # SQLModel database models
│       ├── database.py          # Engine and session setup
│       ├── auth.py              # JWT utilities
│       ├── config.py            # Pydantic settings
│       ├── routers/
│       │   ├── voice.py         # Core STT / LLM / TTS endpoints
│       │   ├── auth.py          # Register and login
│       │   ├── notes.py         # Notes CRUD
│       │   ├── history.py       # Session and message history
│       │   ├── uploads.py       # File upload and text extraction
│       │   └── health.py        # Health check
│       └── services/
│           ├── fal_service.py   # FAL.ai STT, TTS, LLM integration
│           └── context_manager.py  # In-memory session context
│
├── Extension/
│   ├── manifest.json
│   ├── background.js            # Service worker — capture, wake word, question routing
│   ├── offscreen.js             # Audio recording and TTS playback
│   ├── popup.html / popup.js    # Extension popup UI
│   ├── options.html / options.js # Microphone permission page
│   └── assets/
│
└── Frontend/
    └── Lumo/
        ├── src/
        │   ├── pages/           # Dashboard, Study, History, Notes, Profile
        │   ├── components/      # QuizInterface and UI primitives
        │   ├── api/             # Axios endpoint wrappers
        │   └── context/         # Auth context
        └── package.json
```

---

## Configuration reference

The backend reads all settings from the `.env` file via Pydantic:

| Variable | Default | Description |
|---|---|---|
| `FAL_KEY` | — | **Required.** Your FAL.ai API key |
| `STT_ENDPOINT` | `freya-mypsdi253hbk/freya-stt` | FAL.ai speech-to-text endpoint |
| `TTS_STREAM_ENDPOINT` | `freya-mypsdi253hbk/freya-tts/stream` | FAL.ai text-to-speech streaming endpoint |
| `LLM_ENDPOINT` | `openrouter/router` | LLM endpoint (OpenRouter compatible) |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `8000` | Port |

For production, swap `database.py` to use a PostgreSQL connection string and set `DEBUG=False`.

---

## API overview

The backend exposes these main routes:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new user account |
| `POST` | `/api/auth/token` | Log in and receive a JWT |
| `GET` | `/api/auth/me` | Get the current user |
| `POST` | `/api/voice/ask-stream` | Main streaming Q&A endpoint |
| `POST` | `/api/voice/transcribe-video` | Add a video audio chunk to session context |
| `POST` | `/api/voice/session/new` | Create a new voice session |
| `DELETE` | `/api/voice/session/{id}` | Delete a session |
| `POST` | `/api/voice/quiz-setup` | Prepare quiz context |
| `POST` | `/api/voice/speak-stream` | Streaming TTS for arbitrary text |
| `GET` | `/api/history/sessions` | List all sessions for the current user |
| `GET` | `/api/notes/` | List all notes |
| `POST` | `/api/notes/` | Create a note |
| `POST` | `/api/uploads/` | Upload a file (PDF, TXT) |

Full interactive documentation is available at `http://localhost:8000/docs` when the server is running.

---

## Potential improvements

- WebSocket transport for lower latency on the question pathway
- Persistent wake word model (Picovoice / OpenWakeWord) to replace Web Speech API dependency
- PostgreSQL migration guide and Docker Compose setup for production
- Multi-language support beyond English
- Summary generation from session transcripts using the LLM
- Browser extension store listing

---

## License

MIT
