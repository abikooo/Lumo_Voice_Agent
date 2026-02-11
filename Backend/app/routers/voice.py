import uuid
import base64
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import Response

from app.services import fal_service
from app.services.context_manager import context_manager

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post("/ask")
async def ask_question(audio: UploadFile = File(...), session_id: str = "default"):
    """
    Kullanıcının sesli sorusunu alır, transkript eder, 
    video bağlamı ile LLM'e gönderir, yanıtı sesle döner.
    
    Flow: User Audio → STT → LLM (+ video context) → TTS → Audio Response
    """
    # Oturum bağlamını al
    session = context_manager.get_or_create(session_id)

    # 1. Kullanıcının sesini metne çevir (STT)
    audio_bytes = await audio.read()
    user_question = await fal_service.transcribe_audio(
        audio_bytes, 
        filename=audio.filename or "audio.webm"
    )

    if not user_question.strip():
        return {"error": "Ses anlaşılamadı", "transcript": ""}

    # 2. Video bağlamını al
    video_context = session.get_context()

    # 3. LLM'e gönder
    ai_response = await fal_service.chat_completion(
        user_message=user_question,
        video_context=video_context,
        conversation_history=session.conversation_history,
    )

    # 4. Konuşma geçmişine ekle
    session.add_message("user", user_question)
    session.add_message("assistant", ai_response)

    return {
        "user_transcript": user_question,
        "ai_response": ai_response,
        "session_id": session_id,
    }


@router.post("/speak-stream")
async def speak_stream(request: dict):
    """
    TTS — metni sese çevirip binary audio döner.
    Request body: {"text": "...", "response_format": "mp3"}
    """
    text = request.get("text", "")
    response_format = request.get("response_format", "mp3")
    
    if not text.strip():
        return Response(status_code=400, content="text is required")
    
    # Kanıtlanmış /audio/speech endpoint'ini kullan
    audio_data = await fal_service.generate_speech(text, response_format=response_format)
    mime_type = "audio/mpeg" if response_format == "mp3" else f"audio/{response_format}"
    return Response(content=audio_data, media_type=mime_type)


@router.post("/transcribe-video")
async def transcribe_video_chunk(audio: UploadFile = File(...), session_id: str = "default"):
    """
    Video ses chunk'ını alır, transkript eder ve bağlama ekler.
    Extension periyodik olarak video sesini gönderir.
    """
    session = context_manager.get_or_create(session_id)

    audio_bytes = await audio.read()
    transcript = await fal_service.transcribe_audio(
        audio_bytes,
        filename=audio.filename or "video_audio.webm"
    )

    if transcript.strip():
        session.add_transcript(transcript)

    return {
        "transcript": transcript,
        "total_context_length": len(session.get_context()),
        "session_id": session_id,
    }


@router.post("/session/new")
async def create_session():
    """Yeni bir oturum başlatır."""
    session_id = str(uuid.uuid4())
    context_manager.get_or_create(session_id)
    return {"session_id": session_id}


@router.delete("/session/{session_id}")
async def end_session(session_id: str):
    """Oturumu sonlandırır."""
    context_manager.remove(session_id)
    return {"status": "ok", "message": f"Session {session_id} ended"}


@router.get("/session/{session_id}/context")
async def get_session_context(session_id: str):
    """Oturum bağlamını döndürür (debug için)."""
    session = context_manager.get_or_create(session_id)
    return {
        "session_id": session_id,
        "context": session.get_context(),
        "transcript_chunks": len(session.transcript_chunks),
        "conversation_history": session.conversation_history,
    }


@router.websocket("/stream/{session_id}")
async def voice_stream(websocket: WebSocket, session_id: str):
    """
    WebSocket ile gerçek zamanlı ses iletimi.
    Extension video ses chunk'larını buradan gönderir.
    """
    await websocket.accept()
    session = context_manager.get_or_create(session_id)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "video_audio":
                # Video sesini transkript et ve bağlama ekle
                audio_b64 = data.get("audio", "")
                audio_bytes = base64.b64decode(audio_b64)
                transcript = await fal_service.transcribe_audio(audio_bytes)

                if transcript.strip():
                    session.add_transcript(transcript)

                await websocket.send_json({
                    "type": "transcript",
                    "text": transcript,
                    "context_length": len(session.get_context()),
                })

            elif msg_type == "user_question":
                # Kullanıcı sorusu
                audio_b64 = data.get("audio", "")
                audio_bytes = base64.b64decode(audio_b64)

                # STT
                user_question = await fal_service.transcribe_audio(audio_bytes)

                if not user_question.strip():
                    await websocket.send_json({
                        "type": "error",
                        "message": "Ses anlaşılamadı",
                    })
                    continue

                await websocket.send_json({
                    "type": "user_transcript",
                    "text": user_question,
                })

                # LLM
                video_context = session.get_context()
                ai_response = await fal_service.chat_completion(
                    user_message=user_question,
                    video_context=video_context,
                    conversation_history=session.conversation_history,
                )

                session.add_message("user", user_question)
                session.add_message("assistant", ai_response)

                await websocket.send_json({
                    "type": "ai_response",
                    "text": ai_response,
                })

                # TTS
                speech_audio = await fal_service.generate_speech(ai_response)
                audio_b64_response = base64.b64encode(speech_audio).decode("utf-8")

                await websocket.send_json({
                    "type": "ai_audio",
                    "audio": audio_b64_response,
                    "format": "wav",
                })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        context_manager.cleanup_stale()
