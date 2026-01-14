import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented
from app.db.session import get_db
from app.models.school_class import SchoolClass
from app.models.section import Section
from app.schemas.sections import SectionCreate, SectionOut, SectionUpdate

router = APIRouter(dependencies=[Depends(require_permission("academic:read"))])


def _out(s: Section) -> SectionOut:
    return SectionOut(id=s.id, class_id=s.class_id, name=s.name, capacity=s.capacity, room_number=s.room_number)


@router.get("", response_model=list[SectionOut])
def list_sections(
    class_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[SectionOut]:
    q = select(Section).join(SchoolClass, SchoolClass.id == Section.class_id).where(SchoolClass.school_id == school_id)
    if class_id:
        q = q.where(Section.class_id == class_id)
    sections = db.execute(q.order_by(Section.name.asc())).scalars().all()
    return [_out(s) for s in sections]


@router.get("/{section_id}", response_model=SectionOut)
def get_section(section_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> SectionOut:
    s = db.get(Section, section_id)
    if not s:
        raise not_found("Section not found")
    c = db.get(SchoolClass, s.class_id)
    if not c or c.school_id != school_id:
        raise not_found("Section not found")
    return _out(s)


@router.post("", response_model=SectionOut, dependencies=[Depends(require_permission("academic:write"))])
def create_section(payload: SectionCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> SectionOut:
    c = db.get(SchoolClass, payload.class_id)
    if not c or c.school_id != school_id:
        raise not_found("Class not found")
    now = datetime.now(timezone.utc)
    s = Section(class_id=payload.class_id, name=payload.name, capacity=payload.capacity, room_number=payload.room_number, created_at=now)
    db.add(s)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.put("/{section_id}", response_model=SectionOut, dependencies=[Depends(require_permission("academic:write"))])
def update_section(
    section_id: uuid.UUID, payload: SectionUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> SectionOut:
    s = db.get(Section, section_id)
    if not s:
        raise not_found("Section not found")
    c = db.get(SchoolClass, s.class_id)
    if not c or c.school_id != school_id:
        raise not_found("Section not found")
    if payload.name is not None:
        s.name = payload.name
    if payload.capacity is not None:
        s.capacity = payload.capacity
    if payload.room_number is not None:
        s.room_number = payload.room_number
    db.commit()
    return _out(s)


@router.delete("/{section_id}", dependencies=[Depends(require_permission("academic:write"))])
def delete_section(section_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    s = db.get(Section, section_id)
    if not s:
        raise not_found("Section not found")
    c = db.get(SchoolClass, s.class_id)
    if not c or c.school_id != school_id:
        raise not_found("Section not found")
    db.delete(s)
    db.commit()
    return {"status": "ok"}


@router.get("/{section_id}/students", include_in_schema=False)
def get_section_students() -> None:
    raise not_implemented("Students are not implemented yet")


@router.get("/{section_id}/timetable", include_in_schema=False)
def get_section_timetable() -> None:
    raise not_implemented("Timetable is not implemented yet")


@router.get("/{section_id}/teachers", include_in_schema=False)
def get_section_teachers() -> None:
    raise not_implemented("Teachers are not implemented yet")

