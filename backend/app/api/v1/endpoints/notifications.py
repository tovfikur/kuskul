import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.membership import Membership
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notifications import NotificationOut, NotificationSend

router = APIRouter()


def _out(n: Notification) -> NotificationOut:
    return NotificationOut(
        id=n.id,
        school_id=n.school_id,
        user_id=n.user_id,
        notification_type=n.notification_type,
        title=n.title,
        message=n.message,
        is_read=n.is_read,
    )


def _ensure_membership(db: Session, user_id: uuid.UUID, school_id: uuid.UUID) -> None:
    m = db.scalar(
        select(Membership).where(Membership.user_id == user_id, Membership.school_id == school_id, Membership.is_active.is_(True))
    )
    if not m:
        raise not_found("School not found")


@router.get("/my", response_model=dict)
def get_my_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
    is_read: Optional[bool] = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    _ensure_membership(db, user.id, school_id)
    offset = (page - 1) * limit if page > 1 else 0
    base = select(Notification).where(Notification.school_id == school_id, Notification.user_id == user.id)
    if is_read is not None:
        base = base.where(Notification.is_read.is_(is_read))
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(Notification.created_at.desc()).offset(offset).limit(limit)).scalars().all()
    return {"items": [_out(n).model_dump() for n in rows], "total": int(total), "page": page, "limit": limit}


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict[str, int]:
    _ensure_membership(db, user.id, school_id)
    count = db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.school_id == school_id, Notification.user_id == user.id, Notification.is_read.is_(False)
        )
    ) or 0
    return {"count": int(count)}


@router.patch("/mark-all-read")
def mark_all_as_read(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    _ensure_membership(db, user.id, school_id)
    now = datetime.now(timezone.utc)
    db.execute(
        update(Notification)
        .where(Notification.school_id == school_id, Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True, read_at=now)
    )
    db.commit()
    return {"status": "ok"}


@router.post("/send", dependencies=[Depends(require_permission("notifications:write"))])
def send_notification(
    payload: NotificationSend,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    created = 0
    for user_id in payload.user_ids:
        m = db.scalar(
            select(Membership).where(Membership.user_id == user_id, Membership.school_id == school_id, Membership.is_active.is_(True))
        )
        if not m:
            continue
        db.add(
            Notification(
                school_id=school_id,
                user_id=user_id,
                notification_type=payload.notification_type,
                title=payload.title,
                message=payload.message,
                is_read=False,
                read_at=None,
                created_at=now,
            )
        )
        created += 1
    db.commit()
    return {"created": created}


@router.get("/{notification_id}", response_model=NotificationOut)
def get_notification(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> NotificationOut:
    _ensure_membership(db, user.id, school_id)
    n = db.get(Notification, notification_id)
    if not n or n.school_id != school_id or n.user_id != user.id:
        raise not_found("Notification not found")
    return _out(n)


@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    _ensure_membership(db, user.id, school_id)
    n = db.get(Notification, notification_id)
    if not n or n.school_id != school_id or n.user_id != user.id:
        raise not_found("Notification not found")
    if not n.is_read:
        n.is_read = True
        n.read_at = datetime.now(timezone.utc)
        db.commit()
    return {"status": "ok"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    _ensure_membership(db, user.id, school_id)
    n = db.get(Notification, notification_id)
    if not n or n.school_id != school_id or n.user_id != user.id:
        raise not_found("Notification not found")
    db.delete(n)
    db.commit()
    return {"status": "ok"}

