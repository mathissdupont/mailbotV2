# backend/app/models.py
from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import (
    String, Integer, DateTime, ForeignKey, Text, Boolean, Index, Float
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def now_utc():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, index=True)

    password_hash: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(50), default="sender")  # admin/sender
    auth_type: Mapped[str] = mapped_column(String(30), default="local")  # local/worldpass

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # optional backrefs (kolay debug)
    smtp_accounts = relationship("SMTPAccount", back_populates="user", cascade="all,delete")
    audience_files = relationship("AudienceFile", back_populates="user", cascade="all,delete")
    attachments = relationship("Attachment", back_populates="user", cascade="all,delete")
    templates = relationship("Template", back_populates="user", cascade="all,delete")
    campaigns = relationship("Campaign", back_populates="user", cascade="all,delete")


class AudienceFile(Base):
    __tablename__ = "audience_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    original_name: Mapped[str] = mapped_column(String(255), default="")
    storage_path: Mapped[str] = mapped_column(String(500), default="")
    # JSON string: {"columns":["Email","Name",...], "ext": ".xlsx"}
    columns_json: Mapped[str] = mapped_column(Text, default='{"columns": []}')

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="audience_files")
    campaigns = relationship("Campaign", back_populates="audience_file")


class SMTPAccount(Base):
    __tablename__ = "smtp_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    provider: Mapped[str] = mapped_column(String(120), default="custom")
    host: Mapped[str] = mapped_column(String(255))
    port: Mapped[int] = mapped_column(Integer, default=587)
    email: Mapped[str] = mapped_column(String(255))
    password_enc: Mapped[str] = mapped_column(Text)

    # opsiyonel: TLS davranışı
    use_starttls: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_insecure_tls: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="smtp_accounts")
    campaigns = relationship("Campaign", back_populates="smtp_account")


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    name: Mapped[str] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(300))
    body_html: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="templates")


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    original_name: Mapped[str] = mapped_column(String(255), default="")
    storage_path: Mapped[str] = mapped_column(String(500), default="")
    size: Mapped[int] = mapped_column(Integer, default=0)

    # opsiyonel ama çok işe yarar
    content_type: Mapped[str] = mapped_column(String(200), default="application/octet-stream")
    sha256: Mapped[str] = mapped_column(String(64), default="")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="attachments")


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    name: Mapped[str] = mapped_column(String(200), default="Kampanya")

    subject: Mapped[str] = mapped_column(String(300))
    body_html: Mapped[str] = mapped_column(Text)

    # Envelope / headers (prod’da lazım)
    from_name: Mapped[str] = mapped_column(String(200), default="")
    from_email: Mapped[str] = mapped_column(String(255), default="")
    reply_to: Mapped[str] = mapped_column(String(255), default="")

    cc_csv: Mapped[str] = mapped_column(Text, default="")
    bcc_csv: Mapped[str] = mapped_column(Text, default="")

    dry_run: Mapped[bool] = mapped_column(Boolean, default=True)

    # Audience seçimi:
    email_column: Mapped[str] = mapped_column(String(200), default="")
    audience_file_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("audience_files.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    audience_file = relationship("AudienceFile", back_populates="campaigns")

    # SMTP seçimi:
    smtp_account_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("smtp_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    smtp_account = relationship("SMTPAccount", back_populates="campaigns")

    # attachments: şimdilik json
    attachments_json: Mapped[str] = mapped_column(Text, default="[]")

    # (Sende vardı ama kullanılmıyordu) - kaldırmıyorum ama ileride temizleriz
    audience_rows_json: Mapped[str] = mapped_column(Text, default="[]")

    # gönderim kontrol
    status: Mapped[str] = mapped_column(String(50), default="QUEUED")  # QUEUED/RUNNING/DONE/FAILED
    total: Mapped[int] = mapped_column(Integer, default=0)
    success: Mapped[int] = mapped_column(Integer, default=0)

    # rate limit / retry ayarları (task için hayat kurtarır)
    rate_limit_per_sec: Mapped[float] = mapped_column(Float, default=3.0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)

    # schedule
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="campaigns")
    logs = relationship("SendLog", back_populates="campaign", cascade="all,delete")


class SendLog(Base):
    __tablename__ = "send_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # ✅ çok önemli: log kime ait? (izin/filtreleme için)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    campaign_id: Mapped[int] = mapped_column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)

    email: Mapped[str] = mapped_column(String(255), index=True)
    status: Mapped[str] = mapped_column(String(50))  # SENT_OK/ERROR/SIMULATED
    error: Mapped[str] = mapped_column(Text, default="")

    # opsiyonel: debug için
    provider: Mapped[str] = mapped_column(String(120), default="smtp")
    provider_message_id: Mapped[str] = mapped_column(String(255), default="")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    campaign = relationship("Campaign", back_populates="logs")
    user = relationship("User")


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user = relationship("User")


# =============== Indexler ===============
Index("ix_smtp_user_email", SMTPAccount.user_id, SMTPAccount.email)
Index("ix_campaign_user_status", Campaign.user_id, Campaign.status)
Index("ix_campaign_smtp", Campaign.smtp_account_id)
Index("ix_campaign_audience", Campaign.audience_file_id)
Index("ix_sendlog_campaign_status", SendLog.campaign_id, SendLog.status)
Index("ix_sendlog_user_created", SendLog.user_id, SendLog.created_at)
Index("ix_attachment_user_created", Attachment.user_id, Attachment.created_at)
