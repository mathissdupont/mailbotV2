import base64
import hashlib
from cryptography.fernet import Fernet
from .config import settings

def _derive_fernet_key(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)

_fernet = Fernet(_derive_fernet_key(settings.ENCRYPTION_KEY))

def encrypt_text(plain: str) -> str:
    return _fernet.encrypt(plain.encode("utf-8")).decode("utf-8")

def decrypt_text(cipher: str) -> str:
    return _fernet.decrypt(cipher.encode("utf-8")).decode("utf-8")
