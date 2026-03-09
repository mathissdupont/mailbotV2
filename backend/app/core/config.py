from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite+pysqlite:///./dev.db"

    JWT_SECRET: str = "dev"
    JWT_ALG: str = "HS256"
    JWT_EXPIRE_MIN: int = 60 * 24

    LOCAL_ADMIN_USER: str = "admin"
    LOCAL_ADMIN_PASS: str = "admin123!"

    SAMET_ADMIN_USER: str = "sametutku16@gmail.com"
    SAMET_ADMIN_PASS: str = "admin123!"

    ENCRYPTION_KEY: str = "devkey"
    STORAGE_DIR: str = "/tmp/data"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

settings = Settings()

