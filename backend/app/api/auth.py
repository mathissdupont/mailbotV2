from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import requests

from ..core.config import settings
from ..core.security import verify_password, create_access_token, hash_password
from fastapi import Depends
from ..deps import get_db
from ..models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LocalLoginIn(BaseModel):
    username: str
    password: str

class WorldPassLoginIn(BaseModel):
    email: str
    password: str

class RegisterIn(BaseModel):
    username: str
    password: str
    password_confirm: str | None = None
@router.post("/local-login")
def local_login(body: LocalLoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.username == body.username).first()
    if not u:
        raise HTTPException(status_code=401, detail="Bad credentials")

    # local user ise hash kontrol et
    if u.auth_type == "local":
        if not verify_password(body.password, u.password_hash):
            raise HTTPException(status_code=401, detail="Bad credentials")
    else:
        # worldpass user'a local login yaptırmayalım
        raise HTTPException(status_code=401, detail="Use worldpass-login")

    token = create_access_token(sub=str(u.id), role=u.role, extra={"auth_type": u.auth_type})
    return {"token": token}

@router.post("/worldpass-login")
def worldpass_login(body: WorldPassLoginIn, db: Session = Depends(get_db)):
    try:
        resp = requests.post(
            settings.WORLDPASS_LOGIN_URL,
            json={"email": body.email, "password": body.password},
            timeout=12
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"WorldPass bağlantı hatası: {e}")

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail=f"WorldPass login failed ({resp.status_code})")

    data = resp.json()
    user_info = data.get("user") or {}
    email = (user_info.get("email") or body.email).lower()

    role = "admin" if email in settings.admin_emails_list() else "sender"

    u = db.query(User).filter(User.username == email).first()
    if not u:
        u = User(username=email, password_hash="", role=role, auth_type="worldpass")
        db.add(u)
        db.commit()
        db.refresh(u)
    else:
        u.role = role
        u.auth_type = "worldpass"
        db.commit()

    token = create_access_token(sub=u.username, role=u.role, extra={"auth_type": u.auth_type})
    return {"token": token}


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    username = (body.username or "").strip().lower()
    if not username or not body.password:
        raise HTTPException(status_code=400, detail="username and password required")
    if body.password_confirm is not None and body.password != body.password_confirm:
        raise HTTPException(status_code=400, detail="password and password_confirm do not match")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="password must be at least 8 characters")

    # simple email format check
    from ..utils.email import is_valid_email
    if not is_valid_email(username):
        raise HTTPException(status_code=400, detail="invalid email format for username")

    exists = db.query(User).filter(User.username == username).first()
    if exists:
        raise HTTPException(status_code=400, detail="user already exists")

    u = User(username=username, password_hash=hash_password(body.password), role="sender", auth_type="local", email_verified=False)
    db.add(u)
    db.commit()
    db.refresh(u)

    # create email verification token
    import uuid
    vtoken = uuid.uuid4().hex
    from ..models import EmailVerification
    ev = EmailVerification(user_id=u.id, token=vtoken)
    db.add(ev)
    db.commit()

    token = create_access_token(sub=str(u.id), role=u.role, extra={"auth_type": u.auth_type})
    # Note: in dev we return the verification token so the user can use it to verify.
    return {"token": token, "verify_token": vtoken}


@router.get("/verify")
def verify_email(token: str, db: Session = Depends(get_db)):
    from ..models import EmailVerification, User
    ev = db.query(EmailVerification).filter(EmailVerification.token == token, EmailVerification.used == False).first()
    if not ev:
        raise HTTPException(status_code=404, detail="invalid or used token")
    u = db.query(User).filter(User.id == ev.user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="user not found")
    u.email_verified = True
    ev.used = True
    db.add(u); db.add(ev)
    db.commit()
    return {"ok": True}
# dev bootstrap
@router.post("/bootstrap-local-admin")
def bootstrap_local_admin(db: Session = Depends(get_db)):
    u = db.query(User).filter(User.username == settings.LOCAL_ADMIN_USER).first()
    if not u:
        u = User(
            username=settings.LOCAL_ADMIN_USER,
            password_hash=hash_password(settings.LOCAL_ADMIN_PASS),
            role="admin",
            auth_type="local"
        )
        db.add(u)
        db.commit()
    return {"ok": True}
