from __future__ import annotations

import os
import time
import smtplib
from email.message import EmailMessage
from typing import List

from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from .celery_app import celery_app
from .db import SessionLocal
from .models import Campaign, AudienceFile, SMTPAccount, SendLog, now_utc
from .core.crypto import decrypt_text
from .core.audience_io import iter_emails_from_audience_file

logger = get_task_logger(__name__)

@celery_app.task(name='app.tasks.ping', bind=True, max_retries=3)
def ping(self):
    return {'ok': True}

def _looks_like_email(s: str) -> bool:
    s = (s or '').strip()
    return ('@' in s) and ('.' in s) and (len(s) <= 254)

def _parse_cc_csv(cc_csv: str) -> List[str]:
    if not cc_csv:
        return []
    parts = [p.strip() for p in cc_csv.split(',')]
    return [p for p in parts if _looks_like_email(p)]

def _connect(host: str, port: int):
    port = int(port)
    if port == 465:
        return smtplib.SMTP_SSL(host, port, timeout=25)
    s = smtplib.SMTP(host, port, timeout=25)
    s.ehlo()
    s.starttls()
    s.ehlo()
    return s

def _send_one(*, host: str, port: int, username: str, password: str,
              from_email: str, to_email: str, subject: str, body_html: str,
              cc_list: List[str] | None = None):
    msg = EmailMessage()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    if cc_list:
        msg['Cc'] = ', '.join(cc_list)
    msg.set_content(' ')
    msg.add_alternative(body_html or '', subtype='html')

    s = _connect(host, port)
    try:
        s.login(username, password)
        s.send_message(msg)
    finally:
        try:
            s.quit()
        except Exception:
            pass

@celery_app.task(
    name='app.tasks.run_campaign_send',
    bind=True,
    autoretry_for=(smtplib.SMTPException, ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=5,
)
def run_campaign_send(self, campaign_id: int):
    db: Session = SessionLocal()
    try:
        c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not c:
            return {'ok': False, 'error': 'campaign not found'}

        if not c.email_column or not c.audience_file_id:
            c.status = 'FAILED'
            db.commit()
            return {'ok': False, 'error': 'missing email_column or audience_file_id'}

        af = db.query(AudienceFile).filter(
            AudienceFile.id == c.audience_file_id,
            AudienceFile.user_id == c.user_id
        ).first()
        if not af or not af.storage_path or not os.path.exists(af.storage_path):
            c.status = 'FAILED'
            db.commit()
            return {'ok': False, 'error': 'audience file missing'}

        smtp = None
        smtp_pass = ''
        if not c.dry_run:
            if not c.smtp_account_id:
                c.status = 'FAILED'
                db.commit()
                return {'ok': False, 'error': 'smtp_account_id not set'}
            smtp = db.query(SMTPAccount).filter(
                SMTPAccount.id == c.smtp_account_id,
                SMTPAccount.user_id == c.user_id
            ).first()
            if not smtp:
                c.status = 'FAILED'
                db.commit()
                return {'ok': False, 'error': 'smtp not found'}
            smtp_pass = decrypt_text(smtp.password_enc) or ''

        c.status = 'RUNNING'
        c.started_at = now_utc()
        c.finished_at = None
        c.success = 0
        c.total = 0
        db.commit()

        seen = set()
        emails: List[str] = []
        for e in iter_emails_from_audience_file(af.storage_path, c.email_column):
            e = (e or '').strip()
            if _looks_like_email(e) and e not in seen:
                seen.add(e)
                emails.append(e)

        c.total = len(emails)
        db.commit()

        cc_list = _parse_cc_csv(c.cc_csv)

        for to_email in emails:
            if c.dry_run:
                db.add(SendLog(user_id=c.user_id, campaign_id=c.id, email=to_email, status='SIMULATED', error=''))
                c.success += 1
                db.commit()
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
                )
                db.add(SendLog(user_id=c.user_id, campaign_id=c.id, email=to_email, status='SENT_OK', error=''))
                c.success += 1
                db.commit()
            except Exception as e:
                db.add(SendLog(
                    user_id=c.user_id,
                    campaign_id=c.id,
                    email=to_email,
                    status='ERROR',
                    error=(type(e).__name__ + ': ' + str(e))[:500],
                ))
                db.commit()
                logger.exception('Send error campaign=%s to=%s', c.id, to_email)

            time.sleep(0.2)

        c.status = 'DONE'
        c.finished_at = now_utc()
        db.commit()
        return {'ok': True, 'id': campaign_id, 'total': c.total, 'success': c.success}

    finally:
        db.close()