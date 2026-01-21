import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented
from app.db.session import get_db
from app.models.academic_year import AcademicYear
from app.models.discount import Discount
from app.models.enrollment import Enrollment
from app.models.fee_due import FeeDue
from app.models.fee_payment import FeePayment
from app.models.fee_structure import FeeStructure
from app.models.school_class import SchoolClass
from app.models.student import Student
from app.models.student_discount import StudentDiscount
from app.schemas.fees import FeeDueOut

router = APIRouter(dependencies=[Depends(require_permission("fee_dues:read"))])


def _out(d: FeeDue) -> FeeDueOut:
    return FeeDueOut(
        id=d.id,
        student_id=d.student_id,
        academic_year_id=d.academic_year_id,
        total_fee=d.total_fee,
        discount_amount=d.discount_amount,
        paid_amount=d.paid_amount,
        due_amount=d.due_amount,
        status=d.status,
        last_calculated_date=d.last_calculated_date,
    )


def _effective_paid(db: Session, student_id: uuid.UUID, academic_year_id: uuid.UUID) -> int:
    payments = db.execute(
        select(FeePayment.amount, FeePayment.is_refund).where(
            FeePayment.student_id == student_id, FeePayment.academic_year_id == academic_year_id
        )
    ).all()
    total = 0
    for amount, is_refund in payments:
        total += (-amount if is_refund else amount)
    return total


def _discount_amount(db: Session, school_id: uuid.UUID, student_id: uuid.UUID, total_fee: int) -> int:
    links = db.execute(select(StudentDiscount).where(StudentDiscount.student_id == student_id)).scalars().all()
    total_discount = 0
    for link in links:
        d = db.get(Discount, link.discount_id)
        if not d or d.school_id != school_id:
            continue
        if d.discount_type == "percent":
            total_discount += int(total_fee * (float(d.value) / 100.0))
        else:
            total_discount += int(d.value)
    if total_discount > total_fee:
        total_discount = total_fee
    return total_discount


def _compute_total_fee(db: Session, school_id: uuid.UUID, academic_year_id: uuid.UUID, class_id: uuid.UUID) -> int:
    year = db.get(AcademicYear, academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")
    cls = db.get(SchoolClass, class_id)
    if not cls or cls.school_id != school_id:
        raise not_found("Class not found")
    total_fee = db.scalar(
        select(func.coalesce(func.sum(FeeStructure.amount), 0)).where(
            FeeStructure.academic_year_id == academic_year_id, FeeStructure.class_id == class_id
        )
    ) or 0
    return int(total_fee)


@router.get("", response_model=list[FeeDueOut])
def list_dues(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    academic_year_id: Optional[uuid.UUID] = None,
    class_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
) -> list[FeeDueOut]:
    q = (
        select(FeeDue)
        .join(Student, Student.id == FeeDue.student_id)
        .where(Student.school_id == school_id)
        .order_by(FeeDue.updated_at.desc())
    )
    if academic_year_id:
        q = q.where(FeeDue.academic_year_id == academic_year_id)
    if status:
        q = q.where(FeeDue.status == status)
    if class_id:
        q = (
            q.join(
                Enrollment,
                (Enrollment.student_id == Student.id)
                & (Enrollment.academic_year_id == FeeDue.academic_year_id)
                & (Enrollment.status == "active"),
            )
            .where(Enrollment.class_id == class_id)
            .distinct()
        )
    rows = db.execute(q).scalars().all()
    return [_out(d) for d in rows]


@router.get("/student/{student_id}", response_model=list[FeeDueOut])
def get_student_dues(
    student_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[FeeDueOut]:
    student = db.get(Student, student_id)
    if not student or student.school_id != school_id:
        raise not_found("Student not found")
    rows = db.execute(select(FeeDue).where(FeeDue.student_id == student_id).order_by(FeeDue.updated_at.desc())).scalars().all()
    return [_out(d) for d in rows]


@router.get("/overdue", response_model=list[FeeDueOut])
def get_overdue_fees(db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> list[FeeDueOut]:
    rows = db.execute(
        select(FeeDue)
        .join(Student, Student.id == FeeDue.student_id)
        .where(Student.school_id == school_id, FeeDue.status == "overdue")
        .order_by(FeeDue.due_amount.desc())
    ).scalars().all()
    return [_out(d) for d in rows]


@router.post("/calculate", dependencies=[Depends(require_permission("fee_dues:write"))])
def calculate_dues(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    academic_year_id: Optional[uuid.UUID] = None,
) -> dict[str, int]:
    if academic_year_id is None:
        year = db.scalar(select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True)))
        if not year:
            raise not_found("No current academic year")
        academic_year_id = year.id
    year = db.get(AcademicYear, academic_year_id)
    if not year or year.school_id != school_id:
        raise not_found("Academic year not found")

    enrollments = db.execute(
        select(Enrollment).where(Enrollment.academic_year_id == academic_year_id, Enrollment.status == "active")
    ).scalars().all()
    now = datetime.now(timezone.utc)
    today = date.today()
    updated = 0
    for enr in enrollments:
        student = db.get(Student, enr.student_id)
        if not student or student.school_id != school_id:
            continue
        total_fee = _compute_total_fee(db, school_id, academic_year_id, enr.class_id)
        discount_amount = _discount_amount(db, school_id, student.id, total_fee)
        paid_amount = _effective_paid(db, student.id, academic_year_id)
        due_amount = max(total_fee - discount_amount - paid_amount, 0)
        status = "paid" if due_amount == 0 else ("partial" if paid_amount > 0 else "due")
        if due_amount > 0:
            has_due_date = db.scalar(
                select(func.count())
                .select_from(FeeStructure)
                .where(
                    FeeStructure.academic_year_id == academic_year_id,
                    FeeStructure.class_id == enr.class_id,
                    FeeStructure.due_date.is_not(None),
                    FeeStructure.due_date < today,
                )
            )
            if has_due_date:
                status = "overdue"
        existing = db.scalar(select(FeeDue).where(FeeDue.student_id == student.id, FeeDue.academic_year_id == academic_year_id))
        if existing:
            existing.total_fee = total_fee
            existing.discount_amount = discount_amount
            existing.paid_amount = paid_amount
            existing.due_amount = due_amount
            existing.status = status
            existing.last_calculated_date = today
            existing.updated_at = now
        else:
            db.add(
                FeeDue(
                    student_id=student.id,
                    academic_year_id=academic_year_id,
                    total_fee=total_fee,
                    discount_amount=discount_amount,
                    paid_amount=paid_amount,
                    due_amount=due_amount,
                    status=status,
                    last_calculated_date=today,
                    updated_at=now,
                )
            )
        updated += 1
    db.commit()
    return {"updated": updated}


@router.post("/send-reminders", include_in_schema=False)
def send_fee_reminders() -> None:
    raise not_implemented("Fee reminders are not implemented yet")


@router.get("/statistics")
def get_fee_statistics(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    academic_year_id: Optional[uuid.UUID] = None,
) -> dict[str, int]:
    due_q = (
        select(func.coalesce(func.sum(FeeDue.due_amount), 0))
        .join(Student, Student.id == FeeDue.student_id)
        .where(Student.school_id == school_id)
    )
    paid_q = (
        select(func.coalesce(func.sum(FeeDue.paid_amount), 0))
        .join(Student, Student.id == FeeDue.student_id)
        .where(Student.school_id == school_id)
    )
    if academic_year_id:
        due_q = due_q.where(FeeDue.academic_year_id == academic_year_id)
        paid_q = paid_q.where(FeeDue.academic_year_id == academic_year_id)

    total_due = db.scalar(
        due_q
    ) or 0
    total_paid = db.scalar(paid_q) or 0
    return {"due": int(total_due), "paid": int(total_paid)}


@router.get("/defaulters", response_model=list[FeeDueOut])
def get_fee_defaulters(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    academic_year_id: Optional[uuid.UUID] = None,
) -> list[FeeDueOut]:
    q = (
        select(FeeDue)
        .join(Student, Student.id == FeeDue.student_id)
        .where(Student.school_id == school_id, FeeDue.due_amount > 0)
        .order_by(FeeDue.due_amount.desc())
    )
    if academic_year_id:
        q = q.where(FeeDue.academic_year_id == academic_year_id)
    rows = db.execute(q).scalars().all()
    return [_out(d) for d in rows]

