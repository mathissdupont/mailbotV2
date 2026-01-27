

from .celery_app import celery_app
import os
import time
import smtplib
from email.message import EmailMessage
import json
import mimetypes
from typing import List
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import Campaign, AudienceFile, SMTPAccount, SendLog, now_utc, Attachment
from app.core.crypto import decrypt_text
from app.core.audience_io import iter_emails_from_audience_file

logger = get_task_logger(__name__)

@celery_app.task(bind=True, max_retries=3)
def ping(self):
    return {"ok": True}

def _looks_like_email(s: str) -> bool:
    return "@" in (s or "")

def _parse_cc_csv(cc_csv: str) -> List[str]:
    return [x.strip() for x in (cc_csv or "").split(",") if x.strip()]

def _send_one(host, port, username, password, from_email, to_email, subject, body_html, cc_list, attachments=None):
    msg = EmailMessage()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    if cc_list:
        msg["Cc"] = ",".join(cc_list)
    msg.set_content(body_html, subtype="html")
    # Attach files (attachments is list of dicts: {"filename":..., "content": bytes, "content_type":...})
    if attachments:
        for a in attachments:
            try:
                fname = a.get("filename") or "attachment"
                ctype = a.get("content_type") or mimetypes.guess_type(fname)[0] or "application/octet-stream"
                maintype, subtype = ctype.split("/", 1) if "/" in ctype else ("application", "octet-stream")
                msg.add_attachment(a.get("content") or b"", maintype=maintype, subtype=subtype, filename=fname)
            except Exception:
                # best-effort: skip problematic attachment rather than failing the whole send
                logger.exception("Failed to attach %s", a.get("filename"))
    with smtplib.SMTP(host, port, timeout=10) as s:
        s.starttls()
        s.login(username, password)
        s.send_message(msg)

@celery_app.task(
    name="app.tasks.run_campaign_send",
    bind=True,
    autoretry_for=(smtplib.SMTPException, ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=5,
)
def run_campaign_send(self, campaign_id: int):
    db: Session = SessionLocal()
    try:
        c: Campaign | None = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not c:
            return {"ok": False, "error": "campaign not found"}

        if c.status in ("RUNNING", "DONE"):
            return {"ok": True, "id": campaign_id, "status": c.status}

        if not c.email_column:
            c.status = "FAILED"
            db.commit()
            return {"ok": False, "error": "email_column not set"}

        if not c.audience_file_id:
            c.status = "FAILED"
            db.commit()
            return {"ok": False, "error": "audience_file_id not set"}

        af: AudienceFile | None = (
            db.query(AudienceFile)
            .filter(AudienceFile.id == c.audience_file_id, AudienceFile.user_id == c.user_id)
            .first()
        )
        if not af or not af.storage_path or not os.path.exists(af.storage_path):
            c.status = "FAILED"
            db.commit()
            return {"ok": False, "error": "audience file missing"}

        smtp: SMTPAccount | None = None
        smtp_pass = ""
        if not c.dry_run:
            if not c.smtp_account_id:
                c.status = "FAILED"
                db.commit()
                return {"ok": False, "error": "smtp_account_id not set"}

            smtp = (
                db.query(SMTPAccount)
                .filter(SMTPAccount.id == c.smtp_account_id, SMTPAccount.user_id == c.user_id)
                .first()
            )
            if not smtp:
                c.status = "FAILED"
                db.commit()
                return {"ok": False, "error": "smtp account not found/unauthorized"}

            smtp_pass = decrypt_text(smtp.password_enc) or ""

        c.status = "RUNNING"
        c.started_at = now_utc()
        c.finished_at = None
        c.success = 0
        c.total = 0
        db.commit()

        seen = set()
        emails: List[str] = []
        for e in iter_emails_from_audience_file(af.storage_path, c.email_column):
            e = (e or "").strip()
            if _looks_like_email(e) and e not in seen:
                seen.add(e)
                emails.append(e)

        c.total = len(emails)
        db.commit()

        if c.total == 0:
            c.status = "DONE"
            c.finished_at = now_utc()
            db.commit()
            return {"ok": True, "id": campaign_id, "total": 0, "success": 0}

        cc_list = _parse_cc_csv(c.cc_csv)
        # prepare attachments once per campaign (list of dicts with filename, content, content_type)
        attachments_data = []
        try:
            ids = json.loads(c.attachments_json or "[]")
            if isinstance(ids, list) and ids:
                rows = (
                    db.query(Attachment)
                    .filter(Attachment.id.in_(ids), Attachment.user_id == c.user_id)
                    .all()
                )
                id_map = {r.id: r for r in rows}
                for aid in ids:
                    r = id_map.get(aid)
                    if not r:
                        continue
                    try:
                        if not r.storage_path or not os.path.exists(r.storage_path):
                            logger.warning("Attachment missing on disk: %s", r.storage_path)
                            continue
                        with open(r.storage_path, "rb") as f:
                            content = f.read()
                        ctype = r.content_type or mimetypes.guess_type(r.original_name)[0] or "application/octet-stream"
                        attachments_data.append({"filename": r.original_name, "content": content, "content_type": ctype})
                    except Exception:
                        logger.exception("Failed reading attachment id=%s", aid)
        except Exception:
            logger.exception("Failed to parse attachments_json for campaign=%s", c.id)
        rate_limit_per_sec = 3.0
        sleep_s = 1.0 / rate_limit_per_sec

        for to_email in emails:
            if c.dry_run:
                db.add(SendLog(user_id=c.user_id, campaign_id=c.id, email=to_email, status="SIMULATED", error=""))
                c.success += 1
                db.commit()
                time.sleep(0.02)
                continue

            try:
                _send_one(
                    host=smtp.host,
                    port=smtp.port,
                    username=smtp.email,
                    password=smtp_pass,
                    from_email=smtp.email,
                    to_email=to_email,
                    subject=c.subject,
                    body_html=c.body_html,
                    cc_list=cc_list,
                    attachments=attachments_data,
                )
                db.add(SendLog(user_id=c.user_id, campaign_id=c.id, email=to_email, status="SENT_OK", error=""))
                c.success += 1
                db.commit()
            except Exception as e:
                db.add(SendLog(
                    user_id=c.user_id,
                    campaign_id=c.id,
                    email=to_email,
                    status="ERROR",
                    error=f"{type(e).__name__}: {str(e)[:500]}",
                ))
                db.commit()
                logger.exception("Send error campaign=%s to=%s", c.id, to_email)

            if sleep_s > 0:
                time.sleep(sleep_s)

        c.status = "DONE"
        c.finished_at = now_utc()
        db.commit()
        return {"ok": True, "id": campaign_id, "total": c.total, "success": c.success, "status": c.status}

    finally:
        db.close()
