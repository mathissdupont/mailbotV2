# backend/app/api/jobs.py
from __future__ import annotations

import csv
import io
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..core.audience_io import iter_emails_from_audience_file

from ..deps import get_db, get_current_user
from ..models import Campaign, User, AudienceFile, SMTPAccount, SendLog
from app.tasks import run_campaign_send

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class DryRunIn(BaseModel):
    name: str = "Kampanya"
    subject: str
    body_html: str

    audience_file_id: Optional[int] = None
    email_column: Optional[str] = None

    attachments: list[int] = []
    cc_csv: str = ""  # "a@x.com,b@y.com"
    smtp_account_id: Optional[int] = None  # dry_run=False ise zorunlu


class StartSendIn(DryRunIn):
    dry_run: bool = True


@router.get("")
def list_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(Campaign)
        .filter(Campaign.user_id == user.id)
        .order_by(Campaign.id.desc())
        .all()
    )
    return [{
        "id": r.id,
        "name": r.name,
        "status": r.status,
        "total": r.total,
        "success": r.success,
        "dry_run": r.dry_run,
        "created_at": r.created_at.isoformat(),
    } for r in rows]


@router.get("/{job_id}")
def job_detail(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(Campaign).filter(Campaign.id == job_id, Campaign.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": r.id,
        "name": r.name,
        "subject": r.subject,
        "body_html": r.body_html,
        "status": r.status,
        "total": r.total,
        "success": r.success,
        "dry_run": r.dry_run,
        "created_at": r.created_at.isoformat(),
        "email_column": r.email_column,
        "audience_file_id": r.audience_file_id,
        "smtp_account_id": r.smtp_account_id,
        "cc_csv": r.cc_csv or "",
    }


@router.get("/{job_id}/logs")
def job_logs(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Campaign).filter(Campaign.id == job_id, Campaign.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")

    logs = (
        db.query(SendLog)
        .filter(SendLog.campaign_id == c.id)
        .order_by(SendLog.id.asc())
        .limit(2000)
        .all()
    )
    return {
        "ok": True,
        "id": c.id,
        "status": c.status,
        "total": c.total,
        "success": c.success,
        "logs": [{
            "date": l.created_at.isoformat(),
            "email": l.email,
            "status": l.status,
            "info": l.error or "",
        } for l in logs],
    }


@router.get("/{job_id}/csv")
def job_csv(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Campaign).filter(Campaign.id == job_id, Campaign.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")

    logs = (
        db.query(SendLog)
        .filter(SendLog.campaign_id == c.id)
        .order_by(SendLog.id.asc())
        .all()
    )

    def _iter():
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["date", "email", "status", "error"])
        yield buf.getvalue()
        buf.seek(0); buf.truncate(0)

        for l in logs:
            w.writerow([l.created_at.isoformat(), l.email, l.status, l.error or ""])
            yield buf.getvalue()
            buf.seek(0); buf.truncate(0)

    headers = {"Content-Disposition": f'attachment; filename="job_{job_id}_logs.csv"'}
    return StreamingResponse(_iter(), media_type="text/csv; charset=utf-8", headers=headers)


@router.post("/dry-run")
def dry_run(payload: DryRunIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not payload.audience_file_id or not payload.email_column:
        raise HTTPException(status_code=400, detail="audience_file_id and email_column required")

    af = db.query(AudienceFile).filter(
        AudienceFile.id == payload.audience_file_id,
        AudienceFile.user_id == user.id
    ).first()
    if not af or not af.storage_path:
        raise HTTPException(status_code=400, detail="Audience file missing")

    # ilk 5 mail
    sample = []
    try:
        for i, e in enumerate(_iter_emails_from_audience_file(af.storage_path, payload.email_column)):
            sample.append(e)
            if i >= 4:
                break
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"ok": True, "sample_count": len(sample), "preview": sample}

@router.post("/start-send")
def start_send(payload: StartSendIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Audience ownership check
    if not payload.email_column:
        raise HTTPException(status_code=400, detail="email_column required")

    if payload.audience_file_id is None:
        raise HTTPException(status_code=400, detail="audience_file_id required")

    af = (
        db.query(AudienceFile)
        .filter(AudienceFile.id == payload.audience_file_id, AudienceFile.user_id == user.id)
        .first()
    )
    if not af:
        raise HTTPException(status_code=400, detail="Invalid audience_file_id or not owned by user")

    # SMTP ownership check (dry_run False ise zorunlu)
    smtp_id = payload.smtp_account_id
    if not payload.dry_run:
        if not smtp_id:
            raise HTTPException(status_code=400, detail="smtp_account_id required when dry_run=false")
        smtp = (
            db.query(SMTPAccount)
            .filter(SMTPAccount.id == smtp_id, SMTPAccount.user_id == user.id)
            .first()
        )
        if not smtp:
            raise HTTPException(status_code=400, detail="Invalid smtp_account_id or not owned by user")
    else:
        smtp_id = None

    r = Campaign(
        user_id=user.id,
        name=payload.name,
        subject=payload.subject,
        body_html=payload.body_html,
        dry_run=payload.dry_run,

        cc_csv=(payload.cc_csv or ""),
        email_column=(payload.email_column or ""),

        attachments_json=json.dumps(payload.attachments or []),
        status="QUEUED",

        audience_file_id=payload.audience_file_id,
        smtp_account_id=smtp_id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)

    run_campaign_send.delay(r.id)

    return {"ok": True, "id": r.id, "status": r.status}


@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(Campaign).filter(Campaign.id == job_id, Campaign.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")

    if r.status != "DONE":
        raise HTTPException(status_code=400, detail="Only completed (DONE) campaigns can be deleted")

    # delete related logs via cascade
    db.delete(r)
    db.commit()
    return {"ok": True}
