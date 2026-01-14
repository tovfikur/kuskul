import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.notice import Notice
from app.schemas.notices import NoticeCreate, NoticeOut, NoticeUpdate

router = APIRouter(dependencies=[Depends(require_permission("notices:read"))])


def _out(n: Notice) -> NoticeOut:
    return NoticeOut(
        id=n.id,
        school_id=n.school_id,
        notice_type=n.notice_type,
        target_audience=n.target_audience,
        title=n.title,
        content=n.content,
        attachment_url=n.attachment_url,
        is_published=n.is_published,
    )


@router.get("", response_model=list[NoticeOut])
def list_notices(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    notice_type: Optional[str] = None,
    target_audience: Optional[str] = None,
    is_published: Optional[bool] = None,
) -> list[NoticeOut]:
    q = select(Notice).where(Notice.school_id == school_id).order_by(Notice.created_at.desc())
    if notice_type:
        q = q.where(Notice.notice_type == notice_type)
    if target_audience:
        q = q.where(Notice.target_audience == target_audience)
    if is_published is not None:
        q = q.where(Notice.is_published.is_(is_published))
    rows = db.execute(q).scalars().all()
    return [_out(n) for n in rows]


@router.get("/active", response_model=list[NoticeOut])
def get_active_notices(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[NoticeOut]:
    rows = db.execute(
        select(Notice).where(Notice.school_id == school_id, Notice.is_published.is_(True)).order_by(Notice.published_at.desc())
    ).scalars().all()
    return [_out(n) for n in rows]


@router.get("/{notice_id}", response_model=NoticeOut)
def get_notice(notice_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> NoticeOut:
    n = db.get(Notice, notice_id)
    if not n or n.school_id != school_id:
        raise not_found("Notice not found")
    return _out(n)


@router.post("", response_model=NoticeOut, dependencies=[Depends(require_permission("notices:write"))])
def create_notice(payload: NoticeCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> NoticeOut:
    now = datetime.now(timezone.utc)
    n = Notice(
        school_id=school_id,
        notice_type=payload.notice_type,
        target_audience=payload.target_audience,
        title=payload.title,
        content=payload.content,
        attachment_url=None,
        is_published=False,
        published_at=None,
        created_at=now,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return _out(n)


@router.put("/{notice_id}", response_model=NoticeOut, dependencies=[Depends(require_permission("notices:write"))])
def update_notice(
    notice_id: uuid.UUID, payload: NoticeUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> NoticeOut:
    n = db.get(Notice, notice_id)
    if not n or n.school_id != school_id:
        raise not_found("Notice not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(n, k, v)
    db.commit()
    return _out(n)


@router.delete("/{notice_id}", dependencies=[Depends(require_permission("notices:write"))])
def delete_notice(notice_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    n = db.get(Notice, notice_id)
    if not n or n.school_id != school_id:
        raise not_found("Notice not found")
    db.delete(n)
    db.commit()
    return {"status": "ok"}


@router.patch("/{notice_id}/publish", dependencies=[Depends(require_permission("notices:write"))])
def publish_notice(notice_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    n = db.get(Notice, notice_id)
    if not n or n.school_id != school_id:
        raise not_found("Notice not found")
    n.is_published = True
    n.published_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.patch("/{notice_id}/unpublish", dependencies=[Depends(require_permission("notices:write"))])
def unpublish_notice(notice_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    n = db.get(Notice, notice_id)
    if not n or n.school_id != school_id:
        raise not_found("Notice not found")
    n.is_published = False
    n.published_at = None
    db.commit()
    return {"status": "ok"}


@router.post("/{notice_id}/attachment", dependencies=[Depends(require_permission("notices:write"))])
def upload_notice_attachment(
    notice_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    n = db.get(Notice, notice_id)
    if not n or n.school_id != school_id:
        raise not_found("Notice not found")
    if not file.filename:
        raise problem(status_code=400, title="Bad Request", detail="Missing filename")
    n.attachment_url = file.filename
    db.commit()
    return {"status": "ok"}

