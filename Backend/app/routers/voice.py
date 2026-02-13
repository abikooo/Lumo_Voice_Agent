import uuid
import base64
import httpx
import json
import re
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlmodel import Session, select

from app.services import fal_service
from app.services.context_manager import context_manager
from app.database import get_session
from app.models import Session as DbSession, Message, User
from app.auth import get_current_user

router = APIRouter(prefix="/voice", tags=["Voice"])


def _ndjson_event(payload: dict) -> bytes:
    return (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")


def _split_complete_sentences(text: str) -> tuple[list[str], str]:
    parts = re.split(r"(?<=[.!?])\s+", text)
    if len(parts) <= 1:
        return [], text
    complete = [p.strip() for p in parts[:-1] if p.strip()]
    remainder = parts[-1]
    return complete, remainder

def get_or_create_db_session(session_id: str, db: Session, user: User) -> DbSession:
    # If session_id is "default", create new
    if session_id == "default":
        # Create new session if default is requested, but it's better to use /session/new
        new_session = DbSession(title="New Conversation", user_id=user.id)
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        return new_session
    
    # Check if int
    try:
        s_id = int(session_id)
        db_session = db.get(DbSession, s_id)
        if db_session and db_session.user_id == user.id:
            return db_session
    except ValueError:
        pass
        
    # If not found or not owned, create new
    new_session = DbSession(title="New Conversation", user_id=user.id)
    db.add(new_session)
    db.commit()
    return new_session


@router.post("/ask")
async def ask_question(
    audio: UploadFile = File(...), 
    session_id: str = "default",
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Kullanıcının sesli sorusunu alır, transkript eder, 
    video bağlamı ile LLM'e gönderir, yanıtı sesle döner.
    """
    # 1. DB Oturumunu al/oluştur (User linked)
    db_session = get_or_create_db_session(session_id, db, current_user)
    current_session_id = db_session.id
    
    # RAM Context
    ram_session = context_manager.get_or_create(str(current_session_id))

    # 2. Audio -> Text (STT)
    audio_bytes = await audio.read()
    user_question = await fal_service.transcribe_audio(
        audio_bytes, 
        filename=audio.filename or "audio.webm"
    )

    if not user_question.strip():
        return {"error": "Ses anlaşılamadı", "transcript": ""}

    # 3. DB'den Konuşma Geçmişini Çek
    # (Checking Message model exists - assuming I added it or will add it)
    statement = select(Message).where(Message.session_id == current_session_id).order_by(Message.created_at.desc()).limit(6)
    past_messages = db.exec(statement).all()
    past_messages.reverse()
    
    history_for_llm = [
        {"role": msg.role, "content": msg.content} 
        for msg in past_messages
    ]

    # 4. Video bağlamını al (RAM'den)
    video_context = ram_session.get_context()
    custom_prompt = ram_session.get_system_prompt()

    # 5. LLM'e gönder
    ai_response = await fal_service.chat_completion(
        user_message=user_question,
        video_context=video_context,
        conversation_history=history_for_llm,
        override_system_prompt=custom_prompt
    )

    # 6. Mesajları DB'ye kaydet
    user_msg = Message(session_id=current_session_id, role="user", content=user_question)
    ai_msg = Message(session_id=current_session_id, role="assistant", content=ai_response)
    db.add(user_msg)
    db.add(ai_msg)
    db.commit()

    # 7. Session Başlığını Güncelle
    if db_session.title == "New Conversation" or db_session.title == "New Session":
        db_session.title = user_question[:30] + "..."
        db.add(db_session)
        db.commit()

    return {
        "user_transcript": user_question,
        "ai_response": ai_response,
        "session_id": current_session_id,
    }


@router.post("/ask-stream")
async def ask_question_stream(
    audio: UploadFile = File(...),
    session_id: str = "default",
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    db_session = get_or_create_db_session(session_id, db, current_user)
    current_session_id = db_session.id
    ram_session = context_manager.get_or_create(str(current_session_id))

    audio_bytes = await audio.read()
    user_question = await fal_service.transcribe_audio(
        audio_bytes,
        filename=audio.filename or "audio.webm"
    )
    if not user_question.strip():
        return Response(status_code=400, content="Ses anlaşılamadı")

    statement = select(Message).where(Message.session_id == current_session_id).order_by(Message.created_at.desc()).limit(6)
    past_messages = db.exec(statement).all()
    past_messages.reverse()
    history_for_llm = [{"role": msg.role, "content": msg.content} for msg in past_messages]

    video_context = ram_session.get_context()
    custom_prompt = ram_session.get_system_prompt()

    async def event_stream():
        ai_response_full = ""
        sentence_buf = ""

        yield _ndjson_event({"type": "user_transcript", "text": user_question})

        async for delta in fal_service.chat_completion_stream(
            user_message=user_question,
            video_context=video_context,
            conversation_history=history_for_llm,
            override_system_prompt=custom_prompt,
        ):
            ai_response_full += delta
            sentence_buf += delta
            yield _ndjson_event({"type": "text_delta", "delta": delta})

            completed, sentence_buf = _split_complete_sentences(sentence_buf)
            for sentence in completed:
                audio_bytes_all = b""
                async for chunk in fal_service.generate_speech_stream(
                    sentence,
                    response_format="wav",
                    voice_id="ali",
                    speed=0.9,
                ):
                    audio_bytes_all += chunk

                if audio_bytes_all:
                    audio_b64 = base64.b64encode(audio_bytes_all).decode("utf-8")
                    yield _ndjson_event({
                        "type": "audio_chunk",
                        "format": "wav",
                        "text": sentence,
                        "audio_base64": audio_b64
                    })

        if sentence_buf.strip():
            audio_bytes_all = b""
            async for chunk in fal_service.generate_speech_stream(
                sentence_buf.strip(),
                response_format="wav",
                voice_id="ali",
                speed=0.9,
            ):
                audio_bytes_all += chunk
            if audio_bytes_all:
                audio_b64 = base64.b64encode(audio_bytes_all).decode("utf-8")
                yield _ndjson_event({
                    "type": "audio_chunk",
                    "format": "wav",
                    "text": sentence_buf.strip(),
                    "audio_base64": audio_b64
                })

        user_msg = Message(session_id=current_session_id, role="user", content=user_question)
        ai_msg = Message(session_id=current_session_id, role="assistant", content=ai_response_full)
        db.add(user_msg)
        db.add(ai_msg)
        db.commit()

        if db_session.title == "New Conversation" or db_session.title == "New Session":
            db_session.title = user_question[:30] + "..."
            db.add(db_session)
            db.commit()

        yield _ndjson_event({
            "type": "done",
            "ai_response": ai_response_full,
            "session_id": current_session_id
        })

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")


from pydantic import BaseModel

class SpeakRequest(BaseModel):
    text: str
    response_format: str = "wav"
    voice_id: str = "ali"
    speed: float = 0.9

@router.post("/speak")
async def speak(request: SpeakRequest):
    """
    Metinden ses üretir ve ses dosyasının URL'ini döner.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
        
    try:
        audio_url = await fal_service.generate_speech_url(
            request.text, 
            response_format=request.response_format,
            voice_id=request.voice_id,
            speed=request.speed,
        )
        return {"audio_url": audio_url}
    except Exception as e:
        print(f"ERROR: /speak failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speak-stream")
async def speak_stream(request: SpeakRequest):
    """
    True Streaming TTS - Fal.ai'den parçaları aldıkça frontend'e iletir.
    """
    if not request.text.strip():
        return Response(status_code=400, content="text is required")
    
    try:
        normalized_format = request.response_format.lower().strip()
        if normalized_format == "mp3":
            mime_type = "audio/mpeg"
        elif normalized_format in {"wav", "wave"}:
            mime_type = "audio/wav"
        else:
            mime_type = f"audio/{normalized_format}"
        
        return StreamingResponse(
            fal_service.generate_speech_stream(
                request.text, 
                response_format=normalized_format,
                voice_id=request.voice_id,
                speed=request.speed,
            ),
            media_type=mime_type
        )
    except Exception as e:
        print(f"ERROR: /speak-stream failed: {e}")
        return Response(status_code=500, content=str(e))


@router.post("/transcribe-video")
async def transcribe_video_chunk(
    audio: UploadFile = File(...), 
    session_id: str = "default",
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Similar to ask, ensure session ownership or creation
    # If session_id is "default", we can't create a DB session here easily without more info.
    # But usually this is called within a session context.
    # For now, just use RAM session with ID provided.
    
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

# In-memory store for pending quiz contexts (user_id -> context_data)
# In-memory store removal: passing context via payload in /session/new instea

@router.post("/quiz-setup")
async def setup_quiz(
    payload: dict,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    source_type = payload.get("source_type") # "session" or "note"
    source_id = payload.get("source_id")
    
    if not source_type or not source_id:
        raise HTTPException(status_code=400, detail="Missing source_type or source_id")
        
    # Instead of storing in-memory, we return the context signature 
    # and expect the client to pass it back to /session/new
    
    return {
        "status": "ready", 
        "message": "Quiz context ready. Please activate Lumo extension.",
        "quiz_context": {
            "source_type": source_type,
            "source_id": int(source_id)
        }
    }

@router.post("/session/new")
async def create_session(
    payload: dict = {},
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    video_url = payload.get("video_url")
    quiz_context = payload.get("quiz_context") # Client passes this back
    
    title = "New Conversation"
    initial_system_prompt = None
    
    if quiz_context:
        source_type = quiz_context.get("source_type")
        source_id = quiz_context.get("source_id")
        content_text = ""
        
        if source_type == "session":
            # Fetch session transcript
            src_session = db.get(DbSession, source_id)
            if src_session:
                content_text = src_session.transcript_text or src_session.summary or "No content found."
                title = f"Quiz: {src_session.title}"
        elif source_type == "note":
            # Fetch note content - Assuming Note model exists and is imported
            # We need to import Note model inside simple `get` or ensure it's in models
            from app.models import Note, SmartNote
            if source_type == "note": # Just covering logic
                 # Check Note (manual)
                 note = db.get(Note, source_id)
                 if note:
                     content_text = note.content
                     title = f"Quiz: {note.title}"
                 else:
                     # Check SmartNote
                     smart_note = db.get(SmartNote, source_id)
                     if smart_note:
                         content_text = smart_note.content
                         title = f"Quiz: {smart_note.title}"
        
        if content_text:
            initial_system_prompt = (
                f"You are an engaging AI tutor. The user wants to take a quiz on the following material:\n\n"
                f"\"{content_text[:2000]}...\" (truncated)\n\n"
                f"Start by asking a question to test their understanding. "
                f"Give brief feedback on their answers and ask the next question. "
                f"Keep it interactive and fun."
            )

    new_session = DbSession(title=title, user_id=current_user.id, video_url=video_url)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Create RAM session with optional system prompt override
    ram_session = context_manager.get_or_create(str(new_session.id))
    
    if initial_system_prompt:
        ram_session.set_system_prompt(initial_system_prompt)
    
    return {"session_id": new_session.id}

@router.delete("/session/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    session = db.get(DbSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db.delete(session)
    db.commit()
    
    return {"status": "deleted"}
