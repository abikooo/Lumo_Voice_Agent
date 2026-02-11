import httpx
import base64
from app.config import get_settings

settings = get_settings()


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.wav", language: str = "tr") -> str:
    """
    Ses dosyasını metne çevirir (Speech-to-Text).
    
    Args:
        audio_bytes: Ses dosyasının binary içeriği
        filename: Dosya adı (format belirleme için)
        language: Dil kodu
    
    Returns:
        Transkript metni
    """
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


async def generate_speech(text: str, response_format: str = "wav", speed: float = 1.0) -> bytes:
    """
    Metinden ses üretir (Text-to-Speech).
    
    Args:
        text: Sese çevrilecek metin
        response_format: Ses formatı (wav, mp3, opus, etc.)
        speed: Oynatma hızı (0.25 - 4.0)
    
    Returns:
        Ses dosyasının binary içeriği
    """
    url = f"{settings.fal_tts_url}/audio/speech"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            url,
            headers={
                **settings.fal_headers,
                "Content-Type": "application/json",
            },
            json={
                "input": text,
                "voice": "ali",
                "response_format": response_format,
                "speed": speed,
            },
        )
        response.raise_for_status()
        return response.content


async def generate_speech_stream(text: str, response_format: str = "mp3", speed: float = 1.0):
    """
    Streaming TTS - FAL stream endpoint'i SSE formatında döner:
      data: {"audio": "base64_encoded_audio"}
    
    Bu fonksiyon SSE'yi parse eder, base64'ü çözer ve raw audio bytes yield eder.
    """
    import json
    
    url = settings.fal_tts_stream_url
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            url,
            headers={
                **settings.fal_headers,
                "Content-Type": "application/json",
            },
            json={
                "input": text,
                "voice": "ali",
                "response_format": response_format,
                "speed": speed,
            },
        ) as response:
            response.raise_for_status()
            
            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk
                
                # SSE formatını parse et: "data: {...}\n\n"
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    
                    if line.startswith("data: "):
                        json_str = line[6:]  # "data: " kısmını çıkar
                        try:
                            data = json.loads(json_str)
                            if "audio" in data:
                                import base64
                                audio_bytes = base64.b64decode(data["audio"])
                                yield audio_bytes
                        except json.JSONDecodeError:
                            continue


async def chat_completion(
    user_message: str,
    video_context: str = "",
    conversation_history: list[dict] | None = None,
) -> str:
    """
    LLM ile sohbet — video bağlamıyla birlikte soru yanıtlar.
    FAL.ai OpenRouter API formatını kullanır.
    
    Args:
        user_message: Kullanıcının sorusu
        video_context: Video transkriptinden elde edilen bağlam
        conversation_history: Önceki mesaj geçmişi
    
    Returns:
        AI yanıtı (metin)
    """
    system_prompt = (
        "Sen LumoAI adlı bir eğitim asistanısın. "
        "Kullanıcı bir eğitim videosu izliyor ve sana sorular soruyor. "
        "Videodan elde edilen transkripti kullanarak soruları yanıtla. "
        "Yanıtların kısa, net ve öğretici olsun. "
        "Türkçe konuş. Sesli yanıt olarak okunacağı için yanıtını ona göre formatla — "
        "madde işaretleri, kod blokları gibi sesle okunamayacak formatlardan kaçın."
    )

    if video_context:
        system_prompt += f"\n\nVideo Transkripti (son bölüm):\n{video_context}"

    # Konuşma geçmişini prompt'a ekle
    full_prompt = ""
    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                full_prompt += f"Kullanıcı: {content}\n"
            elif role == "assistant":
                full_prompt += f"Asistan: {content}\n"
    
    full_prompt += f"Kullanıcı: {user_message}"

    url = settings.fal_llm_url

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            headers={
                **settings.fal_headers,
                "Content-Type": "application/json",
            },
            json={
                "model": "google/gemini-2.0-flash-001",
                "prompt": full_prompt,
                "system_prompt": system_prompt,
                "max_tokens": 500,
                "temperature": 0.7,
            },
        )
        response.raise_for_status()
        result = response.json()
        return result.get("output", "")

