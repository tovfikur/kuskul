import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.fee_payment import FeePayment
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.schemas.fees import FeeCollect, FeePaymentOut, FeePaymentUpdate

router = APIRouter(dependencies=[Depends(require_permission("fee_payments:read"))])


def _out(p: FeePayment) -> FeePaymentOut:
    return FeePaymentOut(
        id=p.id,
        student_id=p.student_id,
        academic_year_id=p.academic_year_id,
        payment_date=p.payment_date,
        amount=p.amount,
        payment_method=p.payment_method,
        reference=p.reference,
        is_refund=p.is_refund,
    )


def _validate_scope(db: Session, school_id: uuid.UUID, student_id: uuid.UUID, academic_year_id: uuid.UUID) -> None:
    student = db.get(Student, student_id)
    if not student or student.school_id != school_id:
        raise not_found("Student not found")
    year = db.get(AcademicYear, academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")


@router.get("", response_model=list[FeePaymentOut])
def list_payments(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    student_id: Optional[uuid.UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    payment_method: Optional[str] = None,
) -> list[FeePaymentOut]:
    q = (
        select(FeePayment)
        .join(Student, Student.id == FeePayment.student_id)
        .where(Student.school_id == school_id)
        .order_by(FeePayment.payment_date.desc(), FeePayment.created_at.desc())
    )
    if student_id:
        q = q.where(FeePayment.student_id == student_id)
    if start_date:
        q = q.where(FeePayment.payment_date >= start_date)
    if end_date:
        q = q.where(FeePayment.payment_date <= end_date)
    if payment_method:
        q = q.where(FeePayment.payment_method == payment_method)
    rows = db.execute(q).scalars().all()
    return [_out(p) for p in rows]


@router.get("/student/{student_id}", response_model=list[FeePaymentOut])
def get_student_payments(
    student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[FeePaymentOut]:
    student = db.get(Student, student_id)
    if not student or student.school_id != school_id:
        raise not_found("Student not found")
    rows = db.execute(select(FeePayment).where(FeePayment.student_id == student_id).order_by(FeePayment.payment_date.desc())).scalars().all()
    return [_out(p) for p in rows]


@router.get("/daily-collection")
def get_daily_collection(
    collection_date: date, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, int]:
    total = db.scalar(
        select(func.coalesce(func.sum(FeePayment.amount), 0))
        .join(Student, Student.id == FeePayment.student_id)
        .where(Student.school_id == school_id, FeePayment.payment_date == collection_date, FeePayment.is_refund.is_(False))
    ) or 0
    refunds = db.scalar(
        select(func.coalesce(func.sum(FeePayment.amount), 0))
        .join(Student, Student.id == FeePayment.student_id)
        .where(Student.school_id == school_id, FeePayment.payment_date == collection_date, FeePayment.is_refund.is_(True))
    ) or 0
    return {"collected": int(total), "refunded": int(refunds), "net": int(total - refunds)}


@router.get("/receipt/{payment_id}", include_in_schema=False)
def get_payment_receipt(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StreamingResponse:
    p = db.get(FeePayment, payment_id)
    if not p:
        raise not_found("Payment not found")
    s = db.get(Student, p.student_id)
    if not s or s.school_id != school_id:
        raise not_found("Payment not found")
    content = f"Receipt\nPayment ID: {p.id}\nStudent: {s.id}\nDate: {p.payment_date}\nAmount: {p.amount}\nMethod: {p.payment_method or ''}\nReference: {p.reference or ''}\n".encode(
        "utf-8"
    )
    headers = {"Content-Disposition": f'attachment; filename="receipt_{p.id}.txt"'}
    return StreamingResponse(iter([content]), media_type="text/plain", headers=headers)


@router.post("/collect", response_model=FeePaymentOut, dependencies=[Depends(require_permission("fee_payments:write"))])
def collect_fee(payload: FeeCollect, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> FeePaymentOut:
    _validate_scope(db, school_id, payload.student_id, payload.academic_year_id)
    now = datetime.now(timezone.utc)
    p = FeePayment(
        student_id=payload.student_id,
        academic_year_id=payload.academic_year_id,
        payment_date=payload.payment_date,
        amount=payload.amount,
        payment_method=payload.payment_method,
        reference=payload.reference,
        is_refund=False,
        created_at=now,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _out(p)


@router.post("/refund/{payment_id}", dependencies=[Depends(require_permission("fee_payments:write"))])
def refund_payment(payment_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    p = db.get(FeePayment, payment_id)
    if not p:
        raise not_found("Payment not found")
    student = db.get(Student, p.student_id)
    if not student or student.school_id != school_id:
        raise not_found("Payment not found")
    if p.is_refund:
        return {"status": "ok"}
    now = datetime.now(timezone.utc)
    db.add(
        FeePayment(
            student_id=p.student_id,
            academic_year_id=p.academic_year_id,
            payment_date=date.today(),
            amount=p.amount,
            payment_method=p.payment_method,
            reference=f"refund:{p.id}",
            is_refund=True,
            created_at=now,
        )
    )
    db.commit()
    return {"status": "ok"}


@router.get("/{payment_id}", response_model=FeePaymentOut)
def get_payment(payment_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> FeePaymentOut:
    p = db.get(FeePayment, payment_id)
    if not p:
        raise not_found("Payment not found")
    student = db.get(Student, p.student_id)
    if not student or student.school_id != school_id:
        raise not_found("Payment not found")
    return _out(p)


@router.put("/{payment_id}", response_model=FeePaymentOut, dependencies=[Depends(require_permission("fee_payments:write"))])
def update_payment(
    payment_id: uuid.UUID, payload: FeePaymentUpdate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> FeePaymentOut:
    p = db.get(FeePayment, payment_id)
    if not p:
        raise not_found("Payment not found")
    student = db.get(Student, p.student_id)
    if not student or student.school_id != school_id:
        raise not_found("Payment not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(p, k, v)
    db.commit()
    return _out(p)


@router.delete("/{payment_id}", dependencies=[Depends(require_permission("fee_payments:write"))])
def delete_payment(payment_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> dict[str, str]:
    p = db.get(FeePayment, payment_id)
    if not p:
        raise not_found("Payment not found")
    student = db.get(Student, p.student_id)
    if not student or student.school_id != school_id:
        raise not_found("Payment not found")
    db.delete(p)
    db.commit()
    return {"status": "ok"}

