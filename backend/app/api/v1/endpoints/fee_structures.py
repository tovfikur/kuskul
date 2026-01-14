import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.fee_structure import FeeStructure
from app.models.school_class import SchoolClass
from app.schemas.fees import FeeStructureBulkCreate, FeeStructureCreate, FeeStructureOut, FeeStructureUpdate

router = APIRouter(dependencies=[Depends(require_permission("fee_structures:read"))])


def _out(s: FeeStructure) -> FeeStructureOut:
    return FeeStructureOut(
        id=s.id,
        academic_year_id=s.academic_year_id,
        class_id=s.class_id,
        name=s.name,
        amount=s.amount,
        due_date=s.due_date,
    )


def _validate_scope(db: Session, school_id: uuid.UUID, academic_year_id: uuid.UUID, class_id: uuid.UUID) -> None:
    year = db.get(AcademicYear, academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    cls = db.get(SchoolClass, class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Class not found")


@router.get("", response_model=list[FeeStructureOut])
def list_fee_structures(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    academic_year_id: Optional[uuid.UUID] = None,
    class_id: Optional[uuid.UUID] = None,
) -> list[FeeStructureOut]:
    q = (
        select(FeeStructure)
        .join(AcademicYear, AcademicYear.id == FeeStructure.academic_year_id)
        .where(AcademicYear.school_id == school_id)
        .order_by(FeeStructure.created_at.desc())
    )
    if academic_year_id:
        q = q.where(FeeStructure.academic_year_id == academic_year_id)
    if class_id:
        q = q.where(FeeStructure.class_id == class_id)
    rows = db.execute(q).scalars().all()
    return [_out(s) for s in rows]


@router.get("/class/{class_id}", response_model=list[FeeStructureOut])
def get_class_fee_structures(
    class_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[FeeStructureOut]:
    cls = db.get(SchoolClass, class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Class not found")
    rows = db.execute(
        select(FeeStructure)
        .join(AcademicYear, AcademicYear.id == FeeStructure.academic_year_id)
        .where(AcademicYear.school_id == school_id, FeeStructure.class_id == class_id)
        .order_by(FeeStructure.created_at.desc())
    ).scalars().all()
    return [_out(s) for s in rows]


@router.get("/{structure_id}", response_model=FeeStructureOut)
def get_fee_structure(
    structure_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> FeeStructureOut:
    s = db.get(FeeStructure, structure_id)
    if not s:
        raise not_found("Fee structure not found")
    year = db.get(AcademicYear, s.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Fee structure not found")
    return _out(s)


@router.post("", response_model=FeeStructureOut, dependencies=[Depends(require_permission("fee_structures:write"))])
def create_fee_structure(
    payload: FeeStructureCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> FeeStructureOut:
    _validate_scope(db, school_id, payload.academic_year_id, payload.class_id)
    now = datetime.now(timezone.utc)
    s = FeeStructure(
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        name=payload.name,
        amount=payload.amount,
        due_date=payload.due_date,
        created_at=now,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.put("/{structure_id}", response_model=FeeStructureOut, dependencies=[Depends(require_permission("fee_structures:write"))])
def update_fee_structure(
    structure_id: uuid.UUID,
    payload: FeeStructureUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> FeeStructureOut:
    s = db.get(FeeStructure, structure_id)
    if not s:
        raise not_found("Fee structure not found")
    year = db.get(AcademicYear, s.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Fee structure not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    return _out(s)


@router.delete("/{structure_id}", dependencies=[Depends(require_permission("fee_structures:write"))])
def delete_fee_structure(
    structure_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    s = db.get(FeeStructure, structure_id)
    if not s:
        raise not_found("Fee structure not found")
    year = db.get(AcademicYear, s.academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Fee structure not found")
    db.delete(s)
    db.commit()
    return {"status": "ok"}


@router.post("/bulk-create", dependencies=[Depends(require_permission("fee_structures:write"))])
def bulk_create_fee_structures(
    payload: FeeStructureBulkCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    created = 0
    for item in payload.items:
        _validate_scope(db, school_id, item.academic_year_id, item.class_id)
        db.add(
            FeeStructure(
                academic_year_id=item.academic_year_id,
                class_id=item.class_id,
                name=item.name,
                amount=item.amount,
                due_date=item.due_date,
                created_at=now,
            )
        )
        created += 1
    db.commit()
    return {"created": created}

