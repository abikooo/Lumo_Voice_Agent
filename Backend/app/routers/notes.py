from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.database import get_session
from app.models import Note, User
from app.auth import get_current_user

router = APIRouter(prefix="/notes", tags=["Notes"])

@router.get("/", response_model=List[Note])
async def read_notes(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Filter by user_id
    notes = db.exec(select(Note).where(Note.user_id == current_user.id).order_by(Note.created_at.desc())).all()
    return notes

@router.post("/", response_model=Note)
async def create_note(
    note: Note, 
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    note.user_id = current_user.id
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.delete("/{note_id}")
async def delete_note(
    note_id: int, 
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this note")
        
    db.delete(note)
    db.commit()
    return {"ok": True}
