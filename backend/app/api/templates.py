# backend/app/api/templates.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jinja2 import Template as JinjaTemplate

from ..deps import get_db, get_current_user
from ..models import Template, User

router = APIRouter(prefix="/api/templates", tags=["templates"])


class TemplateCreateIn(BaseModel):
    name: str
    subject: str
    body_html: str


class TemplateUpdateIn(BaseModel):
    name: str | None = None
    subject: str | None = None
    body_html: str | None = None


class RenderPreviewIn(BaseModel):
    subject: str
    body_html: str
    variables: dict = {}


@router.get("")
def list_templates(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(Template)
        .filter(Template.user_id == user.id)
        .order_by(Template.id.desc())
        .all()
    )
    return [{
        "id": r.id,
        "name": r.name,
        "subject": r.subject,
        "body_html": r.body_html,
        "created_at": r.created_at.isoformat(),
    } for r in rows]


@router.post("")
def create_template(payload: TemplateCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = Template(
        user_id=user.id,
        name=payload.name,
        subject=payload.subject,
        body_html=payload.body_html,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"ok": True, "id": r.id}


@router.put("/{template_id}")
def update_template(template_id: int, payload: TemplateUpdateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(Template).filter(Template.id == template_id, Template.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")

    if payload.name is not None: r.name = payload.name
    if payload.subject is not None: r.subject = payload.subject
    if payload.body_html is not None: r.body_html = payload.body_html

    db.commit()
    return {"ok": True}


@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(Template).filter(Template.id == template_id, Template.user_id == user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(r)
    db.commit()
    return {"ok": True}


@router.post("/render-preview")
def render_preview(payload: RenderPreviewIn, user: User = Depends(get_current_user)):
    # Jinja render – örn: {{name}} {{company}}
    subj = JinjaTemplate(payload.subject).render(**payload.variables)
    html = JinjaTemplate(payload.body_html).render(**payload.variables)
    return {"subject": subj, "body_html": html}
