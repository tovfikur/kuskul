import uuid
from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.schemas.audit_logs import AuditLogOut

router = APIRouter(dependencies=[Depends(require_permission("audit_logs:read"))])


def _out(a: AuditLog) -> AuditLogOut:
    return AuditLogOut(
        id=a.id,
        school_id=a.school_id,
        user_id=a.user_id,
        action=a.action,
        entity_type=a.entity_type,
        entity_id=a.entity_id,
        details=a.details,
        created_at=a.created_at,
    )


def _dt(d: date, end: bool = False) -> datetime:
    return datetime.combine(d, time.max if end else time.min, tzinfo=timezone.utc)


@router.get("", response_model=dict)
def list_audit_logs(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    user_id: Optional[uuid.UUID] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    limit: int = 50,
) -> dict:
    offset = (page - 1) * limit if page > 1 else 0
    q = select(AuditLog).where(AuditLog.school_id == school_id).order_by(AuditLog.created_at.desc())
    if user_id:
        q = q.where(AuditLog.user_id == user_id)
    if action:
        q = q.where(AuditLog.action == action)
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    if start_date:
        q = q.where(AuditLog.created_at >= _dt(start_date))
    if end_date:
        q = q.where(AuditLog.created_at <= _dt(end_date, end=True))
    rows = db.execute(q.offset(offset).limit(limit)).scalars().all()
    return {"items": [_out(r).model_dump() for r in rows], "page": page, "limit": limit}


@router.get("/{log_id}", response_model=AuditLogOut)
def get_audit_log(log_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> AuditLogOut:
    a = db.get(AuditLog, log_id)
    if not a or a.school_id != school_id:
        raise not_found("Audit log not found")
    return _out(a)


@router.get("/user/{user_id}", response_model=list[AuditLogOut])
def get_user_audit_logs(
    user_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[AuditLogOut]:
    rows = db.execute(
        select(AuditLog).where(AuditLog.school_id == school_id, AuditLog.user_id == user_id).order_by(AuditLog.created_at.desc()).limit(200)
    ).scalars().all()
    return [_out(r) for r in rows]


@router.get("/entity/{entity_type}/{entity_id}", response_model=list[AuditLogOut])
def get_entity_audit_logs(
    entity_type: str, entity_id: str, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[AuditLogOut]:
    rows = db.execute(
        select(AuditLog)
        .where(AuditLog.school_id == school_id, AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.created_at.desc())
        .limit(200)
    ).scalars().all()
    return [_out(r) for r in rows]

