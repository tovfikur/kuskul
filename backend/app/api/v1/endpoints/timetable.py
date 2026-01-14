import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.enrollment import Enrollment
from app.models.school_class import SchoolClass
from app.models.section import Section
from app.models.staff import Staff
from app.models.student import Student
from app.models.subject import Subject
from app.models.time_slot import TimeSlot
from app.models.timetable_entry import TimetableEntry
from app.schemas.timetable import TimetableBulkCreate, TimetableEntryCreate, TimetableEntryOut, TimetableEntryUpdate

router = APIRouter(dependencies=[Depends(require_permission("timetable:read"))])


def _out(t: TimetableEntry) -> TimetableEntryOut:
    return TimetableEntryOut(
        id=t.id,
        academic_year_id=t.academic_year_id,
        section_id=t.section_id,
        staff_id=t.staff_id,
        subject_id=t.subject_id,
        time_slot_id=t.time_slot_id,
        day_of_week=t.day_of_week,
        room=t.room,
    )


def _validate_entry_scope(db: Session, school_id: uuid.UUID, payload: TimetableEntryCreate) -> None:
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    sec = db.get(Section, payload.section_id)
    if not sec:
        raise not_found("Section not found")
    cls = db.get(SchoolClass, sec.class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Section not found")
    slot = db.get(TimeSlot, payload.time_slot_id)
    if not slot or slot.school_id != school_id:
        raise not_found("Time slot not found")
    if payload.staff_id:
        staff = db.get(Staff, payload.staff_id)
        if not staff or staff.school_id != school_id:
            raise not_found("Staff not found")
    if payload.subject_id:
        subject = db.get(Subject, payload.subject_id)
        if not subject or subject.school_id != school_id:
            raise not_found("Subject not found")


@router.get("", response_model=list[TimetableEntryOut])
def list_timetable(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    section_id: Optional[uuid.UUID] = None,
    staff_id: Optional[uuid.UUID] = None,
    day_of_week: Optional[int] = None,
) -> list[TimetableEntryOut]:
    q = select(TimetableEntry).join(AcademicYear, AcademicYear.id == TimetableEntry.academic_year_id).where(
        AcademicYear.school_id == school_id
    )
    if section_id:
        q = q.where(TimetableEntry.section_id == section_id)
    if staff_id:
        q = q.where(TimetableEntry.staff_id == staff_id)
    if day_of_week is not None:
        q = q.where(TimetableEntry.day_of_week == day_of_week)
    rows = db.execute(q.order_by(TimetableEntry.day_of_week.asc(), TimetableEntry.created_at.asc())).scalars().all()
    return [_out(t) for t in rows]


@router.get("/{timetable_id}", response_model=TimetableEntryOut)
def get_timetable_entry(
    timetable_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> TimetableEntryOut:
    t = db.get(TimetableEntry, timetable_id)
    if not t:
        raise not_found("Timetable entry not found")
    year = db.get(AcademicYear, t.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Timetable entry not found")
    return _out(t)


@router.post("", response_model=TimetableEntryOut, dependencies=[Depends(require_permission("timetable:write"))])
def create_timetable_entry(
    payload: TimetableEntryCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> TimetableEntryOut:
    _validate_entry_scope(db, school_id, payload)
    now = datetime.now(timezone.utc)
    t = TimetableEntry(
        academic_year_id=payload.academic_year_id,
        section_id=payload.section_id,
        staff_id=payload.staff_id,
        subject_id=payload.subject_id,
        time_slot_id=payload.time_slot_id,
        day_of_week=payload.day_of_week,
        room=payload.room,
        created_at=now,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _out(t)


@router.put("/{timetable_id}", response_model=TimetableEntryOut, dependencies=[Depends(require_permission("timetable:write"))])
def update_timetable_entry(
    timetable_id: uuid.UUID,
    payload: TimetableEntryUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> TimetableEntryOut:
    t = db.get(TimetableEntry, timetable_id)
    if not t:
        raise not_found("Timetable entry not found")
    year = db.get(AcademicYear, t.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Timetable entry not found")

    next_state = TimetableEntryCreate(
        academic_year_id=t.academic_year_id,
        section_id=t.section_id,
        staff_id=payload.staff_id if payload.staff_id is not None else t.staff_id,
        subject_id=payload.subject_id if payload.subject_id is not None else t.subject_id,
        time_slot_id=payload.time_slot_id if payload.time_slot_id is not None else t.time_slot_id,
        day_of_week=payload.day_of_week if payload.day_of_week is not None else t.day_of_week,
        room=payload.room if payload.room is not None else t.room,
    )
    _validate_entry_scope(db, school_id, next_state)

    t.staff_id = next_state.staff_id
    t.subject_id = next_state.subject_id
    t.time_slot_id = next_state.time_slot_id
    t.day_of_week = next_state.day_of_week
    t.room = next_state.room
    db.commit()
    return _out(t)


@router.delete("/{timetable_id}", dependencies=[Depends(require_permission("timetable:write"))])
def delete_timetable_entry(
    timetable_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    t = db.get(TimetableEntry, timetable_id)
    if not t:
        raise not_found("Timetable entry not found")
    year = db.get(AcademicYear, t.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Timetable entry not found")
    db.delete(t)
    db.commit()
    return {"status": "ok"}


@router.get("/section/{section_id}", response_model=list[TimetableEntryOut])
def get_section_timetable(section_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[TimetableEntryOut]:
    sec = db.get(Section, section_id)
    if not sec:
        raise not_found("Section not found")
    cls = db.get(SchoolClass, sec.class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Section not found")
    rows = db.execute(
        select(TimetableEntry)
        .join(AcademicYear, AcademicYear.id == TimetableEntry.academic_year_id)
        .where(AcademicYear.school_id == school_id, TimetableEntry.section_id == section_id)
        .order_by(TimetableEntry.day_of_week.asc(), TimetableEntry.created_at.asc())
    ).scalars().all()
    return [_out(t) for t in rows]


@router.get("/teacher/{staff_id}", response_model=list[TimetableEntryOut])
def get_teacher_timetable(staff_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[TimetableEntryOut]:
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    rows = db.execute(
        select(TimetableEntry)
        .join(AcademicYear, AcademicYear.id == TimetableEntry.academic_year_id)
        .where(AcademicYear.school_id == school_id, TimetableEntry.staff_id == staff_id)
        .order_by(TimetableEntry.day_of_week.asc(), TimetableEntry.created_at.asc())
    ).scalars().all()
    return [_out(t) for t in rows]


@router.get("/student/{student_id}", response_model=list[TimetableEntryOut])
def get_student_timetable(student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[TimetableEntryOut]:
    student = db.get(Student, student_id)
    if not student or student.school_id != school_id:
        raise not_found("Student not found")
    year = db.scalar(select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)))
    if not year:
        return []
    enrollment = db.scalar(select(Enrollment).where(Enrollment.student_id == student_id, Enrollment.academic_year_id == year.id))
    if not enrollment or not enrollment.section_id:
        return []
    return get_section_timetable(section_id=enrollment.section_id, db=db, school_id=school_id)


@router.post("/generate", include_in_schema=False)
def generate_timetable() -> None:
    raise not_implemented("Timetable auto-generation is not implemented yet")


@router.post("/validate", include_in_schema=False)
def validate_timetable() -> None:
    raise not_implemented("Timetable validation is not implemented yet")


@router.get("/section/{section_id}/export", include_in_schema=False)
def export_timetable() -> None:
    raise not_implemented("Timetable export is not implemented yet")


@router.post("/bulk-create", dependencies=[Depends(require_permission("timetable:write"))])
def bulk_create_timetable(
    payload: TimetableBulkCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    created = 0
    for item in payload.items:
        _validate_entry_scope(db, school_id, item)
        db.add(
            TimetableEntry(
                academic_year_id=item.academic_year_id,
                section_id=item.section_id,
                staff_id=item.staff_id,
                subject_id=item.subject_id,
                time_slot_id=item.time_slot_id,
                day_of_week=item.day_of_week,
                room=item.room,
                created_at=now,
            )
        )
        created += 1
    db.commit()
    return {"created": created}

