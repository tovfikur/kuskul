from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.notice import Notice
from app.models.school import School
from app.models.tenant import Tenant


router = APIRouter()


@router.get("/notices/{subdomain}")
def get_public_notices(subdomain: str, db: Session = Depends(get_db)) -> list[dict]:
    tenant = db.scalar(select(Tenant).where(Tenant.subdomain == subdomain, Tenant.status == "active"))
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")

    school = db.scalar(select(School).where(School.tenant_id == tenant.id, School.is_active.is_(True)).order_by(School.created_at.asc()).limit(1))
    if not school:
        return []

    rows = db.execute(
        select(Notice).where(Notice.school_id == school.id, Notice.is_published.is_(True)).order_by(Notice.published_at.desc()).limit(20)
    ).scalars().all()

    out: list[dict] = []
    for n in rows:
        out.append(
            {
                "id": str(n.id),
                "title": n.title,
                "content": n.content,
                "attachment_url": n.attachment_url,
                "published_at": (n.published_at.isoformat() if n.published_at else None),
            }
        )
    return out

