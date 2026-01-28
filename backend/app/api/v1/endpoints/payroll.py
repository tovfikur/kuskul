"""API endpoints for payroll management."""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, extract, or_
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.payroll import PayrollCycle, Payslip
from app.models.staff import Staff
from app.models.staff_extended import StaffContract, Designation
from app.models.staff_leave import StaffLeaveRequest, LeaveType
from app.models.teacher_assignment import StaffAttendance
from app.models.user import User
from app.schemas.payroll import (
    PayrollCycleCreate,
    PayrollCycleOut,
    PayrollCycleUpdate,
    PayrollCycleWithStats,
    PayrollProcessRequest,
    PayrollSendPayslipsRequest,
    PayrollSummary,
    PayslipCreate,
    PayslipMarkPaid,
    PayslipOut,
    PayslipUpdate,
    PayslipWithDetails,
)

router = APIRouter(dependencies=[Depends(require_permission("staff:read"))])


# ============================================================================
# PAYROLL CYCLES
# ============================================================================

def _cycle_out(pc: PayrollCycle) -> PayrollCycleOut:
    """Convert PayrollCycle model to output schema."""
    return PayrollCycleOut(
        id=pc.id,
        school_id=pc.school_id,
        month=pc.month,
        year=pc.year,
        status=pc.status,
        total_amount=pc.total_amount,
        processed_by_user_id=pc.processed_by_user_id,
        processed_at=pc.processed_at,
        notes=pc.notes,
        created_at=pc.created_at,
        updated_at=pc.updated_at,
    )


@router.get("/payroll/cycles", response_model=dict)
def list_payroll_cycles(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    limit: int = 20,
    year: Optional[int] = None,
    status: Optional[str] = None,
) -> dict:
    """List all payroll cycles."""
    offset = (page - 1) * limit if page > 1 else 0
    base = select(PayrollCycle).where(PayrollCycle.school_id == school_id)
    
    if year:
        base = base.where(PayrollCycle.year == year)
    if status:
        base = base.where(PayrollCycle.status == status)
    
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(
        base.order_by(PayrollCycle.year.desc(), PayrollCycle.month.desc()).offset(offset).limit(limit)
    ).scalars().all()
    
    return {
        "items": [_cycle_out(r).model_dump() for r in rows],
        "total": int(total),
        "page": page,
        "limit": limit,
    }


@router.post("/payroll/cycles", response_model=PayrollCycleOut, dependencies=[Depends(require_permission("staff:write"))])
def create_payroll_cycle(
    payload: PayrollCycleCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> PayrollCycleOut:
    """Create a new payroll cycle."""
    # Check if cycle already exists for this month/year
    existing = db.execute(
        select(PayrollCycle).where(
            PayrollCycle.school_id == school_id,
            PayrollCycle.month == payload.month,
            PayrollCycle.year == payload.year
        )
    ).scalar_one_or_none()
    
    if existing:
        raise problem(
            status_code=400,
            title="Bad Request",
            detail=f"Payroll cycle for {payload.month}/{payload.year} already exists"
        )
    
    now = datetime.now(timezone.utc)
    cycle = PayrollCycle(
        school_id=school_id,
        month=payload.month,
        year=payload.year,
        status="draft",
        total_amount=Decimal(0),
        notes=payload.notes,
        created_at=now,
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return _cycle_out(cycle)


@router.get("/payroll/cycles/{cycle_id}", response_model=PayrollCycleWithStats)
def get_payroll_cycle(
    cycle_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> PayrollCycleWithStats:
    """Get a specific payroll cycle with statistics."""
    cycle = db.get(PayrollCycle, cycle_id)
    if not cycle or cycle.school_id != school_id:
        raise not_found("Payroll cycle not found")
    
    # Get payslip stats
    payslip_count = db.scalar(
        select(func.count()).where(Payslip.payroll_cycle_id == cycle_id)
    ) or 0
    
    paid_count = db.scalar(
        select(func.count()).where(
            Payslip.payroll_cycle_id == cycle_id,
            Payslip.status == "paid"
        )
    ) or 0
    
    pending_count = payslip_count - paid_count
    
    return PayrollCycleWithStats(
        **_cycle_out(cycle).model_dump(),
        payslip_count=payslip_count,
        paid_count=paid_count,
        pending_count=pending_count,
    )


@router.patch("/payroll/cycles/{cycle_id}/process", response_model=PayrollCycleOut, dependencies=[Depends(require_permission("staff:write"))])
def process_payroll_cycle(
    cycle_id: uuid.UUID,
    payload: PayrollProcessRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> PayrollCycleOut:
    """Process a payroll cycle (generate payslips)."""
    cycle = db.get(PayrollCycle, cycle_id)
    if not cycle or cycle.school_id != school_id:
        raise not_found("Payroll cycle not found")
    
    payslip_count = db.scalar(
        select(func.count()).where(Payslip.payroll_cycle_id == cycle_id)
    ) or 0
    if cycle.status not in ["draft", "processing"] and payslip_count > 0:
        raise problem(status_code=400, title="Bad Request", detail="Cannot regenerate payslips for approved/completed cycles")
    
    # Get all staff
    staff_query = select(Staff).where(Staff.school_id == school_id)
    if not payload.include_inactive_staff:
        staff_query = staff_query.where(Staff.status == "active")
    
    staff_list = db.execute(staff_query).scalars().all()
    
    now = datetime.now(timezone.utc)
    total_amount = Decimal(0)
    
    # Determine days in month
    import calendar
    days_in_month = calendar.monthrange(cycle.year, cycle.month)[1]
    month_start = date(cycle.year, cycle.month, 1)
    month_end = date(cycle.year, cycle.month, days_in_month)

    # --- PRE-FETCH DATA FOR PERFORMANCE ---
    
    # 1. Leave Types (to identify unpaid leaves)
    leave_types = db.execute(select(LeaveType).where(LeaveType.school_id == school_id)).scalars().all()
    unpaid_leave_type_ids = {lt.id for lt in leave_types if not lt.is_paid}
    
    # 2. Attendance Records for the Month
    attendance_records = db.execute(
        select(StaffAttendance).where(
            extract('month', StaffAttendance.attendance_date) == cycle.month,
            extract('year', StaffAttendance.attendance_date) == cycle.year
        )
    ).scalars().all()
    
    attendance_by_staff = {}
    for rec in attendance_records:
        if rec.staff_id not in attendance_by_staff:
            attendance_by_staff[rec.staff_id] = []
        attendance_by_staff[rec.staff_id].append(rec)
        
    # 3. Approved Leave Requests overlapping the Month
    leave_requests = db.execute(
        select(StaffLeaveRequest).where(
            StaffLeaveRequest.status == 'approved',
            StaffLeaveRequest.start_date <= month_end,
            StaffLeaveRequest.end_date >= month_start
        )
    ).scalars().all()
    
    leaves_by_staff = {}
    for req in leave_requests:
        if req.staff_id not in leaves_by_staff:
            leaves_by_staff[req.staff_id] = []
        leaves_by_staff[req.staff_id].append(req)
    
    if payload.auto_generate_payslips:
        # First, clear existing auto-generated payslips if any (to allow regeneration)
        # For safety, only delete if status is "generated"
        db.execute(
            select(Payslip).where(
                Payslip.payroll_cycle_id == cycle_id,
                Payslip.status == "generated"
            )
        )
        # Note: Delete implementation would require a delete query, but for now we skip existing ones
        # Real implementation should probably wipe and recreate or update existing
        
        for staff in staff_list:
            # Check if payslip already exists
            existing = db.execute(
                select(Payslip).where(
                    Payslip.payroll_cycle_id == cycle_id,
                    Payslip.staff_id == staff.id
                )
            ).scalar_one_or_none()
            
            if existing:
                continue
            
            # Get active contract
            contract = db.execute(
                select(StaffContract).where(
                    StaffContract.staff_id == staff.id,
                    StaffContract.status == "active"
                ).order_by(StaffContract.start_date.desc())
            ).scalar_one_or_none()
            
            # Auto-create contract if missing (Solves 0 staff count issue)
            if not contract:
                contract = StaffContract(
                    staff_id=staff.id,
                    contract_type="permanent",
                    start_date=date.today(),
                    salary=Decimal(0),
                    salary_currency="BDT",
                    allowances={},
                    deductions={},
                    working_hours_per_week=40,
                    status="active",
                    created_at=now,
                    updated_at=now
                )
                db.add(contract)
                db.flush() # Get ID and make available
            
            # --- SALARY CALCULATION ENGINE ---
            basic_salary = contract.salary
            
            # Validation: Check against designation range
            validation_notes = []
            if staff.designation_id:
                desig = db.get(Designation, staff.designation_id)
                if desig:
                    if desig.min_salary is not None and basic_salary < desig.min_salary:
                        validation_notes.append(f"WARNING: Salary {basic_salary} is below designation minimum {desig.min_salary}")
                    if desig.max_salary is not None and basic_salary > desig.max_salary:
                        validation_notes.append(f"WARNING: Salary {basic_salary} is above designation maximum {desig.max_salary}")

            if basic_salary == 0:
                validation_notes.append("WARNING: Basic salary is 0. Please update contract.")

            # 1. Allowances (From Contract)
            # Ensure values are strings for JSON and Decimals for math
            allowances = {k: str(v) for k, v in (contract.allowances or {}).items()}
            total_allowances = sum(Decimal(v) for v in allowances.values())
            
            # 2. Attendance & Leave Calculation
            staff_attendance = attendance_by_staff.get(staff.id, [])
            staff_leaves = leaves_by_staff.get(staff.id, [])
            
            # Count attendance stats
            present_count = sum(1 for r in staff_attendance if r.status == 'present')
            late_count = sum(1 for r in staff_attendance if r.status == 'late')
            half_day_count = sum(1 for r in staff_attendance if r.status == 'half_day')
            absent_count = sum(1 for r in staff_attendance if r.status == 'absent')
            
            # Count leave stats (overlapping days)
            paid_leave_days = 0
            unpaid_leave_days = 0
            
            for req in staff_leaves:
                start = max(req.start_date, month_start)
                end = min(req.end_date, month_end)
                days = (end - start).days + 1
                if days > 0:
                    if req.leave_type_id in unpaid_leave_type_ids:
                        unpaid_leave_days += days
                    else:
                        paid_leave_days += days
            
            # 3. Calculate Deductions (From Contract + Attendance)
            deductions = {k: str(v) for k, v in (contract.deductions or {}).items()}
            
            # Deduct for explicit absence, unpaid leaves, and half-days (0.5 deduction)
            # Note: We do NOT deduct for "missing records" to avoid zero-pay bugs if attendance not filled
            deductible_days = absent_count + unpaid_leave_days + (half_day_count * 0.5)
            
            daily_rate = basic_salary / Decimal(days_in_month) if days_in_month > 0 else Decimal(0)
            attendance_deduction = round(daily_rate * Decimal(deductible_days), 2)
            
            if attendance_deduction > 0:
                deductions["Attendance/Leave Deduction"] = str(attendance_deduction)
            
            total_deductions = sum(Decimal(v) for v in deductions.values())
            
            gross_salary = basic_salary + total_allowances
            net_salary = gross_salary - total_deductions
            
            # 4. Final Stats
            working_days = days_in_month
            total_present_days = present_count + late_count + (half_day_count * 0.5) # Late counts as present for stats
            total_leave_days = paid_leave_days + unpaid_leave_days
            
            payslip = Payslip(
                payroll_cycle_id=cycle_id,
                staff_id=staff.id,
                basic_salary=basic_salary,
                allowances=allowances,
                deductions=deductions,
                gross_salary=gross_salary,
                total_deductions=total_deductions,
                net_salary=net_salary,
                working_days=working_days,
                present_days=int(total_present_days),
                leave_days=int(total_leave_days),
                payment_method="bank_transfer",
                status="generated",
                notes="\n".join(validation_notes) if validation_notes else None,
                created_at=now,
            )
            db.add(payslip)
            total_amount += net_salary
    
    cycle.status = "processing" # Represents "Generated/Reviewed" state
    cycle.total_amount = total_amount
    cycle.processed_by_user_id = user.id
    cycle.processed_at = now
    cycle.updated_at = now
    db.commit()
    db.refresh(cycle)
    return _cycle_out(cycle)


@router.patch("/payroll/cycles/{cycle_id}/approve", response_model=PayrollCycleOut, dependencies=[Depends(require_permission("staff:write"))])
def approve_payroll_cycle(
    cycle_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> PayrollCycleOut:
    """Approve a payroll cycle (locks edits, ready for payment)."""
    cycle = db.get(PayrollCycle, cycle_id)
    if not cycle or cycle.school_id != school_id:
        raise not_found("Payroll cycle not found")
    
    if cycle.status != "processing":
        raise problem(status_code=400, title="Bad Request", detail="Can only approve processed cycles")
    
    cycle.status = "approved"
    cycle.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(cycle)
    return _cycle_out(cycle)


@router.patch("/payroll/cycles/{cycle_id}/complete", response_model=PayrollCycleOut, dependencies=[Depends(require_permission("staff:write"))])
def complete_payroll_cycle(
    cycle_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> PayrollCycleOut:
    """Mark a payroll cycle as completed (archived)."""
    cycle = db.get(PayrollCycle, cycle_id)
    if not cycle or cycle.school_id != school_id:
        raise not_found("Payroll cycle not found")
    
    if cycle.status != "approved":
        raise problem(status_code=400, title="Bad Request", detail="Can only complete approved cycles")

    payslip_count = db.scalar(
        select(func.count()).where(Payslip.payroll_cycle_id == cycle_id)
    ) or 0
    if payslip_count == 0:
        raise problem(status_code=400, title="Bad Request", detail="Cannot complete cycle without payslips")
    
    # Validation: Check if all payslips are paid
    pending_count = db.scalar(
        select(func.count()).where(
            Payslip.payroll_cycle_id == cycle_id,
            Payslip.status != "paid"
        )
    ) or 0
    
    if pending_count > 0:
         raise problem(status_code=400, title="Bad Request", detail=f"Cannot complete cycle. {pending_count} payslips are still pending payment.")

    cycle.status = "completed"
    cycle.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(cycle)
    return _cycle_out(cycle)


@router.get("/payroll/cycles/{cycle_id}/payslips", response_model=dict)
def get_cycle_payslips(
    cycle_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    limit: int = 50,
) -> dict:
    """Get all payslips for a cycle."""
    cycle = db.get(PayrollCycle, cycle_id)
    if not cycle or cycle.school_id != school_id:
        raise not_found("Payroll cycle not found")
    
    offset = (page - 1) * limit if page > 1 else 0
    base = select(Payslip).where(Payslip.payroll_cycle_id == cycle_id)
    
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.offset(offset).limit(limit)).scalars().all()
    
    def _payslip_out(p: Payslip) -> dict:
        return PayslipOut(
            id=p.id,
            payroll_cycle_id=p.payroll_cycle_id,
            staff_id=p.staff_id,
            basic_salary=p.basic_salary,
            allowances=p.allowances,
            deductions=p.deductions,
            gross_salary=p.gross_salary,
            total_deductions=p.total_deductions,
            net_salary=p.net_salary,
            payment_date=p.payment_date,
            payment_method=p.payment_method,
            payment_reference=p.payment_reference,
            status=p.status,
            working_days=p.working_days,
            present_days=p.present_days,
            leave_days=p.leave_days,
            notes=p.notes,
            created_at=p.created_at,
            updated_at=p.updated_at,
        ).model_dump()
    
    return {
        "items": [_payslip_out(r) for r in rows],
        "total": int(total),
        "page": page,
        "limit": limit,
    }


@router.post("/payroll/cycles/{cycle_id}/send-payslips", dependencies=[Depends(require_permission("staff:write"))])
def send_payslips(
    cycle_id: uuid.UUID,
    payload: PayrollSendPayslipsRequest,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    """Send payslips via email (placeholder for now)."""
    cycle = db.get(PayrollCycle, cycle_id)
    if not cycle or cycle.school_id != school_id:
        raise not_found("Payroll cycle not found")
    
    # Get payslips to send
    base = select(Payslip).where(Payslip.payroll_cycle_id == cycle_id)
    
    if payload.staff_ids:
        base = base.where(Payslip.staff_id.in_(payload.staff_ids))
    
    payslips = db.execute(base).scalars().all()
    
    # Update status to sent
    now = datetime.now(timezone.utc)
    for payslip in payslips:
        if payslip.status == "generated":
            payslip.status = "sent"
            payslip.updated_at = now
    
    db.commit()
    
    return {"status": "ok", "sent": len(payslips)}


# ============================================================================
# PAYSLIPS
# ============================================================================

@router.get("/payroll/payslips/staff/{staff_id}", response_model=list[PayslipOut])
def get_staff_payslips(
    staff_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    year: Optional[int] = None,
) -> list[PayslipOut]:
    """Get all payslips for a staff member."""
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    
    base = select(Payslip).where(Payslip.staff_id == staff_id)
    
    if year:
        # Join with PayrollCycle to filter by year
        base = base.join(PayrollCycle).where(PayrollCycle.year == year)
    
    rows = db.execute(base.order_by(Payslip.created_at.desc())).scalars().all()
    
    return [
        PayslipOut(
            id=p.id,
            payroll_cycle_id=p.payroll_cycle_id,
            staff_id=p.staff_id,
            basic_salary=p.basic_salary,
            allowances=p.allowances,
            deductions=p.deductions,
            gross_salary=p.gross_salary,
            total_deductions=p.total_deductions,
            net_salary=p.net_salary,
            payment_date=p.payment_date,
            payment_method=p.payment_method,
            payment_reference=p.payment_reference,
            status=p.status,
            working_days=p.working_days,
            present_days=p.present_days,
            leave_days=p.leave_days,
            notes=p.notes,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in rows
    ]


@router.get("/payroll/payslips/{payslip_id}", response_model=PayslipOut)
def get_payslip(
    payslip_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> PayslipOut:
    """Get a specific payslip."""
    payslip = db.get(Payslip, payslip_id)
    if not payslip:
        raise not_found("Payslip not found")
    
    # Verify via cycle
    cycle = db.get(PayrollCycle, payslip.payroll_cycle_id)
    if not cycle or cycle.school_id != school_id:
        raise not_found("Payslip not found")
    
    return PayslipOut(
        id=payslip.id,
        payroll_cycle_id=payslip.payroll_cycle_id,
        staff_id=payslip.staff_id,
        basic_salary=payslip.basic_salary,
        allowances=payslip.allowances,
        deductions=payslip.deductions,
        gross_salary=payslip.gross_salary,
        total_deductions=payslip.total_deductions,
        net_salary=payslip.net_salary,
        payment_date=payslip.payment_date,
        payment_method=payslip.payment_method,
        payment_reference=payslip.payment_reference,
        status=payslip.status,
        working_days=payslip.working_days,
        present_days=payslip.present_days,
        leave_days=payslip.leave_days,
        notes=payslip.notes,
        created_at=payslip.created_at,
        updated_at=payslip.updated_at,
    )


@router.put("/payroll/payslips/{payslip_id}", response_model=PayslipOut, dependencies=[Depends(require_permission("staff:write"))])
def update_payslip(
    payslip_id: uuid.UUID,
    payload: PayslipUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> PayslipOut:
    """Update a payslip (only if not paid)."""
    payslip = db.get(Payslip, payslip_id)
    if not payslip:
        raise not_found("Payslip not found")
    
    # Verify via cycle
    cycle = db.get(PayrollCycle, payslip.payroll_cycle_id)
    if not cycle or cycle.school_id != school_id:
        raise not_found("Payslip not found")
    
    if payslip.status == "paid":
        raise problem(status_code=400, title="Bad Request", detail="Cannot update paid payslips")
    
    data = payload.model_dump(exclude_unset=True)
    if data.get("allowances") is not None:
        data["allowances"] = {k: str(v) for k, v in data["allowances"].items()}
    if data.get("deductions") is not None:
        data["deductions"] = {k: str(v) for k, v in data["deductions"].items()}
    
    # Recalculate totals if components change
    if any(k in data for k in ["basic_salary", "allowances", "deductions"]):
        basic = data.get("basic_salary", payslip.basic_salary)
        allowances = data.get("allowances", payslip.allowances)
        deductions = data.get("deductions", payslip.deductions)
        
        gross = basic + sum(Decimal(str(v)) for v in allowances.values())
        total_ded = sum(Decimal(str(v)) for v in deductions.values())
        net = gross - total_ded
        
        data["gross_salary"] = gross
        data["total_deductions"] = total_ded
        data["net_salary"] = net
    
    for k, v in data.items():
        setattr(payslip, k, v)
    
    payslip.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payslip)
    
    return PayslipOut(
        id=payslip.id,
        payroll_cycle_id=payslip.payroll_cycle_id,
        staff_id=payslip.staff_id,
        basic_salary=payslip.basic_salary,
        allowances=payslip.allowances,
        deductions=payslip.deductions,
        gross_salary=payslip.gross_salary,
        total_deductions=payslip.total_deductions,
        net_salary=payslip.net_salary,
        payment_date=payslip.payment_date,
        payment_method=payslip.payment_method,
        payment_reference=payslip.payment_reference,
        status=payslip.status,
        working_days=payslip.working_days,
        present_days=payslip.present_days,
        leave_days=payslip.leave_days,
        notes=payslip.notes,
        created_at=payslip.created_at,
        updated_at=payslip.updated_at,
    )


@router.patch("/payroll/payslips/{payslip_id}/mark-paid", response_model=PayslipOut, dependencies=[Depends(require_permission("staff:write"))])
def mark_payslip_paid(
    payslip_id: uuid.UUID,
    payload: PayslipMarkPaid,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> PayslipOut:
    """Mark a payslip as paid."""
    payslip = db.get(Payslip, payslip_id)
    if not payslip:
        raise not_found("Payslip not found")
    
    # Verify via cycle
    cycle = db.get(PayrollCycle, payslip.payroll_cycle_id)
    if not cycle or cycle.school_id != school_id:
        raise not_found("Payslip not found")
    
    if payslip.status == "paid":
        raise problem(status_code=400, title="Bad Request", detail="Payslip is already marked as paid")
    
    payslip.status = "paid"
    payslip.payment_date = payload.payment_date
    if payload.payment_reference:
        payslip.payment_reference = payload.payment_reference
    payslip.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payslip)
    
    return PayslipOut(
        id=payslip.id,
        payroll_cycle_id=payslip.payroll_cycle_id,
        staff_id=payslip.staff_id,
        basic_salary=payslip.basic_salary,
        allowances=payslip.allowances,
        deductions=payslip.deductions,
        gross_salary=payslip.gross_salary,
        total_deductions=payslip.total_deductions,
        net_salary=payslip.net_salary,
        payment_date=payslip.payment_date,
        payment_method=payslip.payment_method,
        payment_reference=payslip.payment_reference,
        status=payslip.status,
        working_days=payslip.working_days,
        present_days=payslip.present_days,
        leave_days=payslip.leave_days,
        notes=payslip.notes,
        created_at=payslip.created_at,
        updated_at=payslip.updated_at,
    )


@router.get("/payroll/payslips/{payslip_id}/pdf", include_in_schema=False)
def download_payslip_pdf(
    payslip_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    """Download payslip as PDF (placeholder)."""
    payslip = db.get(Payslip, payslip_id)
    if not payslip:
        raise not_found("Payslip not found")
    
    # Verify via cycle
    cycle = db.get(PayrollCycle, payslip.payroll_cycle_id)
    if not cycle or cycle.school_id != school_id:
        raise not_found("Payslip not found")
    
    # TODO: Implement PDF generation
    return {"status": "not_implemented", "message": "PDF generation coming soon"}
