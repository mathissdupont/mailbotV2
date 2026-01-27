from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from .config import settings

pwd_ctx = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)

def verify_password(pw: str, pw_hash: str) -> bool:
    try:
        return pwd_ctx.verify(pw, pw_hash)
    except Exception:
        return False

def create_access_token(sub: str, role: str, extra: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": sub,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.JWT_EXPIRE_MIN)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)

def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
