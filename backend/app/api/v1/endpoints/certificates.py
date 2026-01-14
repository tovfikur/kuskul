import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.certificate import Certificate, CertificateTemplate
from app.models.student import Student
from app.models.user import User
from app.schemas.certificates import CertificateOut, CertificateTemplateCreate, CertificateTemplateOut

router = APIRouter(dependencies=[Depends(require_permission("certificates:read"))])


def _tpl_out(t: CertificateTemplate) -> CertificateTemplateOut:
    return CertificateTemplateOut(id=t.id, school_id=t.school_id, template_type=t.template_type, name=t.name, content=t.content)


def _cert_out(c: Certificate) -> CertificateOut:
    return CertificateOut(
        id=c.id,
        school_id=c.school_id,
        student_id=c.student_id,
        template_type=c.template_type,
        filename=c.filename,
        notes=c.notes,
    )


@router.get("/templates", response_model=list[CertificateTemplateOut])
def list_certificate_templates(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[CertificateTemplateOut]:
    rows = db.execute(select(CertificateTemplate).where(CertificateTemplate.school_id == school_id).order_by(CertificateTemplate.created_at.desc())).scalars().all()
    return [_tpl_out(t) for t in rows]


@router.post("/templates", response_model=CertificateTemplateOut, dependencies=[Depends(require_permission("certificates:write"))])
def create_certificate_template(
    payload: CertificateTemplateCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> CertificateTemplateOut:
    now = datetime.now(timezone.utc)
    t = CertificateTemplate(school_id=school_id, template_type=payload.template_type, name=payload.name, content=payload.content, created_at=now)
    db.add(t)
    db.commit()
    db.refresh(t)
    return _tpl_out(t)


def _generate(
    template_type: str,
    student_id: uuid.UUID,
    db: Session,
    school_id: uuid.UUID,
    user: User,
) -> CertificateOut:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    now = datetime.now(timezone.utc)
    tpl = db.scalar(
        select(CertificateTemplate)
        .where(CertificateTemplate.school_id == school_id, CertificateTemplate.template_type == template_type)
        .order_by(CertificateTemplate.created_at.desc())
    )
    raw = tpl.content if tpl else f"{template_type.title()} certificate for {{first_name}} {{last_name}}"
    rendered = (
        raw.replace("{{first_name}}", s.first_name or "")
        .replace("{{last_name}}", s.last_name or "")
        .replace("{{admission_no}}", s.admission_no or "")
    )
    filename = f"{template_type}_{student_id}_{uuid.uuid4().hex}.txt"
    c = Certificate(
        school_id=school_id,
        student_id=student_id,
        template_type=template_type,
        generated_by_user_id=user.id,
        filename=filename,
        content_type="text/plain",
        content=rendered.encode("utf-8"),
        created_at=now,
        notes=None,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _cert_out(c)


@router.post("/generate/transfer", response_model=CertificateOut, dependencies=[Depends(require_permission("certificates:write"))])
def generate_transfer_certificate(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> CertificateOut:
    return _generate("transfer", student_id, db, school_id, user)


@router.post("/generate/bonafide", response_model=CertificateOut, dependencies=[Depends(require_permission("certificates:write"))])
def generate_bonafide_certificate(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> CertificateOut:
    return _generate("bonafide", student_id, db, school_id, user)


@router.post("/generate/character", response_model=CertificateOut, dependencies=[Depends(require_permission("certificates:write"))])
def generate_character_certificate(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> CertificateOut:
    return _generate("character", student_id, db, school_id, user)


@router.get("/{certificate_id}/download", include_in_schema=False)
def download_certificate(
    certificate_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    c = db.get(Certificate, certificate_id)
    if not c or c.school_id != school_id:
        raise not_found("Certificate not found")
    if c.content is None:
        raise not_found("Certificate content not found")
    content = c.content
    headers = {"Content-Disposition": f'attachment; filename="{c.filename}"'}
    return StreamingResponse(iter([content]), media_type=c.content_type or "application/octet-stream", headers=headers)

