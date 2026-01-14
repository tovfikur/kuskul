import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.discount import Discount
from app.models.student import Student
from app.models.student_discount import StudentDiscount
from app.schemas.discounts import ApplyDiscountRequest, DiscountCreate, DiscountOut, DiscountUpdate

router = APIRouter(dependencies=[Depends(require_permission("discounts:read"))])


def _out(d: Discount) -> DiscountOut:
    return DiscountOut(id=d.id, school_id=d.school_id, name=d.name, discount_type=d.discount_type, value=d.value, description=d.description)


@router.get("", response_model=list[DiscountOut])
def list_discounts(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[DiscountOut]:
    rows = db.execute(select(Discount).where(Discount.school_id == school_id).order_by(Discount.created_at.desc())).scalars().all()
    return [_out(d) for d in rows]


@router.get("/{discount_id}", response_model=DiscountOut)
def get_discount(discount_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> DiscountOut:
    d = db.get(Discount, discount_id)
    if not d or d.school_id != school_id:
        raise not_found("Discount not found")
    return _out(d)


@router.post("", response_model=DiscountOut, dependencies=[Depends(require_permission("discounts:write"))])
def create_discount(payload: DiscountCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> DiscountOut:
    if payload.discount_type not in {"percent", "fixed"}:
        raise problem(status_code=400, title="Bad Request", detail="discount_type must be percent or fixed")
    now = datetime.now(timezone.utc)
    d = Discount(school_id=school_id, name=payload.name, discount_type=payload.discount_type, value=payload.value, description=payload.description, created_at=now)
    db.add(d)
    db.commit()
    db.refresh(d)
    return _out(d)


@router.put("/{discount_id}", response_model=DiscountOut, dependencies=[Depends(require_permission("discounts:write"))])
def update_discount(
    discount_id: uuid.UUID, payload: DiscountUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> DiscountOut:
    d = db.get(Discount, discount_id)
    if not d or d.school_id != school_id:
        raise not_found("Discount not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(d, k, v)
    if d.discount_type not in {"percent", "fixed"}:
        raise problem(status_code=400, title="Bad Request", detail="discount_type must be percent or fixed")
    db.commit()
    return _out(d)


@router.delete("/{discount_id}", dependencies=[Depends(require_permission("discounts:write"))])
def delete_discount(discount_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    d = db.get(Discount, discount_id)
    if not d or d.school_id != school_id:
        raise not_found("Discount not found")
    db.delete(d)
    db.commit()
    return {"status": "ok"}


@router.post("/apply", dependencies=[Depends(require_permission("discounts:write"))])
def apply_discount(
    payload: ApplyDiscountRequest, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    student = db.get(Student, payload.student_id)
    if not student or student.school_id != school_id:
        raise not_found("Student not found")
    d = db.get(Discount, payload.discount_id)
    if not d or d.school_id != school_id:
        raise not_found("Discount not found")
    link = db.get(StudentDiscount, {"student_id": payload.student_id, "discount_id": payload.discount_id})
    if link:
        raise problem(status_code=409, title="Conflict", detail="Discount already applied")
    now = datetime.now(timezone.utc)
    db.add(StudentDiscount(student_id=payload.student_id, discount_id=payload.discount_id, created_at=now))
    db.commit()
    return {"status": "ok"}


@router.delete("/remove/{student_id}", dependencies=[Depends(require_permission("discounts:write"))])
def remove_discount(student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    student = db.get(Student, student_id)
    if not student or student.school_id != school_id:
        raise not_found("Student not found")
    rows = db.execute(select(StudentDiscount).where(StudentDiscount.student_id == student_id)).scalars().all()
    for r in rows:
        db.delete(r)
    db.commit()
    return {"status": "ok"}

