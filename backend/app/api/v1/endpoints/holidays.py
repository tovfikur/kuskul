import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import extract, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented
from app.db.session import get_db
from app.models.holiday import Holiday
from app.schemas.holidays import HolidayCreate, HolidayOut, HolidayUpdate

router = APIRouter(dependencies=[Depends(require_permission("holidays:read"))])


def _out(h: Holiday) -> HolidayOut:
    return HolidayOut(id=h.id, school_id=h.school_id, holiday_date=h.holiday_date, name=h.name, holiday_type=h.holiday_type, description=h.description)


@router.get("", response_model=list[HolidayOut])
def list_holidays(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[HolidayOut]:
    q = select(Holiday).where(Holiday.school_id == school_id).order_by(Holiday.holiday_date.asc())
    if year:
        q = q.where(extract("year", Holiday.holiday_date) == year)
    rows = db.execute(q).scalars().all()
    return [_out(h) for h in rows]


@router.get("/{holiday_id}", response_model=HolidayOut)
def get_holiday(holiday_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> HolidayOut:
    h = db.get(Holiday, holiday_id)
    if not h or h.school_id != school_id:
        raise not_found("Holiday not found")
    return _out(h)


@router.post("", response_model=HolidayOut, dependencies=[Depends(require_permission("holidays:write"))])
def create_holiday(payload: HolidayCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> HolidayOut:
    now = datetime.now(timezone.utc)
    h = Holiday(
        school_id=school_id,
        holiday_date=payload.holiday_date,
        name=payload.name,
        holiday_type=payload.holiday_type,
        description=payload.description,
        created_at=now,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return _out(h)


@router.put("/{holiday_id}", response_model=HolidayOut, dependencies=[Depends(require_permission("holidays:write"))])
def update_holiday(
    holiday_id: uuid.UUID, payload: HolidayUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> HolidayOut:
    h = db.get(Holiday, holiday_id)
    if not h or h.school_id != school_id:
        raise not_found("Holiday not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(h, k, v)
    db.commit()
    return _out(h)


@router.delete("/{holiday_id}", dependencies=[Depends(require_permission("holidays:write"))])
def delete_holiday(holiday_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    h = db.get(Holiday, holiday_id)
    if not h or h.school_id != school_id:
        raise not_found("Holiday not found")
    db.delete(h)
    db.commit()
    return {"status": "ok"}


@router.post("/bulk-import", include_in_schema=False, dependencies=[Depends(require_permission("holidays:write"))])
def bulk_import_holidays(file: UploadFile = File(...)) -> None:
    raise not_implemented("Holiday bulk import is not implemented yet")

