from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.database import get_session
from app.models import Session as DbSession, Message, User
from app.auth import get_current_user

router = APIRouter(prefix="/history", tags=["History"])

@router.get("/sessions", response_model=List[DbSession])
async def read_sessions(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    sessions = db.exec(select(DbSession).where(DbSession.user_id == current_user.id).order_by(DbSession.start_time.desc())).all()
    return sessions

@router.get("/sessions/{session_id}/messages", response_model=List[Message])
async def read_session_messages(
    session_id: int, 
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Verify session ownership
    session = db.get(DbSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
          raise HTTPException(status_code=403, detail="Not authorized")

    # Message model might need to link to session properly. 
    # Current models.py didn't include Message model explicitly in Step 1657!
    # I missed Message model in Step 1657 rewrite!
    # I must check if Message is in models.py. 
    # If not, I need to add it.
    
    messages = db.exec(select(Message).where(Message.session_id == session_id).order_by(Message.created_at)).all()
    return messages
