import csv
import io
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.enrollment import Enrollment
from app.models.exam import Exam
from app.models.exam_schedule import ExamSchedule
from app.models.fee_payment import FeePayment
from app.models.fee_structure import FeeStructure
from app.models.school_class import SchoolClass
from app.models.staff import Staff
from app.models.student import Student
from app.models.teacher_assignment import StudentAttendance
from app.models.mark import Mark

router = APIRouter(dependencies=[Depends(require_permission("import_export:read"))])

_CSV_MEDIA_TYPE = "text/csv; charset=utf-8"


def _csv_response(filename: str, content: str) -> StreamingResponse:
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(iter([content.encode("utf-8")]), media_type=_CSV_MEDIA_TYPE, headers=headers)


def _read_csv(file: UploadFile) -> list[dict[str, str]]:
    raw = file.file.read()
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return [dict({(k or "").strip(): (v or "").strip() for k, v in row.items()}) for row in reader]


def _parse_date(value: str) -> Optional[date]:
    if not value:
        return None
    return date.fromisoformat(value)


def _uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except Exception as exc:
        raise problem(status_code=400, title="Bad Request", detail=f"Invalid UUID: {value}") from exc


@router.post("/import/students", dependencies=[Depends(require_permission("import_export:write"))])
def import_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    rows = _read_csv(file)
    now = datetime.now(timezone.utc)
    created = 0
    for r in rows:
        first_name = r.get("first_name") or r.get("firstName") or ""
        if not first_name:
            continue
        s = Student(
            school_id=school_id,
            first_name=first_name,
            last_name=r.get("last_name") or r.get("lastName") or None,
            admission_no=r.get("admission_no") or r.get("admissionNo") or None,
            gender=r.get("gender") or None,
            date_of_birth=_parse_date(r.get("date_of_birth") or r.get("dateOfBirth") or ""),
            status=r.get("status") or "active",
            photo_url=r.get("photo_url") or r.get("photoUrl") or None,
            created_at=now,
        )
        db.add(s)
        created += 1
    db.commit()
    return {"created": created}


@router.post("/import/staff", dependencies=[Depends(require_permission("import_export:write"))])
def import_staff(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    rows = _read_csv(file)
    now = datetime.now(timezone.utc)
    created = 0
    for r in rows:
        full_name = r.get("full_name") or r.get("fullName") or ""
        if not full_name:
            continue
        st = Staff(
            school_id=school_id,
            full_name=full_name,
            designation=r.get("designation") or None,
            department=r.get("department") or None,
            email=r.get("email") or None,
            phone=r.get("phone") or None,
            date_of_joining=_parse_date(r.get("date_of_joining") or r.get("dateOfJoining") or ""),
            status=r.get("status") or "active",
            photo_url=r.get("photo_url") or r.get("photoUrl") or None,
            created_at=now,
        )
        db.add(st)
        created += 1
    db.commit()
    return {"created": created}


@router.post("/import/fee-structures", dependencies=[Depends(require_permission("import_export:write"))])
def import_fee_structures(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    rows = _read_csv(file)
    now = datetime.now(timezone.utc)
    created = 0
    for r in rows:
        year_id = r.get("academic_year_id") or ""
        class_id = r.get("class_id") or ""
        name = r.get("name") or ""
        amount = r.get("amount") or ""
        if not (year_id and class_id and name and amount):
            continue
        y = db.get(AcademicYear, _uuid(year_id))
        if not y or y.school_id != school_id:
            raise not_found("Academic year not found")
        c = db.get(SchoolClass, _uuid(class_id))
        if not c or c.school_id != school_id:
            raise not_found("Class not found")
        fs = FeeStructure(
            academic_year_id=y.id,
            class_id=c.id,
            name=name,
            amount=int(amount),
            due_date=_parse_date(r.get("due_date") or ""),
            created_at=now,
        )
        db.add(fs)
        created += 1
    db.commit()
    return {"created": created}


@router.post("/import/marks", dependencies=[Depends(require_permission("import_export:write"))])
def import_marks(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    rows = _read_csv(file)
    now = datetime.now(timezone.utc)
    created = 0
    for r in rows:
        sched_id = r.get("exam_schedule_id") or ""
        student_id = r.get("student_id") or ""
        if not (sched_id and student_id):
            continue
        sched = db.get(ExamSchedule, _uuid(sched_id))
        if not sched:
            raise not_found("Exam schedule not found")
        exam = db.get(Exam, sched.exam_id)
        year = db.get(AcademicYear, exam.academic_year_id) if exam else None
        if not year or year.school_id != school_id:
            raise not_found("Exam schedule not found")
        student = db.get(Student, _uuid(student_id))
        if not student or student.school_id != school_id:
            raise not_found("Student not found")
        marks_obtained = r.get("marks_obtained") or ""
        is_absent = (r.get("is_absent") or "").lower() in {"1", "true", "yes"}
        m = Mark(
            exam_schedule_id=sched.id,
            student_id=student.id,
            marks_obtained=(None if is_absent or not marks_obtained else int(marks_obtained)),
            is_absent=is_absent,
            remarks=r.get("remarks") or None,
            created_at=now,
        )
        db.add(m)
        created += 1
    db.commit()
    return {"created": created}


@router.get("/export/students")
def export_students(
    format: str = "excel",
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    rows = db.execute(select(Student).where(Student.school_id == school_id).order_by(Student.created_at.asc())).scalars().all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["first_name", "last_name", "admission_no", "gender", "date_of_birth", "status", "photo_url"])
    for s in rows:
        w.writerow([s.first_name, s.last_name or "", s.admission_no or "", s.gender or "", s.date_of_birth or "", s.status, s.photo_url or ""])
    return _csv_response("students.csv", buf.getvalue())


@router.get("/export/staff")
def export_staff(
    format: str = "excel",
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    rows = db.execute(select(Staff).where(Staff.school_id == school_id).order_by(Staff.created_at.asc())).scalars().all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["full_name", "designation", "department", "email", "phone", "date_of_joining", "status", "photo_url"])
    for s in rows:
        w.writerow([s.full_name, s.designation or "", s.department or "", s.email or "", s.phone or "", s.date_of_joining or "", s.status, s.photo_url or ""])
    return _csv_response("staff.csv", buf.getvalue())


@router.get("/export/attendance")
def export_attendance(
    start_date: str,
    end_date: str,
    format: str = "excel",
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    rows = (
        db.execute(
            select(StudentAttendance)
            .join(Student, Student.id == StudentAttendance.student_id)
            .where(
                Student.school_id == school_id,
                StudentAttendance.attendance_date >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc),
                StudentAttendance.attendance_date <= datetime.combine(end, datetime.max.time(), tzinfo=timezone.utc),
            )
            .order_by(StudentAttendance.attendance_date.asc())
        )
        .scalars()
        .all()
    )
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["attendance_date", "student_id", "class_id", "section_id", "status"])
    for r in rows:
        w.writerow([r.attendance_date.date(), r.student_id, r.class_id or "", r.section_id or "", r.status])
    return _csv_response("attendance.csv", buf.getvalue())


@router.get("/export/marks")
def export_marks(
    exam_id: str,
    format: str = "excel",
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    exam = db.get(Exam, _uuid(exam_id))
    year = db.get(AcademicYear, exam.academic_year_id) if exam else None
    if not exam or not year or year.school_id != school_id:
        raise not_found("Exam not found")
    schedule_ids = db.execute(select(ExamSchedule.id).where(ExamSchedule.exam_id == exam.id)).scalars().all()
    if not schedule_ids:
        return _csv_response("marks.csv", "exam_schedule_id,student_id,marks_obtained,is_absent,remarks\n")
    rows = db.execute(select(Mark).where(Mark.exam_schedule_id.in_(schedule_ids))).scalars().all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["exam_schedule_id", "student_id", "marks_obtained", "is_absent", "remarks"])
    for m in rows:
        w.writerow([m.exam_schedule_id, m.student_id, m.marks_obtained if m.marks_obtained is not None else "", m.is_absent, m.remarks or ""])
    return _csv_response("marks.csv", buf.getvalue())


@router.get("/export/fee-payments")
def export_fee_payments(
    start_date: str,
    end_date: str,
    format: str = "excel",
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    rows = (
        db.execute(
            select(FeePayment)
            .join(Student, Student.id == FeePayment.student_id)
            .where(
                Student.school_id == school_id,
                FeePayment.payment_date >= start,
                FeePayment.payment_date <= end,
            )
            .order_by(FeePayment.payment_date.asc())
        )
        .scalars()
        .all()
    )
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["payment_date", "student_id", "academic_year_id", "amount", "payment_method", "reference", "is_refund"])
    for p in rows:
        w.writerow([p.payment_date, p.student_id, p.academic_year_id, p.amount, p.payment_method or "", p.reference or "", p.is_refund])
    return _csv_response("fee_payments.csv", buf.getvalue())


@router.get("/template/students")
def get_student_import_template() -> StreamingResponse:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["first_name", "last_name", "admission_no", "gender", "date_of_birth", "status", "photo_url"])
    w.writerow(["John", "Doe", "A001", "male", "2010-01-01", "active", ""])
    return _csv_response("students_template.csv", buf.getvalue())


@router.get("/template/staff")
def get_staff_import_template() -> StreamingResponse:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["full_name", "designation", "department", "email", "phone", "date_of_joining", "status", "photo_url"])
    w.writerow(["Jane Teacher", "Teacher", "Academics", "jane@example.com", "123", "2020-01-01", "active", ""])
    return _csv_response("staff_template.csv", buf.getvalue())
