# backend/app/security.py
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from jose import jwt, JWTError
from passlib.context import CryptContext

# PROD: bcrypt yerine argon2 daha iyi (72 byte limiti yok, daha modern).
# requirements.txt içinde argon2-cffi yoksa ekle:
# argon2-cffi==23.1.0
pwd_ctx = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(pw: str) -> str:
    if not pw:
        raise ValueError("Password is empty")
    return pwd_ctx.hash(pw)


def verify_password(pw: str, pw_hash: str) -> bool:
    if not pw or not pw_hash:
        return False
    return pwd_ctx.verify(pw, pw_hash)


def create_access_token(
    *,
    subject: str,
    role: str,
    auth_type: str,
    secret: str,
    expires_minutes: int = 60 * 24,  # 1 gün
) -> str:
    now = _now_utc()
    payload: Dict[str, Any] = {
        "sub": subject,
        "role": role,
        "auth_type": auth_type,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str, *, secret: str) -> Dict[str, Any]:
    try:
        data = jwt.decode(token, secret, algorithms=["HS256"])
        return data
    except JWTError as e:
        raise ValueError("Invalid token") from e
