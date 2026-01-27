# backend/app/api/attachments.py
from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user
from ..models import Attachment, User
from ..settings import settings

router = APIRouter(prefix="/api/attachments", tags=["attachments"])


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


@router.get("")
def list_attachments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(Attachment)
        .filter(Attachment.user_id == user.id)
        .order_by(Attachment.id.desc())
        .all()
    )
    return [{
        "id": r.id,
        "original_name": r.original_name,
        "size": r.size,
        "created_at": r.created_at.isoformat(),
    } for r in rows]


@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_dir(os.path.join(settings.STORAGE_DIR, "attachments"))

    ext = (os.path.splitext(file.filename or "")[1] or "").lower()
    storage_name = f"{uuid.uuid4().hex}{ext}"
    storage_path = os.path.join(settings.STORAGE_DIR, "attachments", storage_name)

    content = await file.read()
    with open(storage_path, "wb") as out:
        out.write(content)

    r = Attachment(
        user_id=user.id,
        original_name=file.filename or "file",
        storage_path=storage_path,
        size=len(content),
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"ok": True, "id": r.id, "original_name": r.original_name, "size": r.size}


@router.delete("/{attachment_id}")
def delete_attachment(attachment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(Attachment).filter(Attachment.id == attachment_id, Attachment.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")

    try:
        if r.storage_path and os.path.exists(r.storage_path):
            os.remove(r.storage_path)
    except Exception:
        pass

    db.delete(r)
    db.commit()
    return {"ok": True}
