import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.enrollment import Enrollment
from app.models.exam import Exam
from app.models.fee_due import FeeDue
from app.models.membership import Membership
from app.models.notification import Notification
from app.models.result import Result
from app.models.staff import Staff
from app.models.student import Student
from app.models.teacher_assignment import StaffAttendance, StudentAttendance
from app.models.user import User

router = APIRouter(dependencies=[Depends(require_permission("analytics:read"))])


def _ensure_membership(db: Session, user_id: uuid.UUID, school_id: uuid.UUID) -> None:
    m = db.scalar(
        select(Membership).where(Membership.user_id == user_id, Membership.school_id == school_id, Membership.is_active.is_(True))
    )
    if not m:
        raise not_found("School not found")


def _overview(db: Session, school_id: uuid.UUID) -> dict:
    students = db.scalar(select(func.count()).select_from(Student).where(Student.school_id == school_id)) or 0
    staff = db.scalar(select(func.count()).select_from(Staff).where(Staff.school_id == school_id)) or 0
    dues = db.scalar(
        select(func.coalesce(func.sum(FeeDue.due_amount), 0))
        .join(Student, Student.id == FeeDue.student_id)
        .where(Student.school_id == school_id)
    ) or 0
    return {"students": int(students), "staff": int(staff), "total_due_amount": int(dues)}


@router.get("/dashboard/admin")
def get_admin_dashboard(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    _ensure_membership(db, user.id, school_id)
    overview = _overview(db, school_id)
    unread_notifications = db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.school_id == school_id, Notification.user_id == user.id, Notification.is_read.is_(False)
        )
    ) or 0
    overview["my_unread_notifications"] = int(unread_notifications)
    return overview


@router.get("/dashboard/teacher")
def get_teacher_dashboard(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    _ensure_membership(db, user.id, school_id)
    data = _overview(db, school_id)
    unread_notifications = db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.school_id == school_id, Notification.user_id == user.id, Notification.is_read.is_(False)
        )
    ) or 0
    data["my_unread_notifications"] = int(unread_notifications)
    return data


@router.get("/dashboard/student")
def get_student_dashboard(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    _ensure_membership(db, user.id, school_id)
    data = _overview(db, school_id)
    unread_notifications = db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.school_id == school_id, Notification.user_id == user.id, Notification.is_read.is_(False)
        )
    ) or 0
    data["my_unread_notifications"] = int(unread_notifications)
    return data


@router.get("/dashboard/parent")
def get_parent_dashboard(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    _ensure_membership(db, user.id, school_id)
    data = _overview(db, school_id)
    unread_notifications = db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.school_id == school_id, Notification.user_id == user.id, Notification.is_read.is_(False)
        )
    ) or 0
    data["my_unread_notifications"] = int(unread_notifications)
    return data


@router.get("/statistics/overview")
def get_overview_statistics(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    _ensure_membership(db, user.id, school_id)
    return _overview(db, school_id)


@router.get("/statistics/attendance")
def get_attendance_statistics(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    _ensure_membership(db, user.id, school_id)
    end = date.today()
    start = end - timedelta(days=7)
    student_total = db.scalar(
        select(func.count())
        .select_from(StudentAttendance)
        .join(Student, Student.id == StudentAttendance.student_id)
        .where(Student.school_id == school_id, StudentAttendance.attendance_date >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc))
    ) or 0
    staff_total = db.scalar(
        select(func.count())
        .select_from(StaffAttendance)
        .join(Staff, Staff.id == StaffAttendance.staff_id)
        .where(Staff.school_id == school_id, StaffAttendance.attendance_date >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc))
    ) or 0
    return {"window_days": 7, "student_records": int(student_total), "staff_records": int(staff_total)}


@router.get("/statistics/academic")
def get_academic_statistics(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    _ensure_membership(db, user.id, school_id)
    year = db.scalar(select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)))
    if not year:
        return {"current_year_exams": 0, "results_count": 0}
    exams = db.scalar(select(func.count()).select_from(Exam).where(Exam.academic_year_id == year.id)) or 0
    results_count = db.scalar(select(func.count()).select_from(Result).join(Exam, Exam.id == Result.exam_id).where(Exam.academic_year_id == year.id)) or 0
    return {"current_year_exams": int(exams), "results_count": int(results_count)}


@router.get("/statistics/financial")
def get_financial_statistics(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    _ensure_membership(db, user.id, school_id)
    total_due = db.scalar(
        select(func.coalesce(func.sum(FeeDue.due_amount), 0)).join(Student, Student.id == FeeDue.student_id).where(Student.school_id == school_id)
    ) or 0
    total_paid = db.scalar(
        select(func.coalesce(func.sum(FeeDue.paid_amount), 0)).join(Student, Student.id == FeeDue.student_id).where(Student.school_id == school_id)
    ) or 0
    return {"due": int(total_due), "paid": int(total_paid)}


@router.get("/trends/enrollment")
def get_enrollment_trends(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[dict]:
    _ensure_membership(db, user.id, school_id)
    years = db.execute(select(AcademicYear).where(AcademicYear.school_id == school_id).order_by(AcademicYear.start_date.asc())).scalars().all()
    out: list[dict] = []
    for y in years:
        count = db.scalar(
            select(func.count()).select_from(Enrollment).where(Enrollment.academic_year_id == y.id)
        ) or 0
        out.append({"academic_year_id": str(y.id), "name": y.name, "enrollments": int(count)})
    return out


@router.get("/trends/performance")
def get_performance_trends(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[dict]:
    _ensure_membership(db, user.id, school_id)
    rows = db.execute(
        select(Exam.id, Exam.name, func.avg(Result.percentage))
        .join(Result, Result.exam_id == Exam.id)
        .join(AcademicYear, AcademicYear.id == Exam.academic_year_id)
        .where(AcademicYear.school_id == school_id)
        .group_by(Exam.id, Exam.name)
        .order_by(Exam.created_at.asc())
        .limit(50)
    ).all()
    return [{"exam_id": str(eid), "exam_name": name, "avg_pct": float(avg or 0)} for eid, name, avg in rows]

