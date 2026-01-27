# backend/app/settings.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    DATABASE_URL: str
    JWT_SECRET: str = "dev"
    ENCRYPTION_KEY: str = "devkey"
    STORAGE_DIR: str = "/data"

    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"

    LOCAL_ADMIN_USER: str = "admin"
    LOCAL_ADMIN_PASS: str = "admin123!"  # PROD'da değiştir

    # 🔥 CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

settings = Settings()
