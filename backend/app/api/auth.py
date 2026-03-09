from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.security import verify_password, create_access_token, hash_password
from ..deps import get_db, require_admin
from ..models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LocalLoginIn(BaseModel):
    username: str
    password: str


class CreateUserIn(BaseModel):
    username: str
    password: str
    role: str = "sender"


@router.post("/local-login")
def local_login(body: LocalLoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.username == body.username).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Bad credentials")
    token = create_access_token(sub=str(u.id), role=u.role, extra={"auth_type": u.auth_type})
    return {"token": token}


@router.get("/users")
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id).all()
    return [{"id": u.id, "username": u.username, "role": u.role, "created_at": u.created_at} for u in users]


@router.post("/users")
def create_user(body: CreateUserIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    username = body.username.strip()
    if not username or not body.password:
        raise HTTPException(status_code=400, detail="username and password required")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="password must be at least 8 characters")
    if body.role not in ("admin", "sender"):
        raise HTTPException(status_code=400, detail="role must be 'admin' or 'sender'")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="user already exists")
    u = User(username=username, password_hash=hash_password(body.password), role=body.role, auth_type="local")
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"id": u.id, "username": u.username, "role": u.role}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(u)
    db.commit()
    return {"ok": True}


# dev bootstrap — creates the initial admin if it doesn't exist
@router.post("/bootstrap-local-admin")
def bootstrap_local_admin(db: Session = Depends(get_db)):
    from ..core.config import settings

    def _ensure(username: str, password: str) -> None:
        if not db.query(User).filter(User.username == username).first():
            db.add(User(
                username=username,
                password_hash=hash_password(password),
                role="admin",
                auth_type="local",
            ))

    _ensure(settings.LOCAL_ADMIN_USER, settings.LOCAL_ADMIN_PASS)
    _ensure(settings.SAMET_ADMIN_USER, settings.SAMET_ADMIN_PASS)
    db.commit()
    return {"ok": True}

