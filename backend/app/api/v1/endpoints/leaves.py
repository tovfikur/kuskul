import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, has_permission, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.leave import Leave
from app.models.membership import Membership
from app.models.user import User
from app.schemas.leaves import LeaveApply, LeaveOut, LeaveUpdate

router = APIRouter()


def _out(l: Leave) -> LeaveOut:
    return LeaveOut(
        id=l.id,
        school_id=l.school_id,
        requester_user_id=l.requester_user_id,
        user_type=l.user_type,
        staff_id=l.staff_id,
        student_id=l.student_id,
        start_date=l.start_date,
        end_date=l.end_date,
        reason=l.reason,
        status=l.status,
    )


def _ensure_membership(db: Session, user_id: uuid.UUID, school_id: uuid.UUID) -> None:
    m = db.scalar(
        select(Membership).where(Membership.user_id == user_id, Membership.school_id == school_id, Membership.is_active.is_(True))
    )
    if not m:
        raise not_found("School not found")


@router.get("", dependencies=[Depends(require_permission("leaves:read"))])
def list_leaves(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
    status: Optional[str] = None,
    user_type: Optional[str] = None,
) -> list[LeaveOut]:
    _ensure_membership(db, user.id, school_id)
    q = select(Leave).where(Leave.school_id == school_id)
    if status:
        q = q.where(Leave.status == status)
    if user_type:
        q = q.where(Leave.user_type == user_type)
    rows = db.execute(q.order_by(Leave.created_at.desc())).scalars().all()
    return [_out(l) for l in rows]


@router.get("/pending", dependencies=[Depends(require_permission("leaves:read"))])
def get_pending_leaves(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> list[LeaveOut]:
    _ensure_membership(db, user.id, school_id)
    rows = db.execute(
        select(Leave).where(Leave.school_id == school_id, Leave.status == "pending").order_by(Leave.created_at.desc())
    ).scalars().all()
    return [_out(l) for l in rows]


@router.get("/my-leaves")
def get_my_leaves(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> list[LeaveOut]:
    _ensure_membership(db, user.id, school_id)
    rows = db.execute(
        select(Leave).where(Leave.school_id == school_id, Leave.requester_user_id == user.id).order_by(Leave.created_at.desc())
    ).scalars().all()
    return [_out(l) for l in rows]


@router.get("/{leave_id}", dependencies=[Depends(require_permission("leaves:read"))])
def get_leave(
    leave_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> LeaveOut:
    _ensure_membership(db, user.id, school_id)
    l = db.get(Leave, leave_id)
    if not l or l.school_id != school_id:
        raise not_found("Leave not found")
    if l.requester_user_id != user.id and not has_permission(db, user_id=user.id, school_id=school_id, permission="leaves:read"):
        raise not_found("Leave not found")
    return _out(l)


@router.post("/apply")
def apply_leave(
    payload: LeaveApply,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> LeaveOut:
    _ensure_membership(db, user.id, school_id)
    if payload.end_date < payload.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    now = datetime.now(timezone.utc)
    l = Leave(
        school_id=school_id,
        requester_user_id=user.id,
        user_type=payload.user_type,
        staff_id=payload.staff_id,
        student_id=payload.student_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status="pending",
        reviewed_by_user_id=None,
        reviewed_at=None,
        created_at=now,
        updated_at=now,
    )
    db.add(l)
    db.commit()
    db.refresh(l)
    return _out(l)


@router.put("/{leave_id}")
def update_leave(
    leave_id: uuid.UUID,
    payload: LeaveUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> LeaveOut:
    _ensure_membership(db, user.id, school_id)
    l = db.get(Leave, leave_id)
    if not l or l.school_id != school_id or l.requester_user_id != user.id:
        raise not_found("Leave not found")
    if l.status != "pending":
        raise problem(status_code=409, title="Conflict", detail="Only pending leaves can be updated")
    if payload.start_date is not None:
        l.start_date = payload.start_date
    if payload.end_date is not None:
        l.end_date = payload.end_date
    if l.end_date < l.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    if payload.reason is not None:
        l.reason = payload.reason
    l.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _out(l)


@router.delete("/{leave_id}")
def cancel_leave(
    leave_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    _ensure_membership(db, user.id, school_id)
    l = db.get(Leave, leave_id)
    if not l or l.school_id != school_id or l.requester_user_id != user.id:
        raise not_found("Leave not found")
    if l.status != "pending":
        raise problem(status_code=409, title="Conflict", detail="Only pending leaves can be cancelled")
    db.delete(l)
    db.commit()
    return {"status": "ok"}


@router.patch("/{leave_id}/approve", dependencies=[Depends(require_permission("leaves:write"))])
def approve_leave(
    leave_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    _ensure_membership(db, user.id, school_id)
    l = db.get(Leave, leave_id)
    if not l or l.school_id != school_id:
        raise not_found("Leave not found")
    l.status = "approved"
    l.reviewed_by_user_id = user.id
    l.reviewed_at = datetime.now(timezone.utc)
    l.updated_at = l.reviewed_at
    db.commit()
    return {"status": "ok"}


@router.patch("/{leave_id}/reject", dependencies=[Depends(require_permission("leaves:write"))])
def reject_leave(
    leave_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    _ensure_membership(db, user.id, school_id)
    l = db.get(Leave, leave_id)
    if not l or l.school_id != school_id:
        raise not_found("Leave not found")
    l.status = "rejected"
    l.reviewed_by_user_id = user.id
    l.reviewed_at = datetime.now(timezone.utc)
    l.updated_at = l.reviewed_at
    db.commit()
    return {"status": "ok"}

