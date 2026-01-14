import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.enrollment import Enrollment
from app.models.exam import Exam
from app.models.exam_schedule import ExamSchedule
from app.models.fee_due import FeeDue
from app.models.fee_payment import FeePayment
from app.models.mark import Mark
from app.models.result import Result
from app.models.school_class import SchoolClass
from app.models.staff import Staff
from app.models.student import Student
from app.models.teacher_assignment import StaffAttendance, StudentAttendance

router = APIRouter(dependencies=[Depends(require_permission("reports:read"))])


def _dt(d: date, end: bool = False) -> datetime:
    return datetime.combine(d, time.max if end else time.min, tzinfo=timezone.utc)


@router.get("/attendance/daily")
def daily_attendance_report(
    report_date: date,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict:
    d = _dt(report_date)
    student_rows = db.execute(
        select(StudentAttendance.status, func.count())
        .join(Student, Student.id == StudentAttendance.student_id)
        .where(Student.school_id == school_id, StudentAttendance.attendance_date == d)
        .group_by(StudentAttendance.status)
    ).all()
    staff_rows = db.execute(
        select(StaffAttendance.status, func.count())
        .join(Staff, Staff.id == StaffAttendance.staff_id)
        .where(Staff.school_id == school_id, StaffAttendance.attendance_date == d)
        .group_by(StaffAttendance.status)
    ).all()
    return {
        "date": report_date.isoformat(),
        "students": {k: int(v) for k, v in student_rows},
        "staff": {k: int(v) for k, v in staff_rows},
    }


@router.get("/attendance/monthly")
def monthly_attendance_report(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict:
    start = date(year, month, 1)
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    student_rows = db.execute(
        select(StudentAttendance.status, func.count())
        .join(Student, Student.id == StudentAttendance.student_id)
        .where(Student.school_id == school_id, StudentAttendance.attendance_date >= _dt(start), StudentAttendance.attendance_date <= _dt(end))
        .group_by(StudentAttendance.status)
    ).all()
    staff_rows = db.execute(
        select(StaffAttendance.status, func.count())
        .join(Staff, Staff.id == StaffAttendance.staff_id)
        .where(Staff.school_id == school_id, StaffAttendance.attendance_date >= _dt(start), StaffAttendance.attendance_date <= _dt(end))
        .group_by(StaffAttendance.status)
    ).all()
    return {
        "month": month,
        "year": year,
        "students": {k: int(v) for k, v in student_rows},
        "staff": {k: int(v) for k, v in staff_rows},
    }


@router.get("/attendance/class")
def class_attendance_report(
    class_id: uuid.UUID,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict:
    cls = db.get(SchoolClass, class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Class not found")
    rows = db.execute(
        select(StudentAttendance.status, func.count())
        .join(Student, Student.id == StudentAttendance.student_id)
        .where(
            Student.school_id == school_id,
            StudentAttendance.class_id == class_id,
            StudentAttendance.attendance_date >= _dt(start_date),
            StudentAttendance.attendance_date <= _dt(end_date),
        )
        .group_by(StudentAttendance.status)
    ).all()
    return {"class_id": str(class_id), "start_date": start_date.isoformat(), "end_date": end_date.isoformat(), "counts": {k: int(v) for k, v in rows}}


@router.get("/attendance/defaulters")
def attendance_defaulters_report(
    threshold: int = 75,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    window_end = date.today()
    window_start = window_end - timedelta(days=30)
    total_by_student = db.execute(
        select(StudentAttendance.student_id, func.count())
        .join(Student, Student.id == StudentAttendance.student_id)
        .where(Student.school_id == school_id, StudentAttendance.attendance_date >= _dt(window_start), StudentAttendance.attendance_date <= _dt(window_end))
        .group_by(StudentAttendance.student_id)
    ).all()
    present_by_student = db.execute(
        select(StudentAttendance.student_id, func.count())
        .join(Student, Student.id == StudentAttendance.student_id)
        .where(
            Student.school_id == school_id,
            StudentAttendance.status == "present",
            StudentAttendance.attendance_date >= _dt(window_start),
            StudentAttendance.attendance_date <= _dt(window_end),
        )
        .group_by(StudentAttendance.student_id)
    ).all()
    present_map = {sid: int(cnt) for sid, cnt in present_by_student}
    out: list[dict] = []
    for sid, total in total_by_student:
        total_i = int(total)
        if total_i <= 0:
            continue
        present_i = present_map.get(sid, 0)
        pct = int(round(present_i / total_i * 100.0))
        if pct < threshold:
            out.append({"student_id": str(sid), "attendance_pct": pct, "present": present_i, "total": total_i})
    out.sort(key=lambda x: x["attendance_pct"])
    return out


@router.get("/academic/result-analysis")
def result_analysis_report(
    exam_id: uuid.UUID,
    class_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict:
    exam = db.get(Exam, exam_id)
    if not exam:
        raise not_found("Exam not found")
    year = db.get(AcademicYear, exam.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    q = select(Result).where(Result.exam_id == exam_id)
    if class_id:
        cls = db.get(SchoolClass, class_id)
        if not cls or cls.school_id != school_id:
            raise not_found("Class not found")
        schedule_ids = db.execute(select(ExamSchedule.id).where(ExamSchedule.exam_id == exam_id, ExamSchedule.class_id == class_id)).scalars().all()
        student_ids = db.execute(select(Mark.student_id).where(Mark.exam_schedule_id.in_(schedule_ids)).distinct()).scalars().all() if schedule_ids else []
        if student_ids:
            q = q.where(Result.student_id.in_(student_ids))
        else:
            return {"exam_id": str(exam_id), "class_id": str(class_id), "count": 0}
    count = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    avg_pct = db.scalar(select(func.avg(Result.percentage)).where(Result.exam_id == exam_id)) or 0
    max_pct = db.scalar(select(func.max(Result.percentage)).where(Result.exam_id == exam_id)) or 0
    min_pct = db.scalar(select(func.min(Result.percentage)).where(Result.exam_id == exam_id)) or 0
    return {"exam_id": str(exam_id), "class_id": (str(class_id) if class_id else None), "count": int(count), "avg_pct": float(avg_pct), "max_pct": float(max_pct), "min_pct": float(min_pct)}


@router.get("/academic/subject-performance")
def subject_performance_report(
    subject_id: uuid.UUID,
    exam_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict:
    exam = db.get(Exam, exam_id)
    year = db.get(AcademicYear, exam.academic_year_id) if exam else None
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    schedule_ids = db.execute(select(ExamSchedule.id).where(ExamSchedule.exam_id == exam_id, ExamSchedule.subject_id == subject_id)).scalars().all()
    if not schedule_ids:
        return {"exam_id": str(exam_id), "subject_id": str(subject_id), "count": 0}
    avg_marks = db.scalar(select(func.avg(Mark.marks_obtained)).where(Mark.exam_schedule_id.in_(schedule_ids), Mark.is_absent.is_(False))) or 0
    count = db.scalar(select(func.count()).select_from(Mark).where(Mark.exam_schedule_id.in_(schedule_ids))) or 0
    return {"exam_id": str(exam_id), "subject_id": str(subject_id), "count": int(count), "avg_marks": float(avg_marks)}


@router.get("/academic/toppers")
def toppers_report(
    exam_id: uuid.UUID,
    top_n: int = 10,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    exam = db.get(Exam, exam_id)
    year = db.get(AcademicYear, exam.academic_year_id) if exam else None
    if not year or year.school_id != school_id:
        raise not_found("Exam not found")
    rows = db.execute(select(Result).where(Result.exam_id == exam_id).order_by(Result.obtained_marks.desc()).limit(top_n)).scalars().all()
    return [{"student_id": str(r.student_id), "obtained_marks": r.obtained_marks, "percentage": r.percentage} for r in rows]


@router.get("/academic/progress")
def progress_report(
    student_id: uuid.UUID,
    academic_year_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    student = db.get(Student, student_id)
    if not student or student.school_id != school_id:
        raise not_found("Student not found")
    year = db.get(AcademicYear, academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    exam_ids = db.execute(select(Exam.id).where(Exam.academic_year_id == academic_year_id)).scalars().all()
    if not exam_ids:
        return []
    rows = db.execute(select(Result).where(Result.student_id == student_id, Result.exam_id.in_(exam_ids)).order_by(Result.created_at.asc())).scalars().all()
    return [{"exam_id": str(r.exam_id), "percentage": r.percentage, "obtained_marks": r.obtained_marks, "total_marks": r.total_marks} for r in rows]


@router.get("/financial/collection-summary")
def fee_collection_summary(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    total = db.scalar(
        select(func.coalesce(func.sum(FeePayment.amount), 0))
        .join(Student, Student.id == FeePayment.student_id)
        .where(Student.school_id == school_id, FeePayment.payment_date >= start_date, FeePayment.payment_date <= end_date, FeePayment.is_refund.is_(False))
    ) or 0
    refunds = db.scalar(
        select(func.coalesce(func.sum(FeePayment.amount), 0))
        .join(Student, Student.id == FeePayment.student_id)
        .where(Student.school_id == school_id, FeePayment.payment_date >= start_date, FeePayment.payment_date <= end_date, FeePayment.is_refund.is_(True))
    ) or 0
    return {"collected": int(total), "refunded": int(refunds), "net": int(total - refunds)}


@router.get("/financial/due-list")
def fee_due_list(
    class_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    q = select(FeeDue).join(Student, Student.id == FeeDue.student_id).where(Student.school_id == school_id)
    if class_id:
        cls = db.get(SchoolClass, class_id)
        if not cls or cls.school_id != school_id:
            raise not_found("Class not found")
        q = q.join(Enrollment, Enrollment.student_id == Student.id).where(Enrollment.class_id == class_id)
    rows = db.execute(q.order_by(FeeDue.due_amount.desc())).scalars().all()
    return [{"student_id": str(r.student_id), "academic_year_id": str(r.academic_year_id), "due_amount": r.due_amount, "status": r.status} for r in rows]


@router.get("/financial/payment-history")
def payment_history_report(
    student_id: Optional[uuid.UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    q = select(FeePayment).join(Student, Student.id == FeePayment.student_id).where(Student.school_id == school_id)
    if student_id:
        q = q.where(FeePayment.student_id == student_id)
    if start_date:
        q = q.where(FeePayment.payment_date >= start_date)
    if end_date:
        q = q.where(FeePayment.payment_date <= end_date)
    rows = db.execute(q.order_by(FeePayment.payment_date.desc(), FeePayment.created_at.desc()).limit(500)).scalars().all()
    return [{"id": str(p.id), "student_id": str(p.student_id), "date": p.payment_date.isoformat(), "amount": p.amount, "refund": p.is_refund} for p in rows]


@router.get("/financial/class-wise-collection")
def class_wise_collection_report(
    academic_year_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    year = db.get(AcademicYear, academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    rows = db.execute(
        select(Enrollment.class_id, func.coalesce(func.sum(FeePayment.amount), 0))
        .join(FeePayment, (FeePayment.student_id == Enrollment.student_id) & (FeePayment.academic_year_id == academic_year_id))
        .join(Student, Student.id == Enrollment.student_id)
        .where(Student.school_id == school_id, Enrollment.academic_year_id == academic_year_id, FeePayment.is_refund.is_(False))
        .group_by(Enrollment.class_id)
    ).all()
    return [{"class_id": str(cid), "collected": int(total)} for cid, total in rows]


@router.get("/administrative/student-strength")
def student_strength_report(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, int]:
    total = db.scalar(select(func.count()).select_from(Student).where(Student.school_id == school_id)) or 0
    active = db.scalar(select(func.count()).select_from(Student).where(Student.school_id == school_id, Student.status == "active")) or 0
    return {"total": int(total), "active": int(active)}


@router.get("/administrative/staff-directory")
def staff_directory_report(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[dict]:
    rows = db.execute(select(Staff).where(Staff.school_id == school_id).order_by(Staff.full_name.asc())).scalars().all()
    return [{"id": str(s.id), "full_name": s.full_name, "designation": s.designation, "department": s.department, "phone": s.phone, "email": s.email} for s in rows]


@router.get("/administrative/enrollment-report")
def enrollment_report(
    academic_year_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[dict]:
    year = db.get(AcademicYear, academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    rows = db.execute(
        select(Enrollment.class_id, func.count())
        .join(Student, Student.id == Enrollment.student_id)
        .where(Student.school_id == school_id, Enrollment.academic_year_id == academic_year_id)
        .group_by(Enrollment.class_id)
    ).all()
    return [{"class_id": str(cid), "count": int(cnt)} for cid, cnt in rows]


@router.post("/custom/generate", include_in_schema=False)
def generate_custom_report() -> None:
    raise not_implemented("Custom reports are not implemented yet")

