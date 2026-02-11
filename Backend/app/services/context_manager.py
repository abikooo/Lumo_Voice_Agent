import time
from dataclasses import dataclass, field


@dataclass
class SessionContext:
    """Bir kullanıcı oturumunun video bağlam verisi."""
    session_id: str
    transcript_chunks: list[str] = field(default_factory=list)
    conversation_history: list[dict] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)

    def add_transcript(self, text: str):
        """Video transkript parçası ekler."""
        if text.strip():
            self.transcript_chunks.append(text.strip())
            self.last_activity = time.time()

    def get_context(self, max_chars: int = 3000) -> str:
        """
        Son N karakterlik video transkriptini döndürür.
        Sliding window — en güncel bağlamı korur.
        """
        full_text = " ".join(self.transcript_chunks)
        if len(full_text) > max_chars:
            return full_text[-max_chars:]
        return full_text

    def add_message(self, role: str, content: str):
        """Konuşma geçmişine mesaj ekler."""
        self.conversation_history.append({"role": role, "content": content})
        self.last_activity = time.time()
        # Son 10 mesajı tut (5 soru-cevap çifti)
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]

    def clear(self):
        """Oturumu sıfırlar."""
        self.transcript_chunks.clear()
        self.conversation_history.clear()


class ContextManager:
    """Tüm aktif oturumları yönetir."""

    def __init__(self):
        self._sessions: dict[str, SessionContext] = {}

    def get_or_create(self, session_id: str) -> SessionContext:
        """Oturum varsa döndürür, yoksa yeni oluşturur."""
        if session_id not in self._sessions:
            self._sessions[session_id] = SessionContext(session_id=session_id)
        return self._sessions[session_id]

    def remove(self, session_id: str):
        """Oturumu kaldırır."""
        self._sessions.pop(session_id, None)

    def cleanup_stale(self, max_age_seconds: int = 3600):
        """1 saatten eski oturumları temizler."""
        now = time.time()
        stale = [
            sid for sid, ctx in self._sessions.items()
            if now - ctx.last_activity > max_age_seconds
        ]
        for sid in stale:
            del self._sessions[sid]


# Singleton instance
context_manager = ContextManager()
