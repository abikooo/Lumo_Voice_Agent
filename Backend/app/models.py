from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship, JSON
from pydantic import EmailStr

# -----------------
# 1. USER MODEL
# -----------------
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    full_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    sessions: List["Session"] = Relationship(back_populates="user")
    uploads: List["UserUpload"] = Relationship(back_populates="user")
    quizzes: List["Quiz"] = Relationship(back_populates="user")
    # Link to Note as well
    notes: List["Note"] = Relationship(back_populates="user")

# -----------------
# 2. SESSION & VISION
# -----------------
class Session(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    
    title: str = Field(default="Untitled Session")
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    status: str = Field(default="started") # started, completed
    video_url: Optional[str] = Field(default=None)
    
    transcript_text: str = Field(default="") # Full audio transcript
    summary: str = Field(default="")         # AI Summary
    
    user: User = Relationship(back_populates="sessions")
    images: List["SessionImage"] = Relationship(back_populates="session")
    smart_notes: List["SmartNote"] = Relationship(back_populates="session")
    messages: List["Message"] = Relationship(back_populates="session")

class SessionImage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    image_path: str
    timestamp_seconds: int = 0
    analysis_text: str = "" # AI description of the frame
    
    session: Session = Relationship(back_populates="images")

# -----------------
# 2.5 MESSAGE (Chat History)
# -----------------
class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    role: str # user, assistant
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    session: Session = Relationship(back_populates="messages")

# -----------------
# 3. SMART NOTES (AI Generated)
# -----------------
class SmartNote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    
    title: str = "Smart Note"
    content: str # Markdown content
    tags: str = "" # comma separated
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    session: Session = Relationship(back_populates="smart_notes")

# -----------------
# 4. MY NOTES (User Uploads)
# -----------------
class UserUpload(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    
    filename: str
    file_type: str # pdf, docx, txt
    file_path: str
    extracted_text: str = "" # Content for RAG
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: User = Relationship(back_populates="uploads")

# -----------------
# 5. STUDY QUIZ
# -----------------
class Quiz(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    
    source_type: str # session, upload
    source_id: int
    
    questions: List[dict] = Field(default=[], sa_type=JSON) 
    score: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: User = Relationship(back_populates="quizzes")

# -----------------
# 6. NOTE (Manual / General)
# -----------------
class Note(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    title: str
    content: str
    color: str = "#ECC94B"
    tags: str = ""
    source: str = "manual" # generated, upload, manual
    file_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: User = Relationship(back_populates="notes")
