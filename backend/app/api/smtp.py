from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import smtplib

from fastapi import Depends
from ..deps import get_current_user, get_db
from ..models import SMTPAccount, User
from ..core.crypto import encrypt_text, decrypt_text

router = APIRouter(prefix="/api/smtp", tags=["smtp"])

class SMTPIn(BaseModel):
    provider: str = "custom"
    host: str
    port: int = 587
    email: str
    password: str = Field(..., min_length=1)

class SMTPTestIn(BaseModel):
    host: str
    port: int = 587
    email: str
    password: str

def _connect(host: str, port: int):
    if int(port) == 465:
        return smtplib.SMTP_SSL(host, port, timeout=20)
    s = smtplib.SMTP(host, port, timeout=20)
    s.starttls()
    return s

@router.post("/test")
def test_smtp(body: SMTPTestIn):
    try:
        s = _connect(body.host, body.port)
        s.login(body.email, body.password)
        s.quit()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP error: {e}")

@router.get("")
def list_smtp(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(SMTPAccount)
        .filter(SMTPAccount.user_id == user.id)
        .order_by(SMTPAccount.id.desc())
        .all()
    )
    return [{
        "id": r.id,
        "provider": r.provider,
        "host": r.host,
        "port": r.port,
        "email": r.email,
        "created_at": r.created_at.isoformat(),
    } for r in rows]

@router.post("")
def add_smtp(body: SMTPIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # login test
    try:
        s = _connect(body.host, body.port)
        s.login(body.email, body.password)
        s.quit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP login failed: {e}")

    acc = SMTPAccount(
        user_id=user.id,
        provider=body.provider,
        host=body.host,
        port=int(body.port),
        email=body.email,
        password_enc=encrypt_text(body.password),
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return {"id": acc.id}

@router.delete("/{smtp_id}")
def delete_smtp(smtp_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(SMTPAccount).filter(
        SMTPAccount.id == smtp_id,
        SMTPAccount.user_id == user.id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(r)
    db.commit()
    return {"ok": True}
