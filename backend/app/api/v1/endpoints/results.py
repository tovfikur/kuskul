import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.exam import Exam
from app.models.exam_schedule import ExamSchedule
from app.models.grade import Grade
from app.models.mark import Mark
from app.models.result import Result
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.schemas.results import ResultOut

router = APIRouter(dependencies=[Depends(require_permission("results:read"))])


def _out(r: Result) -> ResultOut:
    return ResultOut(
        id=r.id,
        exam_id=r.exam_id,
        student_id=r.student_id,
        total_marks=r.total_marks,
        obtained_marks=r.obtained_marks,
        percentage=r.percentage,
        grade_id=r.grade_id,
    )


def _pick_grade(db: Session, school_id: uuid.UUID, percentage: float) -> Optional[uuid.UUID]:
    grades = db.execute(select(Grade).where(Grade.school_id == school_id)).scalars().all()
    for g in grades:
        if g.min_percentage <= percentage <= g.max_percentage:
            return g.id
    return None


@router.get("", response_model=list[ResultOut])
def list_results(
    exam_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    class_id: Optional[uuid.UUID] = None,
) -> list[ResultOut]:
    exam = db.get(Exam, exam_id)
    if not exam:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, exam.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")

    schedules_q = select(ExamSchedule).where(ExamSchedule.exam_id == exam_id)
    if class_id:
        cls = db.get(SchoolClass, class_id)
        if not cls or cls.school_id != school_id:
            raise not_found("Class not found")
        schedules_q = schedules_q.where(ExamSchedule.class_id == class_id)
    schedules = db.execute(schedules_q).scalars().all()
    if not schedules:
        return []
    schedule_ids = [s.id for s in schedules]

    student_ids = (
        db.execute(select(Mark.student_id).where(Mark.exam_schedule_id.in_(schedule_ids)).distinct()).scalars().all()
    )
    out: list[ResultOut] = []
    now = datetime.now(timezone.utc)
    total_marks_per_exam = sum(s.max_marks for s in schedules)
    for student_id in student_ids:
        student = db.get(Student, student_id)
        if not student or student.school_id != school_id:
            continue
        obtained = (
            db.scalar(
                select(func.coalesce(func.sum(Mark.marks_obtained), 0)).where(
                    Mark.exam_schedule_id.in_(schedule_ids), Mark.student_id == student_id, Mark.is_absent.is_(False)
                )
            )
            or 0
        )
        percentage = (float(obtained) / float(total_marks_per_exam) * 100.0) if total_marks_per_exam else 0.0
        grade_id = _pick_grade(db, school_id, percentage)

        existing = db.scalar(select(Result).where(Result.exam_id == exam_id, Result.student_id == student_id))
        if existing:
            existing.total_marks = total_marks_per_exam
            existing.obtained_marks = int(obtained)
            existing.percentage = percentage
            existing.grade_id = grade_id
            out.append(_out(existing))
        else:
            r = Result(
                exam_id=exam_id,
                student_id=student_id,
                total_marks=total_marks_per_exam,
                obtained_marks=int(obtained),
                percentage=percentage,
                grade_id=grade_id,
                created_at=now,
            )
            db.add(r)
            db.flush()
            out.append(_out(r))
    db.commit()
    return out


@router.get("/{result_id}", response_model=ResultOut)
def get_result(result_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> ResultOut:
    r = db.get(Result, result_id)
    if not r:
        raise not_found("Result not found")
    exam = db.get(Exam, r.exam_id)
    year = db.get(AcademicYear, exam.academic_year_id) if exam else None
    if not year or year.school_id != school_id:
        raise not_found("Result not found")
    return _out(r)

