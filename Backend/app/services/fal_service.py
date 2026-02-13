import httpx
import base64
import json
import struct
from app.config import get_settings

settings = get_settings()


def _pcm16_to_wav_bytes(pcm_bytes: bytes, sample_rate: int = 24000, channels: int = 1) -> bytes:
    """Wrap raw PCM16LE bytes in a WAV container."""
    bits_per_sample = 16
    byte_rate = sample_rate * channels * (bits_per_sample // 8)
    block_align = channels * (bits_per_sample // 8)
    data_size = len(pcm_bytes)
    riff_size = 36 + data_size

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        riff_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + pcm_bytes


def _extract_sample_rate(evt: dict) -> int | None:
    # FAL stream payload may include rate metadata with different keys.
    for key in ("sample_rate", "sampling_rate", "sampleRate", "rate"):
        val = evt.get(key)
        if isinstance(val, (int, float)) and val > 1000:
            return int(val)
    audio_meta = evt.get("audio")
    if isinstance(audio_meta, dict):
        for key in ("sample_rate", "sampling_rate", "sampleRate", "rate"):
            val = audio_meta.get(key)
            if isinstance(val, (int, float)) and val > 1000:
                return int(val)
    return None

async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.wav", language: str = "tr") -> str:
    url = f"{settings.fal_stt_url}/audio/transcriptions"
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            url,
            headers=settings.fal_headers,
            files={"file": (filename, audio_bytes)},
            data={"language": language},
        )
        response.raise_for_status()
        result = response.json()
        return result.get("text", "")

async def generate_speech_url(
    text: str,
    response_format: str = "mp3",
    speed: float = 0.9,
    voice_id: str = "ali",
) -> str:
    """
    Metinden ses üretir ve dosya URL'ini döner (Non-streaming).
    """
    # URL'den /stream kısmını kaldırıp /generate ekliyoruz
    url = settings.fal_tts_stream_url.replace("/stream", "/generate")
    if not url.endswith("/generate"):
        url = url.rstrip("/") + "/generate"
    
    headers = {
        **settings.fal_headers,
        "Content-Type": "application/json",
    }
    
    payload = {
        "input": text,
        "voice": voice_id,
        "response_format": response_format,
        "speed": speed,
    }

    print(f"DEBUG TTS: Requesting audio URL for text: '{text[:20]}...'")
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        
        # Fal.ai formatına göre audio.url kısmını alıyoruz
        audio_url = data.get("audio", {}).get("url")
        if not audio_url:
            raise Exception("Fal.ai response did not contain an audio URL")
            
        print(f"DEBUG TTS: Received Audio URL: {audio_url}")
        return audio_url

async def generate_speech_stream(
    text: str,
    response_format: str = "wav",
    speed: float = 0.9,
    voice_id: str = "ali",
):
    """
    True Streaming TTS (SSE):
    data: {"audio": "base64..."}  (genelde PCM16 chunk)
    """
    url = settings.fal_tts_stream_url
    headers = {
        **settings.fal_headers,
        "Content-Type": "application/json",
    }
    payload = {
        "input": text,
        "voice": voice_id,
        "response_format": response_format,
        "speed": speed,
    }

    print(f"DEBUG TTS (STREAM): Requesting for '{text[:20]}...'")
    chunks: list[bytes] = []
    sample_rate = 24000
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                
                json_str = line[6:].strip()
                if json_str == "[DONE]":
                    break
                
                try:
                    data = json.loads(json_str)
                    evt_sr = _extract_sample_rate(data)
                    if evt_sr:
                        sample_rate = evt_sr
                    if "audio" in data:
                        b64_data = data["audio"]
                        if isinstance(b64_data, dict):
                            b64_data = b64_data.get("data") or b64_data.get("audio") or ""
                        if not isinstance(b64_data, str):
                            continue
                        # Strip prefix if exists
                        if "," in b64_data:
                            b64_data = b64_data.split(",")[1]
                        
                        chunk = base64.b64decode(b64_data)
                        if chunk:
                            chunks.append(chunk)
                except Exception as e:
                    print(f"DEBUG TTS (STREAM) ERROR: {e}")
                    continue

    if not chunks:
        raise Exception("TTS stream returned no audio chunks")

    pcm_bytes = b"".join(chunks)

    # FAL stream output is typically PCM16; browser playback needs a valid container.
    if response_format.lower().strip() in {"wav", "wave"} and not pcm_bytes.startswith(b"RIFF"):
        yield _pcm16_to_wav_bytes(pcm_bytes, sample_rate=sample_rate)
    else:
        yield pcm_bytes

async def chat_completion(
    user_message: str,
    video_context: str = "",
    conversation_history: list[dict] | None = None,
    override_system_prompt: str | None = None,
) -> str:
    if override_system_prompt:
        system_prompt = override_system_prompt
    else:
        system_prompt = (
            "Sen LumoAI adlı bir eğitim asistanısın. "
            "Kullanıcı bir eğitim videosu izliyor ve sana sorular soruyor. "
            "Yanıtların kısa, net ve öğretici olsun. Türkçe konuş."
        )

    if video_context:
        system_prompt += f"\n\nVideo Transkripti:\n{video_context}"

    full_prompt = ""
    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            full_prompt += f"{'Kullanıcı' if role == 'user' else 'Asistan'}: {content}\n"
    
    full_prompt += f"Kullanıcı: {user_message}"

    url = settings.fal_llm_url
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            headers={**settings.fal_headers, "Content-Type": "application/json"},
            json={
                "model": "google/gemini-2.0-flash-001",
                "prompt": full_prompt,
                "system_prompt": system_prompt,
                # Keep spoken replies concise to reduce wait before TTS.
                "max_tokens": 220,
                "temperature": 0.7,
            },
        )
        response.raise_for_status()
        result = response.json()
        return result.get("output", "")


def _build_system_prompt(video_context: str = "", override_system_prompt: str | None = None) -> str:
    if override_system_prompt:
        system_prompt = override_system_prompt
    else:
        system_prompt = (
            "Sen LumoAI adlı bir eğitim asistanısın. "
            "Kullanıcı bir eğitim videosu izliyor ve sana sorular soruyor. "
            "Yanıtların kısa, net ve öğretici olsun. Türkçe konuş."
        )

    if video_context:
        system_prompt += f"\n\nVideo Transkripti:\n{video_context}"
    return system_prompt


def _build_llm_messages(
    user_message: str,
    video_context: str = "",
    conversation_history: list[dict] | None = None,
    override_system_prompt: str | None = None,
) -> list[dict]:
    messages: list[dict] = [
        {"role": "system", "content": _build_system_prompt(video_context, override_system_prompt)}
    ]
    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role", "user")
            if role not in {"user", "assistant", "system"}:
                role = "user"
            content = msg.get("content", "")
            if content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})
    return messages


async def chat_completion_stream(
    user_message: str,
    video_context: str = "",
    conversation_history: list[dict] | None = None,
    override_system_prompt: str | None = None,
):
    """
    OpenRouter OpenAI-compatible SSE stream.
    Yields text deltas as soon as they arrive.
    """
    base_url = settings.fal_llm_url.rstrip("/")
    url = f"{base_url}/openai/v1/chat/completions"
    payload = {
        "model": "google/gemini-2.0-flash-001",
        "messages": _build_llm_messages(
            user_message=user_message,
            video_context=video_context,
            conversation_history=conversation_history,
            override_system_prompt=override_system_prompt,
        ),
        "max_tokens": 220,
        "temperature": 0.7,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            url,
            headers={**settings.fal_headers, "Content-Type": "application/json"},
            json=payload,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data_line = line[6:].strip()
                if data_line == "[DONE]":
                    break
                try:
                    data = json.loads(data_line)
                    choices = data.get("choices") or []
                    if not choices:
                        continue
                    delta = choices[0].get("delta") or {}
                    text_delta = delta.get("content")
                    if text_delta:
                        yield text_delta
                except Exception:
                    continue
