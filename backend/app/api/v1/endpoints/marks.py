import uuid
from datetime import datetime, timezone
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
from app.models.mark import Mark
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.schemas.marks import EnterMarksRequest, MarkOut

router = APIRouter(dependencies=[Depends(require_permission("marks:read"))])


def _out(m: Mark) -> MarkOut:
    return MarkOut(
        id=m.id,
        exam_schedule_id=m.exam_schedule_id,
        student_id=m.student_id,
        marks_obtained=m.marks_obtained,
        is_absent=m.is_absent,
        remarks=m.remarks,
    )


def _validate_exam_schedule_scope(db: Session, school_id: uuid.UUID, schedule_id: uuid.UUID) -> ExamSchedule:
    sched = db.get(ExamSchedule, schedule_id)
    if not sched:
        raise not_found("Exam schedule not found")
    exam = db.get(Exam, sched.exam_id)
    year = db.get(AcademicYear, exam.academic_year_id) if exam else None
    if not year or year.school_id != school_id:
        raise not_found("Exam schedule not found")
    cls = db.get(SchoolClass, sched.class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Exam schedule not found")
    return sched


@router.get("", response_model=list[MarkOut])
def list_marks(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    exam_schedule_id: Optional[uuid.UUID] = None,
    student_id: Optional[uuid.UUID] = None,
    class_id: Optional[uuid.UUID] = None,
) -> list[MarkOut]:
    q = (
        select(Mark)
        .join(ExamSchedule, ExamSchedule.id == Mark.exam_schedule_id)
        .join(Exam, Exam.id == ExamSchedule.exam_id)
        .join(AcademicYear, AcademicYear.id == Exam.academic_year_id)
        .where(AcademicYear.school_id == school_id)
        .order_by(Mark.created_at.desc())
    )
    if exam_schedule_id:
        q = q.where(Mark.exam_schedule_id == exam_schedule_id)
    if student_id:
        q = q.where(Mark.student_id == student_id)
    if class_id:
        q = q.where(ExamSchedule.class_id == class_id)
    rows = db.execute(q).scalars().all()
    return [_out(m) for m in rows]


@router.get("/{mark_id}", response_model=MarkOut)
def get_mark(mark_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> MarkOut:
    m = db.get(Mark, mark_id)
    if not m:
        raise not_found("Mark not found")
    _validate_exam_schedule_scope(db, school_id, m.exam_schedule_id)
    return _out(m)


@router.post("/enter", response_model=list[MarkOut], dependencies=[Depends(require_permission("marks:write"))])
def enter_marks(
    payload: EnterMarksRequest, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[MarkOut]:
    sched = _validate_exam_schedule_scope(db, school_id, payload.exam_schedule_id)
    now = datetime.now(timezone.utc)
    out: list[MarkOut] = []
    for item in payload.items:
        student = db.get(Student, item.student_id)
        if not student or student.school_id != school_id:
            raise not_found("Student not found")
        if item.is_absent:
            marks_obtained = None
        else:
            if item.marks_obtained is None:
                raise problem(status_code=400, title="Bad Request", detail="marks_obtained is required when is_absent=false")
            if item.marks_obtained > sched.max_marks:
                raise problem(status_code=400, title="Bad Request", detail="marks_obtained exceeds max_marks")
            marks_obtained = item.marks_obtained

        existing = db.scalar(
            select(Mark).where(Mark.exam_schedule_id == payload.exam_schedule_id, Mark.student_id == item.student_id)
        )
        if existing:
            existing.marks_obtained = marks_obtained
            existing.is_absent = item.is_absent
            existing.remarks = item.remarks
            out.append(_out(existing))
        else:
            m = Mark(
                exam_schedule_id=payload.exam_schedule_id,
                student_id=item.student_id,
                marks_obtained=marks_obtained,
                is_absent=item.is_absent,
                remarks=item.remarks,
                created_at=now,
            )
            db.add(m)
            db.flush()
            out.append(_out(m))
    db.commit()
    return out


@router.post("/bulk-enter", response_model=list[MarkOut], dependencies=[Depends(require_permission("marks:write"))])
def bulk_enter_marks(
    payload: EnterMarksRequest, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[MarkOut]:
    return enter_marks(payload=payload, db=db, school_id=school_id)

