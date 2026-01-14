import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found, forbidden
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.appointment_request import AppointmentRequest
from app.models.attendance_excuse import AttendanceExcuse
from app.models.certificate import Certificate
from app.models.discipline_record import DisciplineRecord
from app.models.document import Document
from app.models.enrollment import Enrollment
from app.models.exam import Exam
from app.models.exam_schedule import ExamSchedule
from app.models.fee_due import FeeDue
from app.models.fee_payment import FeePayment
from app.models.guardian import Guardian
from app.models.mark import Mark
from app.models.notice import Notice
from app.models.result import Result
from app.models.student import Student
from app.models.student_guardian import StudentGuardian
from app.models.transport_assignment import StudentTransportAssignment
from app.models.transport_route import TransportRoute
from app.models.transport_route_stop import TransportRouteStop
from app.models.transport_vehicle import TransportVehicle
from app.models.teacher_assignment import StudentAttendance
from app.models.timetable_entry import TimetableEntry
from app.models.user_preference import UserPreference
from app.models.user import User
from app.schemas.parent_portal import (
    AppointmentDecisionRequest,
    AppointmentRequestCreate,
    AppointmentRequestOut,
    AttendanceExcuseCreate,
    AttendanceExcuseOut,
    DisciplineRecordCreate,
    DisciplineRecordOut,
    ParentLinkGuardianRequest,
    ParentProfileOut,
    ParentProfileUpdate,
    UserPreferenceOut,
    UserPreferenceUpdate,
)

router = APIRouter(dependencies=[Depends(require_permission("parent_portal:read"))])


def _ensure_guardian_binding(db: Session, user_id: uuid.UUID, school_id: uuid.UUID) -> Guardian:
    g = db.scalar(select(Guardian).where(Guardian.user_id == user_id, Guardian.school_id == school_id))
    if not g:
        raise forbidden("Guardian account is not linked to this school")
    return g


def _guardian_students(db: Session, guardian_id: uuid.UUID, school_id: uuid.UUID) -> list[Student]:
    return (
        db.execute(
            select(Student)
            .join(StudentGuardian, StudentGuardian.student_id == Student.id)
            .where(StudentGuardian.guardian_id == guardian_id, Student.school_id == school_id)
            .order_by(Student.first_name.asc())
        )
        .scalars()
        .all()
    )


def _profile_out(user: User, g: Guardian) -> ParentProfileOut:
    return ParentProfileOut(
        user_id=user.id,
        guardian_id=g.id,
        full_name=g.full_name,
        phone=g.phone,
        email=user.email,
        emergency_contact_name=g.emergency_contact_name,
        emergency_contact_phone=g.emergency_contact_phone,
        address=g.address,
        photo_url=g.photo_url,
    )


@router.get("/profile", response_model=ParentProfileOut)
def get_parent_profile(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> ParentProfileOut:
    g = _ensure_guardian_binding(db, user.id, school_id)
    return _profile_out(user, g)


@router.patch("/profile", response_model=ParentProfileOut, dependencies=[Depends(require_permission("parent_portal:write"))])
def update_parent_profile(
    payload: ParentProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> ParentProfileOut:
    g = _ensure_guardian_binding(db, user.id, school_id)
    data = payload.model_dump(exclude_unset=True)
    if "email" in data:
        next_email = str(data.pop("email"))
        existing = db.scalar(select(User).where(User.email == next_email, User.id != user.id))
        if existing:
            raise forbidden("Email already registered")
        user.email = next_email
        user.updated_at = datetime.now(timezone.utc)
    for k, v in data.items():
        setattr(g, k, v)
    db.commit()
    return _profile_out(user, g)


@router.post("/link-guardian", response_model=ParentProfileOut, dependencies=[Depends(require_permission("parent_portal:write"))])
def link_guardian(
    payload: ParentLinkGuardianRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> ParentProfileOut:
    g = db.get(Guardian, payload.guardian_id)
    if not g or g.school_id != school_id:
        raise not_found("Guardian not found")
    phone_match = payload.phone and g.phone and payload.phone.strip() == g.phone.strip()
    email_match = payload.email and g.email and str(payload.email).lower() == str(g.email).lower()
    if not phone_match and not email_match:
        raise forbidden("Guardian verification failed")
    if g.user_id and g.user_id != user.id:
        raise forbidden("Guardian is already linked to another account")
    g.user_id = user.id
    db.commit()
    return _profile_out(user, g)


@router.get("/preferences", response_model=UserPreferenceOut)
def get_preferences(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> UserPreferenceOut:
    row = db.scalar(select(UserPreference).where(UserPreference.user_id == user.id, UserPreference.school_id == school_id))
    if not row:
        return UserPreferenceOut(language=None, notify_sms=False, notify_email=True, notify_push=True)
    return UserPreferenceOut(language=row.language, notify_sms=row.notify_sms, notify_email=row.notify_email, notify_push=row.notify_push)


@router.patch("/preferences", response_model=UserPreferenceOut, dependencies=[Depends(require_permission("parent_portal:write"))])
def update_preferences(
    payload: UserPreferenceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> UserPreferenceOut:
    now = datetime.now(timezone.utc)
    row = db.scalar(select(UserPreference).where(UserPreference.user_id == user.id, UserPreference.school_id == school_id))
    if not row:
        row = UserPreference(
            user_id=user.id,
            school_id=school_id,
            language=None,
            notify_sms=False,
            notify_email=True,
            notify_push=True,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
        db.flush()
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    row.updated_at = now
    db.commit()
    return UserPreferenceOut(language=row.language, notify_sms=row.notify_sms, notify_email=row.notify_email, notify_push=row.notify_push)


@router.get("/children")
def list_children(db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)) -> list[dict]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    items = []
    for s in _guardian_students(db, g.id, school_id):
        items.append(
            {
                "id": str(s.id),
                "first_name": s.first_name,
                "last_name": s.last_name,
                "photo_url": s.photo_url,
                "status": s.status,
            }
        )
    return items


@router.get("/dashboard/{student_id}")
def child_dashboard(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    g = _ensure_guardian_binding(db, user.id, school_id)
    students = _guardian_students(db, g.id, school_id)
    if not any(s.id == student_id for s in students):
        raise forbidden("Access denied")

    s = db.get(Student, student_id)
    if not s or s.school_id != school_id:
        raise not_found("Student not found")

    year = db.scalar(select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)))
    overview = {
        "student": {
            "id": str(s.id),
            "first_name": s.first_name,
            "last_name": s.last_name,
            "photo_url": s.photo_url,
            "gender": s.gender,
            "date_of_birth": s.date_of_birth.isoformat() if s.date_of_birth else None,
        },
        "academic_year": year.name if year else None,
    }

    today = date.today()
    today_attendance = db.scalar(
        select(StudentAttendance)
        .where(StudentAttendance.student_id == student_id, func.date(StudentAttendance.attendance_date) == today)
        .order_by(StudentAttendance.created_at.desc())
    )
    overview["attendance_today"] = (today_attendance.status if today_attendance else None)

    overdue = db.scalar(select(func.coalesce(func.sum(FeeDue.due_amount), 0)).where(FeeDue.student_id == student_id)) or 0
    overview["fee_due_amount"] = int(overdue)

    latest_notice = db.scalar(
        select(Notice).where(Notice.school_id == school_id, Notice.is_published.is_(True)).order_by(Notice.published_at.desc())
    )
    overview["latest_notice"] = {"title": latest_notice.title, "published_at": latest_notice.published_at.isoformat()} if latest_notice else None
    return overview


@router.get("/attendance/{student_id}/month")
def attendance_month(
    student_id: uuid.UUID,
    month: int,
    year: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> list[dict]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    start = date(year, month, 1)
    end = date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)
    rows = (
        db.execute(
            select(StudentAttendance).where(
                StudentAttendance.student_id == student_id,
                StudentAttendance.attendance_date >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc),
                StudentAttendance.attendance_date < datetime.combine(end, datetime.min.time(), tzinfo=timezone.utc),
            )
        )
        .scalars()
        .all()
    )
    return [{"date": r.attendance_date.date().isoformat(), "status": r.status} for r in rows]


@router.get("/attendance/{student_id}/excuses", response_model=list[AttendanceExcuseOut])
def list_attendance_excuses(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[AttendanceExcuseOut]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    rows = db.execute(
        select(AttendanceExcuse)
        .where(AttendanceExcuse.school_id == school_id, AttendanceExcuse.student_id == student_id, AttendanceExcuse.guardian_id == g.id)
        .order_by(AttendanceExcuse.attendance_date.desc(), AttendanceExcuse.created_at.desc())
    ).scalars().all()
    return [
        AttendanceExcuseOut(
            id=r.id,
            student_id=r.student_id,
            attendance_date=r.attendance_date,
            reason=r.reason,
            status=r.status,
            decided_at=r.decided_at,
        )
        for r in rows
    ]


@router.post("/attendance/{student_id}/excuses", response_model=AttendanceExcuseOut, dependencies=[Depends(require_permission("parent_portal:write"))])
def submit_attendance_excuse(
    student_id: uuid.UUID,
    payload: AttendanceExcuseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> AttendanceExcuseOut:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    now = datetime.now(timezone.utc)
    row = AttendanceExcuse(
        school_id=school_id,
        student_id=student_id,
        guardian_id=g.id,
        attendance_date=payload.attendance_date,
        reason=payload.reason,
        status="pending",
        decided_by_user_id=None,
        decided_at=None,
        created_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return AttendanceExcuseOut(
        id=row.id,
        student_id=row.student_id,
        attendance_date=row.attendance_date,
        reason=row.reason,
        status=row.status,
        decided_at=row.decided_at,
    )


@router.get("/appointments", response_model=list[AppointmentRequestOut])
def list_my_appointments(
    db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[AppointmentRequestOut]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    rows = db.execute(
        select(AppointmentRequest)
        .where(AppointmentRequest.school_id == school_id, AppointmentRequest.guardian_id == g.id)
        .order_by(AppointmentRequest.updated_at.desc())
    ).scalars().all()
    return [
        AppointmentRequestOut(
            id=r.id,
            student_id=r.student_id,
            staff_id=r.staff_id,
            requested_for=r.requested_for,
            reason=r.reason,
            status=r.status,
            response_note=r.response_note,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.post("/appointments", response_model=AppointmentRequestOut, dependencies=[Depends(require_permission("parent_portal:write"))])
def request_appointment(
    payload: AppointmentRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> AppointmentRequestOut:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if payload.student_id and not any(s.id == payload.student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    now = datetime.now(timezone.utc)
    row = AppointmentRequest(
        school_id=school_id,
        guardian_id=g.id,
        student_id=payload.student_id,
        staff_id=payload.staff_id,
        requested_for=payload.requested_for,
        reason=payload.reason,
        status="pending",
        response_note=None,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return AppointmentRequestOut(
        id=row.id,
        student_id=row.student_id,
        staff_id=row.staff_id,
        requested_for=row.requested_for,
        reason=row.reason,
        status=row.status,
        response_note=row.response_note,
        updated_at=row.updated_at,
    )


@router.get("/discipline/{student_id}", response_model=list[DisciplineRecordOut])
def list_discipline(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[DisciplineRecordOut]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    rows = db.execute(
        select(DisciplineRecord)
        .where(DisciplineRecord.school_id == school_id, DisciplineRecord.student_id == student_id)
        .order_by(DisciplineRecord.created_at.desc())
    ).scalars().all()
    return [
        DisciplineRecordOut(
            id=r.id,
            student_id=r.student_id,
            category=r.category,
            note=r.note,
            is_positive=r.is_positive,
            requires_ack=r.requires_ack,
            acknowledged_at=r.acknowledged_at,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/discipline/{record_id}/acknowledge", dependencies=[Depends(require_permission("parent_portal:write"))])
def acknowledge_discipline(
    record_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    r = db.get(DisciplineRecord, record_id)
    if not r or r.school_id != school_id:
        raise not_found("Record not found")
    if not any(s.id == r.student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    if r.acknowledged_at is None:
        r.acknowledged_at = datetime.now(timezone.utc)
        db.commit()
    return {"status": "ok"}


@router.get("/timetable/{student_id}", response_model=list[dict])
def child_timetable(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[dict]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    current_year = db.scalar(select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)))
    if not current_year:
        return []
    enrollment = db.scalar(select(Enrollment).where(Enrollment.student_id == student_id, Enrollment.academic_year_id == current_year.id))
    if not enrollment or not enrollment.section_id:
        return []
    rows = db.execute(
        select(TimetableEntry)
        .where(TimetableEntry.section_id == enrollment.section_id)
        .order_by(TimetableEntry.day_of_week.asc(), TimetableEntry.created_at.asc())
    ).scalars().all()
    return [
        {
            "day_of_week": r.day_of_week,
            "subject_id": str(r.subject_id) if r.subject_id else None,
            "staff_id": str(r.staff_id) if r.staff_id else None,
            "room": r.room,
        }
        for r in rows
    ]


@router.get("/exams/{student_id}")
def child_exam_schedule(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[dict]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    year = db.scalar(select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)))
    if not year:
        return []
    rows = db.execute(
        select(ExamSchedule)
        .join(Exam, Exam.id == ExamSchedule.exam_id)
        .where(Exam.academic_year_id == year.id)
        .order_by(ExamSchedule.exam_date.asc())
    ).scalars().all()
    return [{"subject_id": str(r.subject_id), "exam_date": r.exam_date.isoformat(), "room": r.room, "max_marks": r.max_marks} for r in rows]


@router.get("/marks/{student_id}")
def child_marks(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[dict]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    rows = db.execute(select(Mark).where(Mark.student_id == student_id).order_by(Mark.created_at.asc())).scalars().all()
    return [{"exam_schedule_id": str(m.exam_schedule_id), "marks_obtained": m.marks_obtained, "is_absent": m.is_absent, "remarks": m.remarks} for m in rows]


@router.get("/results/{student_id}")
def child_results(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[dict]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    rows = db.execute(select(Result).where(Result.student_id == student_id).order_by(Result.created_at.asc())).scalars().all()
    return [{"exam_id": str(r.exam_id), "total_marks": r.total_marks, "obtained_marks": r.obtained_marks, "percentage": r.percentage} for r in rows]


@router.get("/fees/{student_id}")
def child_fees(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    due = db.scalar(select(func.coalesce(func.sum(FeeDue.due_amount), 0)).where(FeeDue.student_id == student_id)) or 0
    paid = db.scalar(select(func.coalesce(func.sum(FeePayment.amount), 0)).where(FeePayment.student_id == student_id, FeePayment.is_refund.is_(False))) or 0
    history = db.execute(
        select(FeePayment).where(FeePayment.student_id == student_id).order_by(FeePayment.payment_date.desc(), FeePayment.created_at.desc())
    ).scalars().all()
    return {
        "due_amount": int(due),
        "paid_amount": int(paid),
        "history": [
            {
                "payment_date": h.payment_date.isoformat(),
                "amount": h.amount,
                "method": h.payment_method,
                "reference": h.reference,
                "is_refund": h.is_refund,
            }
            for h in history
        ],
    }


@router.get("/notices")
def list_notices(db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)) -> list[dict]:
    _ensure_guardian_binding(db, user.id, school_id)
    rows = db.execute(
        select(Notice).where(Notice.school_id == school_id, Notice.is_published.is_(True)).order_by(Notice.published_at.desc())
    ).scalars().all()
    return [
        {
            "id": str(n.id),
            "title": n.title,
            "content": n.content,
            "attachment_url": n.attachment_url,
            "published_at": n.published_at.isoformat() if n.published_at else None,
        }
        for n in rows
    ]


@router.get("/documents/{student_id}")
def list_student_documents(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[dict]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    rows = db.execute(
        select(Document)
        .where(Document.school_id == school_id, Document.entity_type == "student", Document.entity_id == str(student_id))
        .order_by(Document.created_at.desc())
    ).scalars().all()
    return [{"id": str(d.id), "filename": d.filename, "created_at": d.created_at.isoformat()} for d in rows]


@router.get("/documents/{document_id}/download")
def download_student_document(
    document_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> StreamingResponse:
    g = _ensure_guardian_binding(db, user.id, school_id)
    d = db.get(Document, document_id)
    if not d or d.school_id != school_id:
        raise not_found("Document not found")
    if d.content is None:
        raise not_found("Document content not found")
    if d.entity_type != "student" or not d.entity_id:
        raise forbidden("Access denied")
    if not any(str(s.id) == d.entity_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    headers = {"Content-Disposition": f'attachment; filename="{d.filename}"'}
    return StreamingResponse(iter([d.content]), media_type=d.content_type or "application/octet-stream", headers=headers)


@router.get("/certificates/{student_id}")
def list_student_certificates(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> list[dict]:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    rows = db.execute(
        select(Certificate)
        .where(Certificate.school_id == school_id, Certificate.student_id == student_id)
        .order_by(Certificate.created_at.desc())
    ).scalars().all()
    return [
        {"id": str(c.id), "template_type": c.template_type, "filename": c.filename, "created_at": c.created_at.isoformat()}
        for c in rows
    ]


@router.get("/certificates/{certificate_id}/download")
def download_student_certificate(
    certificate_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> StreamingResponse:
    g = _ensure_guardian_binding(db, user.id, school_id)
    c = db.get(Certificate, certificate_id)
    if not c or c.school_id != school_id:
        raise not_found("Certificate not found")
    if c.content is None:
        raise not_found("Certificate content not found")
    if not any(s.id == c.student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    headers = {"Content-Disposition": f'attachment; filename="{c.filename}"'}
    return StreamingResponse(iter([c.content]), media_type=c.content_type or "application/octet-stream", headers=headers)


@router.get("/transport/{student_id}")
def get_transport(
    student_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user), school_id=Depends(get_active_school_id)
) -> dict:
    g = _ensure_guardian_binding(db, user.id, school_id)
    if not any(s.id == student_id for s in _guardian_students(db, g.id, school_id)):
        raise forbidden("Access denied")
    a = db.scalar(
        select(StudentTransportAssignment)
        .where(StudentTransportAssignment.school_id == school_id, StudentTransportAssignment.student_id == student_id, StudentTransportAssignment.status == "active")
        .order_by(StudentTransportAssignment.created_at.desc())
    )
    if not a:
        return {"assignment": None}
    route = db.get(TransportRoute, a.route_id)
    stop = db.get(TransportRouteStop, a.stop_id) if a.stop_id else None
    vehicle = db.get(TransportVehicle, a.vehicle_id) if a.vehicle_id else None
    return {
        "assignment": {
            "route": {"id": str(route.id), "name": route.name} if route else None,
            "stop": {
                "id": str(stop.id),
                "name": stop.name,
                "pickup_time": stop.pickup_time.isoformat() if stop.pickup_time else None,
                "drop_time": stop.drop_time.isoformat() if stop.drop_time else None,
            }
            if stop
            else None,
            "vehicle": {"id": str(vehicle.id), "name": vehicle.name, "driver_name": vehicle.driver_name} if vehicle else None,
            "status": a.status,
        }
    }


@router.post("/staff/discipline", response_model=DisciplineRecordOut, dependencies=[Depends(require_permission("discipline:write"))])
def create_discipline_record(
    payload: DisciplineRecordCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> DisciplineRecordOut:
    student = db.get(Student, payload.student_id)
    if not student or student.school_id != school_id:
        raise not_found("Student not found")
    now = datetime.now(timezone.utc)
    row = DisciplineRecord(
        school_id=school_id,
        student_id=payload.student_id,
        category=payload.category,
        note=payload.note,
        is_positive=payload.is_positive,
        requires_ack=payload.requires_ack,
        acknowledged_at=None,
        created_by_user_id=user.id,
        created_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return DisciplineRecordOut(
        id=row.id,
        student_id=row.student_id,
        category=row.category,
        note=row.note,
        is_positive=row.is_positive,
        requires_ack=row.requires_ack,
        acknowledged_at=row.acknowledged_at,
        created_at=row.created_at,
    )


@router.get("/staff/appointments", dependencies=[Depends(require_permission("appointments:read"))])
def list_appointments(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    status: Optional[str] = None,
) -> list[dict]:
    q = select(AppointmentRequest).where(AppointmentRequest.school_id == school_id)
    if status:
        q = q.where(AppointmentRequest.status == status)
    rows = db.execute(q.order_by(AppointmentRequest.updated_at.desc()).limit(500)).scalars().all()
    return [
        {
            "id": str(r.id),
            "guardian_id": str(r.guardian_id),
            "student_id": str(r.student_id) if r.student_id else None,
            "staff_id": str(r.staff_id) if r.staff_id else None,
            "requested_for": r.requested_for.isoformat() if r.requested_for else None,
            "reason": r.reason,
            "status": r.status,
            "response_note": r.response_note,
            "updated_at": r.updated_at.isoformat(),
        }
        for r in rows
    ]


@router.patch("/staff/appointments/{appointment_id}", response_model=AppointmentRequestOut, dependencies=[Depends(require_permission("appointments:write"))])
def decide_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentDecisionRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> AppointmentRequestOut:
    row = db.get(AppointmentRequest, appointment_id)
    if not row or row.school_id != school_id:
        raise not_found("Appointment not found")
    row.status = payload.status
    row.response_note = payload.response_note
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    return AppointmentRequestOut(
        id=row.id,
        student_id=row.student_id,
        staff_id=row.staff_id,
        requested_for=row.requested_for,
        reason=row.reason,
        status=row.status,
        response_note=row.response_note,
        updated_at=row.updated_at,
    )
