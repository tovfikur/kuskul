import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.academic_calendar_settings import AcademicCalendarSettings
from app.models.academic_year import AcademicYear
from app.schemas.academic_calendar_settings import AcademicCalendarSettingsOut, AcademicCalendarSettingsUpsert

router = APIRouter(dependencies=[Depends(require_permission("academic:read"))])


def _out(s: AcademicCalendarSettings) -> AcademicCalendarSettingsOut:
    return AcademicCalendarSettingsOut(
        id=s.id,
        academic_year_id=s.academic_year_id,
        working_days_mask=s.working_days_mask,
        shift=s.shift,
    )


@router.get("/{academic_year_id}", response_model=AcademicCalendarSettingsOut)
def get_settings(
    academic_year_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> AcademicCalendarSettingsOut:
    year = db.get(AcademicYear, academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    s = db.scalar(select(AcademicCalendarSettings).where(AcademicCalendarSettings.academic_year_id == academic_year_id))
    if not s:
        now = datetime.now(timezone.utc)
        s = AcademicCalendarSettings(academic_year_id=academic_year_id, created_at=now)
        db.add(s)
        db.commit()
        db.refresh(s)
    return _out(s)


@router.put("/{academic_year_id}", response_model=AcademicCalendarSettingsOut, dependencies=[Depends(require_permission("academic:write"))])
def upsert_settings(
    academic_year_id: uuid.UUID,
    payload: AcademicCalendarSettingsUpsert,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> AcademicCalendarSettingsOut:
    year = db.get(AcademicYear, academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    s = db.scalar(select(AcademicCalendarSettings).where(AcademicCalendarSettings.academic_year_id == academic_year_id))
    if not s:
        now = datetime.now(timezone.utc)
        s = AcademicCalendarSettings(
            academic_year_id=academic_year_id,
            working_days_mask=payload.working_days_mask,
            shift=payload.shift,
            created_at=now,
        )
        db.add(s)
        db.commit()
        db.refresh(s)
        return _out(s)
    s.working_days_mask = payload.working_days_mask
    s.shift = payload.shift
    db.commit()
    return _out(s)

