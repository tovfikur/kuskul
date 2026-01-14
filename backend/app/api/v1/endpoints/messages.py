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
from app.models.message import Message
from app.models.user import User
from app.schemas.messages import ConversationOut, MessageOut, SendMessageRequest

router = APIRouter(dependencies=[Depends(require_permission("messages:read"))])


def _ensure_membership(db: Session, user_id: uuid.UUID, school_id: uuid.UUID) -> None:
    m = db.scalar(
        select(Membership).where(Membership.user_id == user_id, Membership.school_id == school_id, Membership.is_active.is_(True))
    )
    if not m:
        raise not_found("School not found")


def _out(m: Message) -> MessageOut:
    return MessageOut(
        id=m.id,
        school_id=m.school_id,
        sender_id=m.sender_id,
        recipient_id=m.recipient_id,
        content=m.content,
        is_read=m.is_read,
    )


@router.get("/unread-count")
def get_unread_message_count(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict[str, int]:
    _ensure_membership(db, user.id, school_id)
    count = db.scalar(
        select(func.count()).select_from(Message).where(
            Message.school_id == school_id,
            Message.recipient_id == user.id,
            Message.is_read.is_(False),
            Message.deleted_by_recipient.is_(False),
        )
    ) or 0
    return {"count": int(count)}


@router.get("/conversations", response_model=list[ConversationOut])
def get_conversations(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[ConversationOut]:
    _ensure_membership(db, user.id, school_id)
    rows = db.execute(
        select(Message)
        .where(
            Message.school_id == school_id,
            ((Message.sender_id == user.id) & (Message.deleted_by_sender.is_(False)))
            | ((Message.recipient_id == user.id) & (Message.deleted_by_recipient.is_(False))),
        )
        .order_by(Message.created_at.desc())
        .limit(500)
    ).scalars().all()
    convo: dict[uuid.UUID, ConversationOut] = {}
    for m in rows:
        other = m.recipient_id if m.sender_id == user.id else m.sender_id
        if other not in convo:
            convo[other] = ConversationOut(
                user_id=other,
                last_message=m.content[:200] if m.content else None,
                last_message_at=m.created_at.isoformat(),
                unread_count=0,
            )
        if m.recipient_id == user.id and not m.is_read and not m.deleted_by_recipient:
            convo[other].unread_count += 1
    return list(convo.values())


@router.get("/thread/{user_id}", response_model=list[MessageOut])
def get_message_thread(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> list[MessageOut]:
    _ensure_membership(db, user.id, school_id)
    m = db.scalar(
        select(Membership).where(Membership.user_id == user_id, Membership.school_id == school_id, Membership.is_active.is_(True))
    )
    if not m:
        raise not_found("User not found")
    rows = db.execute(
        select(Message)
        .where(
            Message.school_id == school_id,
            (
                ((Message.sender_id == user.id) & (Message.recipient_id == user_id) & (Message.deleted_by_sender.is_(False)))
                | ((Message.sender_id == user_id) & (Message.recipient_id == user.id) & (Message.deleted_by_recipient.is_(False)))
            ),
        )
        .order_by(Message.created_at.asc())
    ).scalars().all()
    return [_out(m) for m in rows]


@router.post("/send", response_model=MessageOut, dependencies=[Depends(require_permission("messages:write"))])
def send_message(
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> MessageOut:
    _ensure_membership(db, user.id, school_id)
    m = db.scalar(
        select(Membership).where(
            Membership.user_id == payload.recipient_id, Membership.school_id == school_id, Membership.is_active.is_(True)
        )
    )
    if not m:
        raise not_found("Recipient not found")
    now = datetime.now(timezone.utc)
    msg = Message(
        school_id=school_id,
        sender_id=user.id,
        recipient_id=payload.recipient_id,
        content=payload.content,
        is_read=False,
        read_at=None,
        deleted_by_sender=False,
        deleted_by_recipient=False,
        created_at=now,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _out(msg)


@router.patch("/{message_id}/read")
def mark_message_as_read(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    _ensure_membership(db, user.id, school_id)
    msg = db.get(Message, message_id)
    if not msg or msg.school_id != school_id or msg.recipient_id != user.id or msg.deleted_by_recipient:
        raise not_found("Message not found")
    if not msg.is_read:
        msg.is_read = True
        msg.read_at = datetime.now(timezone.utc)
        db.commit()
    return {"status": "ok"}


@router.delete("/{message_id}")
def delete_message(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    _ensure_membership(db, user.id, school_id)
    msg = db.get(Message, message_id)
    if not msg or msg.school_id != school_id:
        raise not_found("Message not found")
    if msg.sender_id == user.id:
        msg.deleted_by_sender = True
    elif msg.recipient_id == user.id:
        msg.deleted_by_recipient = True
    else:
        raise not_found("Message not found")
    db.commit()
    return {"status": "ok"}

