import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, update, delete
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.academic_calendar_settings import AcademicCalendarSettings
from app.models.academic_year import AcademicYear
from app.models.curriculum_unit import CurriculumUnit
from app.models.enrollment import Enrollment
from app.models.exam import Exam
from app.models.fee_due import FeeDue
from app.models.fee_payment import FeePayment
from app.models.fee_structure import FeeStructure
from app.models.teacher_assignment import TeacherAssignment
from app.models.term import Term
from app.models.timetable_entry import TimetableEntry
from app.schemas.academic_years import AcademicYearCreate, AcademicYearOut, AcademicYearUpdate

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_permission("academic:read"))])


def _to_out(row: AcademicYear) -> AcademicYearOut:
    return AcademicYearOut(
        id=row.id,
        school_id=row.school_id,
        name=row.name,
        start_date=row.start_date,
        end_date=row.end_date,
        is_current=row.is_current,
    )


@router.get("", response_model=list[AcademicYearOut])
def list_academic_years(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[AcademicYearOut]:
    years = db.execute(
        select(AcademicYear).where(AcademicYear.school_id == school_id).order_by(AcademicYear.start_date.desc())
    ).scalars().all()
    return [_to_out(y) for y in years]


@router.get("/current", response_model=AcademicYearOut)
def get_current_academic_year(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> AcademicYearOut:
    year = db.scalar(
        select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True))
    )
    if not year:
        raise not_found("No current academic year")
    return _to_out(year)


@router.get("/{year_id}", response_model=AcademicYearOut)
def get_academic_year(year_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> AcademicYearOut:
    year = db.get(AcademicYear, year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    return _to_out(year)


@router.post("", response_model=AcademicYearOut, dependencies=[Depends(require_permission("academic:write"))])
def create_academic_year(
    payload: AcademicYearCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> AcademicYearOut:
    if payload.end_date < payload.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")

    now = datetime.now(timezone.utc)
    year = AcademicYear(
        school_id=school_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_current=payload.is_current,
        created_at=now,
    )
    db.add(year)
    db.flush()

    if payload.is_current:
        db.execute(
            update(AcademicYear)
            .where(AcademicYear.school_id == school_id, AcademicYear.id != year.id)
            .values(is_current=False)
        )
    db.commit()
    return _to_out(year)


@router.put("/{year_id}", response_model=AcademicYearOut, dependencies=[Depends(require_permission("academic:write"))])
def update_academic_year(
    year_id: uuid.UUID,
    payload: AcademicYearUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> AcademicYearOut:
    year = db.get(AcademicYear, year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    if payload.name is not None:
        year.name = payload.name
    if payload.start_date is not None:
        year.start_date = payload.start_date
    if payload.end_date is not None:
        year.end_date = payload.end_date
    if year.end_date < year.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    db.commit()
    return _to_out(year)


@router.delete("/{year_id}", dependencies=[Depends(require_permission("academic:write"))])
def delete_academic_year(year_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    year = db.get(AcademicYear, year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")

    # Automatically delete associated calendar settings as they are auto-created and shouldn't block deletion
    db.execute(delete(AcademicCalendarSettings).where(AcademicCalendarSettings.academic_year_id == year_id))

    if db.execute(select(Term).where(Term.academic_year_id == year_id).limit(1)).scalar_one_or_none():
        logger.warning(f"Delete academic year {year_id} failed: Associated terms found.")
        raise problem(status_code=409, title="Conflict", detail="Cannot delete academic year: It has associated terms.")

    if db.execute(select(Enrollment).where(Enrollment.academic_year_id == year_id).limit(1)).scalar_one_or_none():
        logger.warning(f"Delete academic year {year_id} failed: Associated enrollments found.")
        raise problem(status_code=409, title="Conflict", detail="Cannot delete academic year: It has associated enrollments.")

    if db.execute(select(Exam).where(Exam.academic_year_id == year_id).limit(1)).scalar_one_or_none():
        logger.warning(f"Delete academic year {year_id} failed: Associated exams found.")
        raise problem(status_code=409, title="Conflict", detail="Cannot delete academic year: It has associated exams.")

    if db.execute(select(CurriculumUnit).where(CurriculumUnit.academic_year_id == year_id).limit(1)).scalar_one_or_none():
        logger.warning(f"Delete academic year {year_id} failed: Associated curriculum units found.")
        raise problem(status_code=409, title="Conflict", detail="Cannot delete academic year: It has associated curriculum units.")

    if db.execute(select(FeeStructure).where(FeeStructure.academic_year_id == year_id).limit(1)).scalar_one_or_none():
        logger.warning(f"Delete academic year {year_id} failed: Associated fee structures found.")
        raise problem(status_code=409, title="Conflict", detail="Cannot delete academic year: It has associated fee structures.")

    if db.execute(select(FeeDue).where(FeeDue.academic_year_id == year_id).limit(1)).scalar_one_or_none():
        logger.warning(f"Delete academic year {year_id} failed: Associated fee dues found.")
        raise problem(status_code=409, title="Conflict", detail="Cannot delete academic year: It has associated fee dues.")

    if db.execute(select(FeePayment).where(FeePayment.academic_year_id == year_id).limit(1)).scalar_one_or_none():
        logger.warning(f"Delete academic year {year_id} failed: Associated fee payments found.")
        raise problem(status_code=409, title="Conflict", detail="Cannot delete academic year: It has associated fee payments.")

    if db.execute(select(TeacherAssignment).where(TeacherAssignment.academic_year_id == year_id).limit(1)).scalar_one_or_none():
        logger.warning(f"Delete academic year {year_id} failed: Associated teacher assignments found.")
        raise problem(status_code=409, title="Conflict", detail="Cannot delete academic year: It has associated teacher assignments.")

    if db.execute(select(TimetableEntry).where(TimetableEntry.academic_year_id == year_id).limit(1)).scalar_one_or_none():
        logger.warning(f"Delete academic year {year_id} failed: Associated timetable entries found.")
        raise problem(status_code=409, title="Conflict", detail="Cannot delete academic year: It has associated timetable entries.")

    db.delete(year)
    db.commit()
    return {"status": "ok"}


@router.patch("/{year_id}/set-current", response_model=AcademicYearOut, dependencies=[Depends(require_permission("academic:write"))])
def set_current_academic_year(
    year_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> AcademicYearOut:
    year = db.get(AcademicYear, year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    db.execute(update(AcademicYear).where(AcademicYear.school_id == school_id).values(is_current=False))
    year.is_current = True
    db.commit()
    return _to_out(year)

