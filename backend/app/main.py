import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .db import engine, Base, SessionLocal
from .models import User
from .core.security import hash_password

from .api.auth import router as auth_router
from .api.smtp import router as smtp_router
from .api.templates import router as templates_router
from .api.audience import router as audience_router
from .api.attachments import router as attachments_router
from .api.jobs import router as jobs_router

app = FastAPI(title="SponsorBot API")

origins = settings.cors_origins_list()
if not origins:
    # dev için fallback
    origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)

    # seed built-in admin accounts if they don't exist yet
    db = SessionLocal()
    try:
        def _ensure_admin(username: str, password: str) -> None:
            if not db.query(User).filter(User.username == username).first():
                db.add(User(
                    username=username,
                    password_hash=hash_password(password),
                    role="admin",
                    auth_type="local",
                ))

        _ensure_admin(settings.LOCAL_ADMIN_USER, settings.LOCAL_ADMIN_PASS)
        _ensure_admin(settings.SAMET_ADMIN_USER, settings.SAMET_ADMIN_PASS)
        db.commit()
    finally:
        db.close()

@app.get("/health")
def health():
    return {"ok": True}

app.include_router(auth_router)
app.include_router(smtp_router)
app.include_router(templates_router)
app.include_router(audience_router)


app.include_router(attachments_router)
app.include_router(jobs_router)
