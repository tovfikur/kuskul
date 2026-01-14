import uuid
import csv
import io
from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.document import Document
from app.models.enrollment import Enrollment
from app.models.guardian import Guardian
from app.models.student import Student
from app.models.student_guardian import StudentGuardian
from app.models.teacher_assignment import StudentAttendance
from app.models.timetable_entry import TimetableEntry
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.schemas.batch import BatchPromoteStudentsRequest
from app.schemas.documents import DocumentOut
from app.schemas.guardians import LinkGuardianRequest, GuardianOut
from app.schemas.attendance import StudentAttendanceOut
from app.schemas.students import StudentCreate, StudentOut, StudentUpdate

router = APIRouter(dependencies=[Depends(require_permission("students:read"))])


def _out(s: Student) -> StudentOut:
    return StudentOut(
        id=s.id,
        school_id=s.school_id,
        first_name=s.first_name,
        last_name=s.last_name,
        admission_no=s.admission_no,
        gender=s.gender,
        date_of_birth=s.date_of_birth,
        status=s.status,
        photo_url=s.photo_url,
    )


@router.get("", response_model=dict)
def list_students(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    limit: int = 20,
    class_id: Optional[uuid.UUID] = None,
    section_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    gender: Optional[str] = None,
) -> dict:
    offset = (page - 1) * limit if page > 1 else 0

    base = select(Student).where(Student.school_id == school_id)
    if search:
        base = base.where(
            (Student.first_name.ilike(f"%{search}%"))
            | (Student.last_name.ilike(f"%{search}%"))
            | (Student.admission_no.ilike(f"%{search}%"))
        )
    if status:
        base = base.where(Student.status == status)
    if gender:
        base = base.where(Student.gender == gender)
    if class_id or section_id:
        base = base.join(Enrollment, Enrollment.student_id == Student.id)
        if class_id:
            base = base.where(Enrollment.class_id == class_id)
        if section_id:
            base = base.where(Enrollment.section_id == section_id)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(Student.first_name.asc()).offset(offset).limit(limit)).scalars().all()
    return {"items": [_out(s).model_dump() for s in rows], "total": int(total), "page": page, "limit": limit}


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> StudentOut:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    return _out(s)


@router.post("", response_model=StudentOut, dependencies=[Depends(require_permission("students:write"))])
def create_student(payload: StudentCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> StudentOut:
    now = datetime.now(timezone.utc)
    s = Student(
        school_id=school_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        admission_no=payload.admission_no,
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        status=payload.status,
        created_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.put("/{student_id}", response_model=StudentOut, dependencies=[Depends(require_permission("students:write"))])
def update_student(
    student_id: uuid.UUID, payload: StudentUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> StudentOut:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    return _out(s)


@router.delete("/{student_id}", dependencies=[Depends(require_permission("students:write"))])
def delete_student(student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    db.delete(s)
    db.commit()
    return {"status": "ok"}


@router.post("/{student_id}/photo", dependencies=[Depends(require_permission("students:write"))])
def upload_student_photo(
    student_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    if not file.filename:
        raise problem(status_code=400, title="Bad Request", detail="Missing filename")
    s.photo_url = file.filename
    db.commit()
    return {"status": "ok"}


@router.get("/{student_id}/attendance")
def get_student_attendance(
    student_id: uuid.UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[StudentAttendanceOut]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")

    q = select(StudentAttendance).where(StudentAttendance.student_id == student_id)
    if start_date:
        q = q.where(StudentAttendance.attendance_date >= datetime.combine(start_date, time.min, tzinfo=timezone.utc))
    if end_date:
        q = q.where(StudentAttendance.attendance_date <= datetime.combine(end_date, time.min, tzinfo=timezone.utc))
    rows = db.execute(q.order_by(StudentAttendance.attendance_date.asc())).scalars().all()
    return [
        StudentAttendanceOut(
            id=r.id,
            attendance_date=r.attendance_date.date(),
            student_id=r.student_id,
            class_id=r.class_id,
            section_id=r.section_id,
            status=r.status,
        )
        for r in rows
    ]


@router.get("/{student_id}/attendance/summary")
def get_student_attendance_summary(
    student_id: uuid.UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    rows = get_student_attendance(
        student_id=student_id, start_date=start_date, end_date=end_date, db=db, school_id=school_id
    )
    counts: dict[str, int] = {}
    for r in rows:
        counts[r.status] = counts.get(r.status, 0) + 1
    counts["total"] = len(rows)
    return counts


@router.get("/{student_id}/marks")
def get_student_marks() -> None:
    raise not_implemented("Student marks is not implemented yet")


@router.get("/{student_id}/results")
def get_student_results() -> None:
    raise not_implemented("Student results is not implemented yet")


@router.get("/{student_id}/report-card/{exam_id}")
def generate_report_card() -> None:
    raise not_implemented("Report card generation is not implemented yet")


@router.get("/{student_id}/fee-status")
def get_student_fee_status() -> None:
    raise not_implemented("Fee status is not implemented yet")


@router.get("/{student_id}/guardians")
def get_student_guardians(
    student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[GuardianOut]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    guardians = db.execute(
        select(Guardian)
        .join(StudentGuardian, StudentGuardian.guardian_id == Guardian.id)
        .where(StudentGuardian.student_id == student_id, Guardian.school_id == school_id)
        .order_by(Guardian.full_name.asc())
    ).scalars().all()
    return [
        GuardianOut(
            id=g.id,
            school_id=g.school_id,
            full_name=g.full_name,
            phone=g.phone,
            email=g.email,
            emergency_contact_name=g.emergency_contact_name,
            emergency_contact_phone=g.emergency_contact_phone,
            address=g.address,
            photo_url=g.photo_url,
        )
        for g in guardians
    ]


@router.post("/{student_id}/guardians", dependencies=[Depends(require_permission("students:write"))])
def add_student_guardian(
    student_id: uuid.UUID,
    payload: LinkGuardianRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    g = db.get(Guardian, payload.guardian_id)
    if not g or g.school_id != school_id:
        raise not_found("Guardian not found")
    link = db.get(StudentGuardian, {"student_id": student_id, "guardian_id": payload.guardian_id})
    if link:
        raise problem(status_code=409, title="Conflict", detail="Guardian already linked to student")
    db.add(StudentGuardian(student_id=student_id, guardian_id=payload.guardian_id, relation=payload.relation, is_primary=payload.is_primary))
    db.commit()
    return {"status": "ok"}


@router.get("/{student_id}/documents")
def get_student_documents(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[DocumentOut]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    rows = (
        db.execute(
            select(Document)
            .where(Document.school_id == school_id, Document.entity_type == "student", Document.entity_id == str(student_id))
            .order_by(Document.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [
        DocumentOut(
            id=d.id,
            school_id=d.school_id,
            uploaded_by_user_id=d.uploaded_by_user_id,
            entity_type=d.entity_type,
            entity_id=d.entity_id,
            filename=d.filename,
        )
        for d in rows
    ]


@router.post("/{student_id}/documents", dependencies=[Depends(require_permission("students:write"))])
def upload_student_document(
    student_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> DocumentOut:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    if not file.filename:
        raise problem(status_code=400, title="Bad Request", detail="Missing filename")
    content = file.file.read()
    now = datetime.now(timezone.utc)
    d = Document(
        school_id=school_id,
        uploaded_by_user_id=user.id,
        entity_type="student",
        entity_id=str(student_id),
        filename=file.filename,
        content_type=file.content_type,
        content=content,
        created_at=now,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return DocumentOut(
        id=d.id,
        school_id=d.school_id,
        uploaded_by_user_id=d.uploaded_by_user_id,
        entity_type=d.entity_type,
        entity_id=d.entity_id,
        filename=d.filename,
    )


@router.get("/{student_id}/timetable")
def get_student_timetable(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    enr = db.scalar(select(Enrollment).where(Enrollment.student_id == student_id, Enrollment.status == "active"))
    if not enr or enr.section_id is None:
        return []
    rows = (
        db.execute(
            select(TimetableEntry, TimeSlot)
            .join(TimeSlot, TimeSlot.id == TimetableEntry.time_slot_id)
            .where(TimetableEntry.academic_year_id == enr.academic_year_id, TimetableEntry.section_id == enr.section_id)
            .order_by(TimetableEntry.day_of_week.asc(), TimeSlot.start_time.asc())
        )
        .all()
    )
    out = []
    for entry, slot in rows:
        out.append(
            {
                "id": str(entry.id),
                "day_of_week": entry.day_of_week,
                "time_slot_id": str(entry.time_slot_id),
                "start_time": str(slot.start_time),
                "end_time": str(slot.end_time),
                "subject_id": str(entry.subject_id) if entry.subject_id else None,
                "staff_id": str(entry.staff_id) if entry.staff_id else None,
                "room": entry.room,
            }
        )
    return out


@router.post("/bulk-import", dependencies=[Depends(require_permission("students:write"))])
def bulk_import_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    raw = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    now = datetime.now(timezone.utc)
    created = 0
    for r in reader:
        first_name = (r.get("first_name") or "").strip()
        if not first_name:
            continue
        s = Student(
            school_id=school_id,
            first_name=first_name,
            last_name=(r.get("last_name") or "").strip() or None,
            admission_no=(r.get("admission_no") or "").strip() or None,
            gender=(r.get("gender") or "").strip() or None,
            date_of_birth=(date.fromisoformat(r["date_of_birth"]) if (r.get("date_of_birth") or "").strip() else None),
            status=(r.get("status") or "active").strip(),
            photo_url=(r.get("photo_url") or "").strip() or None,
            created_at=now,
        )
        db.add(s)
        created += 1
    db.commit()
    return {"created": created}


@router.get("/export")
def export_students(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    rows = db.execute(select(Student).where(Student.school_id == school_id).order_by(Student.created_at.asc())).scalars().all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["first_name", "last_name", "admission_no", "gender", "date_of_birth", "status", "photo_url"])
    for s in rows:
        w.writerow([s.first_name, s.last_name or "", s.admission_no or "", s.gender or "", s.date_of_birth or "", s.status, s.photo_url or ""])
    headers = {"Content-Disposition": 'attachment; filename="students.csv"'}
    return StreamingResponse(iter([buf.getvalue().encode("utf-8")]), media_type="text/csv; charset=utf-8", headers=headers)


@router.post("/bulk-promote", dependencies=[Depends(require_permission("students:write"))])
def bulk_promote_students(
    payload: BatchPromoteStudentsRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    created = 0
    for eid in payload.enrollment_ids:
        e = db.get(Enrollment, eid)
        if not e:
            raise not_found("Enrollment not found")
        student = db.get(Student, e.student_id)
        if not student or student.school_id != school_id:
            raise not_found("Enrollment not found")
        existing = db.scalar(
            select(Enrollment).where(Enrollment.student_id == e.student_id, Enrollment.academic_year_id == payload.new_academic_year_id)
        )
        if existing:
            raise problem(status_code=409, title="Conflict", detail="Student already enrolled in target academic year")
        e.status = "promoted"
        db.add(
            Enrollment(
                student_id=e.student_id,
                academic_year_id=payload.new_academic_year_id,
                class_id=payload.new_class_id,
                section_id=payload.new_section_id,
                roll_number=None,
                status="active",
                created_at=now,
            )
        )
        created += 1
    db.commit()
    return {"created": created}


@router.get("/{student_id}/id-card")
def generate_student_id_card(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")
    content = f"ID CARD\nStudent: {s.first_name} {s.last_name or ''}\nAdmission: {s.admission_no or ''}\nStudent ID: {s.id}\n".encode(
        "utf-8"
    )
    headers = {"Content-Disposition": f'attachment; filename="id_card_{s.id}.txt"'}
    return StreamingResponse(iter([content]), media_type="text/plain", headers=headers)
