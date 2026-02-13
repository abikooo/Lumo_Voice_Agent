from pydantic_settings import BaseSettings
from functools import lru_cache
from urllib.parse import urlparse


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "LumoAI"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # API Keys
    # API Keys
    # Unused keys removed
    FAL_KEY: str

    # FAL.ai Endpoints
    STT_ENDPOINT: str = "freya-mypsdi253hbk/freya-stt"
    TTS_STREAM_ENDPOINT: str = "freya-mypsdi253hbk/freya-tts/stream"
    LLM_ENDPOINT: str = "openrouter/router"

    def _resolve_fal_url(self, endpoint: str) -> str:
        endpoint = (endpoint or "").strip()
        if not endpoint:
            return "https://fal.run"

        if endpoint.startswith("http://") or endpoint.startswith("https://"):
            parsed = urlparse(endpoint)
            host = (parsed.netloc or "").lower()
            path = (parsed.path or "").strip()

            # Accept dashboard-style URLs and convert to API URL.
            if host == "fal.ai" and path.startswith("/models/"):
                model_path = path[len("/models/"):].lstrip("/")
                return f"https://fal.run/{model_path}".rstrip("/")

            return endpoint.rstrip("/")

        return f"https://fal.run/{endpoint.lstrip('/')}".rstrip("/")

    @property
    def fal_stt_url(self) -> str:
        return self._resolve_fal_url(self.STT_ENDPOINT)

    @property
    def fal_tts_stream_url(self) -> str:
        return self._resolve_fal_url(self.TTS_STREAM_ENDPOINT)

    @property
    def fal_llm_url(self) -> str:
        return self._resolve_fal_url(self.LLM_ENDPOINT)

    @property
    def fal_headers(self) -> dict:
        return {"Authorization": f"Key {self.FAL_KEY}"}

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
