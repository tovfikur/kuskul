import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.exam import Exam
from app.models.exam_schedule import ExamSchedule
from app.schemas.exam_schedules import ExamScheduleOut
from app.schemas.exams import ExamCreate, ExamOut, ExamUpdate

router = APIRouter(dependencies=[Depends(require_permission("exams:read"))])


def _out(e: Exam) -> ExamOut:
    return ExamOut(
        id=e.id,
        academic_year_id=e.academic_year_id,
        name=e.name,
        exam_type=e.exam_type,
        start_date=e.start_date,
        end_date=e.end_date,
        is_published=e.is_published,
    )


def _schedule_out(s: ExamSchedule) -> ExamScheduleOut:
    return ExamScheduleOut(
        id=s.id,
        exam_id=s.exam_id,
        class_id=s.class_id,
        subject_id=s.subject_id,
        exam_date=s.exam_date,
        start_time=s.start_time,
        end_time=s.end_time,
        room=s.room,
        max_marks=s.max_marks,
    )


@router.get("", response_model=list[ExamOut])
def list_exams(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    academic_year_id: Optional[uuid.UUID] = None,
    exam_type: Optional[str] = None,
) -> list[ExamOut]:
    q = select(Exam).join(AcademicYear, AcademicYear.id == Exam.academic_year_id).where(AcademicYear.school_id == school_id)
    if academic_year_id:
        q = q.where(Exam.academic_year_id == academic_year_id)
    if exam_type:
        q = q.where(Exam.exam_type == exam_type)
    rows = db.execute(q.order_by(Exam.created_at.desc())).scalars().all()
    return [_out(e) for e in rows]


@router.get("/upcoming", response_model=list[ExamOut])
def get_upcoming_exams(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[ExamOut]:
    today = date.today()
    q = (
        select(Exam)
        .join(AcademicYear, AcademicYear.id == Exam.academic_year_id)
        .where(AcademicYear.school_id == school_id, Exam.start_date.is_not(None), Exam.start_date >= today)
        .order_by(Exam.start_date.asc())
    )
    rows = db.execute(q).scalars().all()
    return [_out(e) for e in rows]


@router.get("/{exam_id}", response_model=ExamOut)
def get_exam(exam_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> ExamOut:
    e = db.get(Exam, exam_id)
    if not e:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, e.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    return _out(e)


@router.post("", response_model=ExamOut, dependencies=[Depends(require_permission("exams:write"))])
def create_exam(payload: ExamCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> ExamOut:
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    if payload.start_date and payload.end_date and payload.end_date < payload.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    now = datetime.now(timezone.utc)
    e = Exam(
        academic_year_id=payload.academic_year_id,
        name=payload.name,
        exam_type=payload.exam_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_published=False,
        created_at=now,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _out(e)


@router.put("/{exam_id}", response_model=ExamOut, dependencies=[Depends(require_permission("exams:write"))])
def update_exam(
    exam_id: uuid.UUID, payload: ExamUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> ExamOut:
    e = db.get(Exam, exam_id)
    if not e:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, e.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(e, k, v)
    if e.start_date and e.end_date and e.end_date < e.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    db.commit()
    return _out(e)


@router.delete("/{exam_id}", dependencies=[Depends(require_permission("exams:write"))])
def delete_exam(exam_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    e = db.get(Exam, exam_id)
    if not e:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, e.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    db.delete(e)
    db.commit()
    return {"status": "ok"}


@router.get("/{exam_id}/schedule", response_model=list[ExamScheduleOut])
def get_exam_schedule(exam_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[ExamScheduleOut]:
    e = db.get(Exam, exam_id)
    if not e:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, e.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    rows = db.execute(select(ExamSchedule).where(ExamSchedule.exam_id == exam_id).order_by(ExamSchedule.exam_date.asc())).scalars().all()
    return [_schedule_out(s) for s in rows]


@router.post("/{exam_id}/publish", dependencies=[Depends(require_permission("exams:write"))])
def publish_exam(exam_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    e = db.get(Exam, exam_id)
    if not e:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, e.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    e.is_published = True
    db.commit()
    return {"status": "ok"}

