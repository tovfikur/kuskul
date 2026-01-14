import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import forbidden, not_found, problem
from app.db.session import get_db
from app.models.document import Document
from app.models.guardian import Guardian
from app.models.membership import Membership
from app.models.role import Role
from app.models.student import Student
from app.models.student_guardian import StudentGuardian
from app.models.user import User
from app.schemas.documents import DocumentOut

router = APIRouter(dependencies=[Depends(require_permission("documents:read"))])


def _ensure_membership(db: Session, user_id: uuid.UUID, school_id: uuid.UUID) -> None:
    m = db.scalar(
        select(Membership).where(Membership.user_id == user_id, Membership.school_id == school_id, Membership.is_active.is_(True))
    )
    if not m:
        raise not_found("School not found")


def _out(d: Document) -> DocumentOut:
    return DocumentOut(
        id=d.id,
        school_id=d.school_id,
        uploaded_by_user_id=d.uploaded_by_user_id,
        entity_type=d.entity_type,
        entity_id=d.entity_id,
        filename=d.filename,
    )


def _role_name(db: Session, user_id: uuid.UUID, school_id: uuid.UUID) -> Optional[str]:
    m = db.scalar(select(Membership).where(Membership.user_id == user_id, Membership.school_id == school_id, Membership.is_active.is_(True)))
    if not m:
        return None
    role = db.get(Role, m.role_id)
    return role.name if role else None


def _parent_allowed_student_ids(db: Session, *, user_id: uuid.UUID, school_id: uuid.UUID) -> list[uuid.UUID]:
    g = db.scalar(select(Guardian).where(Guardian.user_id == user_id, Guardian.school_id == school_id))
    if not g:
        raise forbidden("Guardian account is not linked to this school")
    return (
        db.execute(
            select(Student.id)
            .join(StudentGuardian, StudentGuardian.student_id == Student.id)
            .where(StudentGuardian.guardian_id == g.id, Student.school_id == school_id)
        )
        .scalars()
        .all()
    )


@router.get("", response_model=list[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
) -> list[DocumentOut]:
    _ensure_membership(db, user.id, school_id)
    q = select(Document).where(Document.school_id == school_id).order_by(Document.created_at.desc())
    if entity_type:
        q = q.where(Document.entity_type == entity_type)
    if entity_id:
        q = q.where(Document.entity_id == entity_id)

    role_name = _role_name(db, user.id, school_id)
    if role_name == "parent":
        allowed_ids = {str(sid) for sid in _parent_allowed_student_ids(db, user_id=user.id, school_id=school_id)}
        if entity_id:
            if entity_type != "student" or entity_id not in allowed_ids:
                raise forbidden("Access denied")
        q = q.where(
            (Document.uploaded_by_user_id == user.id)
            | ((Document.entity_type == "student") & (Document.entity_id.in_(sorted(allowed_ids))))
        )
    rows = db.execute(q).scalars().all()
    return [_out(d) for d in rows]


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> DocumentOut:
    _ensure_membership(db, user.id, school_id)
    d = db.get(Document, document_id)
    if not d or d.school_id != school_id:
        raise not_found("Document not found")
    role_name = _role_name(db, user.id, school_id)
    if role_name == "parent":
        allowed_ids = {str(sid) for sid in _parent_allowed_student_ids(db, user_id=user.id, school_id=school_id)}
        if not (d.uploaded_by_user_id == user.id or (d.entity_type == "student" and (d.entity_id or "") in allowed_ids)):
            raise forbidden("Access denied")
    return _out(d)


@router.post("/upload", response_model=DocumentOut, dependencies=[Depends(require_permission("documents:write"))])
def upload_document(
    file: UploadFile = File(...),
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> DocumentOut:
    _ensure_membership(db, user.id, school_id)
    if not file.filename:
        raise problem(status_code=400, title="Bad Request", detail="Missing filename")
    content = file.file.read()
    now = datetime.now(timezone.utc)
    d = Document(
        school_id=school_id,
        uploaded_by_user_id=user.id,
        entity_type=entity_type,
        entity_id=entity_id,
        filename=file.filename,
        content_type=file.content_type,
        content=content,
        created_at=now,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _out(d)


@router.post("/bulk-upload", dependencies=[Depends(require_permission("documents:write"))])
def bulk_upload_documents(
    files: list[UploadFile] = File(...),
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    _ensure_membership(db, user.id, school_id)
    now = datetime.now(timezone.utc)
    created = 0
    for f in files:
        if not f.filename:
            continue
        content = f.file.read()
        db.add(
            Document(
                school_id=school_id,
                uploaded_by_user_id=user.id,
                entity_type=entity_type,
                entity_id=entity_id,
                filename=f.filename,
                content_type=f.content_type,
                content=content,
                created_at=now,
            )
        )
        created += 1
    db.commit()
    return {"created": created}


@router.delete("/{document_id}", dependencies=[Depends(require_permission("documents:write"))])
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    _ensure_membership(db, user.id, school_id)
    d = db.get(Document, document_id)
    if not d or d.school_id != school_id:
        raise not_found("Document not found")
    db.delete(d)
    db.commit()
    return {"status": "ok"}


@router.get("/{document_id}/download", include_in_schema=False)
def download_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    _ensure_membership(db, user.id, school_id)
    d = db.get(Document, document_id)
    if not d or d.school_id != school_id:
        raise not_found("Document not found")
    role_name = _role_name(db, user.id, school_id)
    if role_name == "parent":
        allowed_ids = {str(sid) for sid in _parent_allowed_student_ids(db, user_id=user.id, school_id=school_id)}
        if not (d.uploaded_by_user_id == user.id or (d.entity_type == "student" and (d.entity_id or "") in allowed_ids)):
            raise forbidden("Access denied")
    if d.content is None:
        raise not_found("Document content not found")
    content = d.content
    headers = {"Content-Disposition": f'attachment; filename="{d.filename}"'}
    return StreamingResponse(iter([content]), media_type=d.content_type or "application/octet-stream", headers=headers)

