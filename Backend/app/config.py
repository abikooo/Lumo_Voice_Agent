from pydantic_settings import BaseSettings
from functools import lru_cache


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
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    FAL_KEY: str = ""

    # FAL.ai Endpoints
    STT_ENDPOINT: str = "freya-mypsdi253hbk/freya-stt"
    TTS_ENDPOINT: str = "freya-mypsdi253hbk/freya-tts"
    TTS_STREAM_ENDPOINT: str = "freya-mypsdi253hbk/freya-tts/stream"
    LLM_ENDPOINT: str = "openrouter/router"

    @property
    def fal_stt_url(self) -> str:
        return f"https://fal.run/{self.STT_ENDPOINT}"

    @property
    def fal_tts_url(self) -> str:
        return f"https://fal.run/{self.TTS_ENDPOINT}"

    @property
    def fal_tts_stream_url(self) -> str:
        return f"https://fal.run/{self.TTS_STREAM_ENDPOINT}"

    @property
    def fal_llm_url(self) -> str:
        return f"https://fal.run/{self.LLM_ENDPOINT}"

    @property
    def fal_headers(self) -> dict:
        return {"Authorization": f"Key {self.FAL_KEY}"}

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
