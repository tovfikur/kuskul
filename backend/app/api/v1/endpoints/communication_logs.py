import uuid
from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.communication_log import CommunicationLog
from app.models.membership import Membership
from app.models.user import User
from app.schemas.communication_logs import CommunicationLogOut, SendEmailRequest, SendSmsRequest

router = APIRouter(dependencies=[Depends(require_permission("communication_logs:read"))])


def _ensure_membership(db: Session, user_id: uuid.UUID, school_id: uuid.UUID) -> None:
    m = db.scalar(
        select(Membership).where(Membership.user_id == user_id, Membership.school_id == school_id, Membership.is_active.is_(True))
    )
    if not m:
        raise not_found("School not found")


def _out(l: CommunicationLog) -> CommunicationLogOut:
    return CommunicationLogOut(
        id=l.id,
        school_id=l.school_id,
        sent_by_user_id=l.sent_by_user_id,
        communication_type=l.communication_type,
        status=l.status,
        recipient=l.recipient,
        subject=l.subject,
        body=l.body,
    )


@router.get("", response_model=list[CommunicationLogOut])
def list_communication_logs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
    communication_type: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> list[CommunicationLogOut]:
    _ensure_membership(db, user.id, school_id)
    q = select(CommunicationLog).where(CommunicationLog.school_id == school_id).order_by(CommunicationLog.created_at.desc())
    if communication_type:
        q = q.where(CommunicationLog.communication_type == communication_type)
    if status:
        q = q.where(CommunicationLog.status == status)
    if start_date:
        q = q.where(CommunicationLog.created_at >= datetime.combine(start_date, time.min, tzinfo=timezone.utc))
    if end_date:
        q = q.where(CommunicationLog.created_at <= datetime.combine(end_date, time.max, tzinfo=timezone.utc))
    rows = db.execute(q).scalars().all()
    return [_out(l) for l in rows]


@router.post("/send-sms", dependencies=[Depends(require_permission("communication_logs:write"))])
def send_sms(
    payload: SendSmsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    _ensure_membership(db, user.id, school_id)
    now = datetime.now(timezone.utc)
    created = 0
    for r in payload.recipients:
        db.add(
            CommunicationLog(
                school_id=school_id,
                sent_by_user_id=user.id,
                communication_type="sms",
                status="sent",
                recipient=r,
                subject=None,
                body=payload.message,
                created_at=now,
            )
        )
        created += 1
    db.commit()
    return {"created": created}


@router.post("/send-email", dependencies=[Depends(require_permission("communication_logs:write"))])
def send_email(
    payload: SendEmailRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    _ensure_membership(db, user.id, school_id)
    now = datetime.now(timezone.utc)
    created = 0
    for r in payload.recipients:
        db.add(
            CommunicationLog(
                school_id=school_id,
                sent_by_user_id=user.id,
                communication_type="email",
                status="sent",
                recipient=r,
                subject=payload.subject,
                body=payload.body,
                created_at=now,
            )
        )
        created += 1
    db.commit()
    return {"created": created}


@router.post("/bulk-sms", dependencies=[Depends(require_permission("communication_logs:write"))])
def send_bulk_sms(
    payload: SendSmsRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict[str, int]:
    return send_sms(payload=payload, db=db, user=user, school_id=school_id)


@router.post("/bulk-email", dependencies=[Depends(require_permission("communication_logs:write"))])
def send_bulk_email(
    payload: SendEmailRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    return send_email(payload=payload, db=db, user=user, school_id=school_id)


@router.get("/{log_id}", response_model=CommunicationLogOut)
def get_communication_log(
    log_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> CommunicationLogOut:
    _ensure_membership(db, user.id, school_id)
    l = db.get(CommunicationLog, log_id)
    if not l or l.school_id != school_id:
        raise not_found("Communication log not found")
    return _out(l)

