import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.exam import Exam
from app.models.exam_schedule import ExamSchedule
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.schemas.exam_schedules import ExamScheduleBulkCreate, ExamScheduleCreate, ExamScheduleOut, ExamScheduleUpdate

router = APIRouter(dependencies=[Depends(require_permission("exam_schedules:read"))])


def _out(s: ExamSchedule) -> ExamScheduleOut:
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


def _validate_scope(db: Session, school_id: uuid.UUID, payload: ExamScheduleCreate) -> None:
    exam = db.get(Exam, payload.exam_id)
    if not exam:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, exam.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    cls = db.get(SchoolClass, payload.class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Class not found")
    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.school_id != school_id:
        raise not_found("Subject not found")


@router.get("", response_model=list[ExamScheduleOut])
def list_exam_schedules(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    exam_id: Optional[uuid.UUID] = None,
    class_id: Optional[uuid.UUID] = None,
) -> list[ExamScheduleOut]:
    q = (
        select(ExamSchedule)
        .join(Exam, Exam.id == ExamSchedule.exam_id)
        .join(AcademicYear, AcademicYear.id == Exam.academic_year_id)
        .where(AcademicYear.school_id == school_id)
        .order_by(ExamSchedule.exam_date.asc())
    )
    if exam_id:
        q = q.where(ExamSchedule.exam_id == exam_id)
    if class_id:
        q = q.where(ExamSchedule.class_id == class_id)
    rows = db.execute(q).scalars().all()
    return [_out(s) for s in rows]


@router.get("/{schedule_id}", response_model=ExamScheduleOut)
def get_exam_schedule(schedule_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> ExamScheduleOut:
    s = db.get(ExamSchedule, schedule_id)
    if not s:
        raise not_found("Exam schedule not found")
    exam = db.get(Exam, s.exam_id)
    year = db.get(AcademicYear, exam.academic_year_id) if exam else None
    if not year or year.school_id != school_id:
        raise not_found("Exam schedule not found")
    return _out(s)


@router.post("", response_model=ExamScheduleOut, dependencies=[Depends(require_permission("exam_schedules:write"))])
def create_exam_schedule(
    payload: ExamScheduleCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> ExamScheduleOut:
    _validate_scope(db, school_id, payload)
    now = datetime.now(timezone.utc)
    s = ExamSchedule(
        exam_id=payload.exam_id,
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        exam_date=payload.exam_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room,
        max_marks=payload.max_marks,
        created_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.put("/{schedule_id}", response_model=ExamScheduleOut, dependencies=[Depends(require_permission("exam_schedules:write"))])
def update_exam_schedule(
    schedule_id: uuid.UUID,
    payload: ExamScheduleUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> ExamScheduleOut:
    s = db.get(ExamSchedule, schedule_id)
    if not s:
        raise not_found("Exam schedule not found")
    exam = db.get(Exam, s.exam_id)
    year = db.get(AcademicYear, exam.academic_year_id) if exam else None
    if not year or year.school_id != school_id:
        raise not_found("Exam schedule not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    return _out(s)


@router.delete("/{schedule_id}", dependencies=[Depends(require_permission("exam_schedules:write"))])
def delete_exam_schedule(schedule_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    s = db.get(ExamSchedule, schedule_id)
    if not s:
        raise not_found("Exam schedule not found")
    exam = db.get(Exam, s.exam_id)
    year = db.get(AcademicYear, exam.academic_year_id) if exam else None
    if not year or year.school_id != school_id:
        raise not_found("Exam schedule not found")
    db.delete(s)
    db.commit()
    return {"status": "ok"}


@router.post("/bulk-create", dependencies=[Depends(require_permission("exam_schedules:write"))])
def bulk_create_exam_schedule(
    payload: ExamScheduleBulkCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    created = 0
    for item in payload.items:
        _validate_scope(db, school_id, item)
        db.add(
            ExamSchedule(
                exam_id=item.exam_id,
                class_id=item.class_id,
                subject_id=item.subject_id,
                exam_date=item.exam_date,
                start_time=item.start_time,
                end_time=item.end_time,
                room=item.room,
                max_marks=item.max_marks,
                created_at=now,
            )
        )
        created += 1
    db.commit()
    return {"created": created}


@router.get("/class/{class_id}/exam/{exam_id}", response_model=list[ExamScheduleOut])
def get_class_exam_schedule(
    class_id: uuid.UUID, exam_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[ExamScheduleOut]:
    cls = db.get(SchoolClass, class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Class not found")
    exam = db.get(Exam, exam_id)
    if not exam:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, exam.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    rows = db.execute(select(ExamSchedule).where(ExamSchedule.exam_id == exam_id, ExamSchedule.class_id == class_id)).scalars().all()
    return [_out(s) for s in rows]

