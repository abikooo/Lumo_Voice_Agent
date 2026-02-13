from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlmodel import Session
import shutil
import os
from ..database import get_session
from ..models import Note, User
from ..auth import get_current_user

router = APIRouter(prefix="/uploads", tags=["Uploads"])
UPLOAD_DIR = "uploads"

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/", response_model=Note)
async def upload_file(
    file: UploadFile = File(...), 
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Ensure filename is safe or prefix with uuid to avoid collisions in multiuser env
    # For now simplicity: prefix with user_id
    safe_filename = f"{current_user.id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Text extraction logic (same as before)
    content = ""
    try:
        if file.filename.lower().endswith(".pdf"):
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    content += text + "\n"
        elif file.filename.lower().endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        else:
             content = "File uploaded successfully. Preview not available for this format."
    except Exception as e:
        content = f"Error processing file: {str(e)}"

    note = Note(
        title=file.filename,
        content=content.strip() if content else "No text content extracted.",
        source="upload",
        file_path=file_path,
        color="#DBEAFE", # Light blue for uploads
        user_id=current_user.id
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
