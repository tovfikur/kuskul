"""API endpoints for staff leave management."""
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, get_current_user, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.staff import Staff
from app.models.staff_leave import LeaveBalance, LeaveType, StaffLeaveRequest
from app.models.user import User
from app.schemas.staff_leave import (
    LeaveBalanceCreate,
    LeaveBalanceInitialize,
    LeaveBalanceOut,
    LeaveBalanceUpdate,
    LeaveBalanceWithType,
    LeaveCalendarEntry,
    LeaveTypeCreate,
    LeaveTypeOut,
    LeaveTypeUpdate,
    StaffLeaveRequestApprove,
    StaffLeaveRequestCreate,
    StaffLeaveRequestOut,
    StaffLeaveRequestReject,
    StaffLeaveRequestUpdate,
    StaffLeaveRequestWithDetails,
)

router = APIRouter(dependencies=[Depends(require_permission("staff:read"))])


# ============================================================================
# LEAVE TYPES
# ============================================================================

def _leave_type_out(lt: LeaveType) -> LeaveTypeOut:
    """Convert LeaveType model to output schema."""
    return LeaveTypeOut(
        id=lt.id,
        school_id=lt.school_id,
        name=lt.name,
        code=lt.code,
        days_per_year=lt.days_per_year,
        requires_approval=lt.requires_approval,
        max_consecutive_days=lt.max_consecutive_days,
        is_paid=lt.is_paid,
        color=lt.color,
        description=lt.description,
        is_active=lt.is_active,
        created_at=lt.created_at,
        updated_at=lt.updated_at,
    )


@router.get("/leave/types", response_model=list[LeaveTypeOut])
def list_leave_types(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    is_active: Optional[bool] = None,
) -> list[LeaveTypeOut]:
    """List all leave types."""
    base = select(LeaveType).where(LeaveType.school_id == school_id)
    
    if is_active is not None:
        base = base.where(LeaveType.is_active == is_active)
    
    rows = db.execute(base.order_by(LeaveType.name.asc())).scalars().all()
    return [_leave_type_out(r) for r in rows]


@router.post("/leave/types", response_model=LeaveTypeOut, dependencies=[Depends(require_permission("staff:write"))])
def create_leave_type(
    payload: LeaveTypeCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> LeaveTypeOut:
    """Create a new leave type."""
    # Check if code already exists
    existing = db.execute(
        select(LeaveType).where(
            LeaveType.school_id == school_id,
            LeaveType.code == payload.code
        )
    ).scalar_one_or_none()
    
    if existing:
        raise problem(status_code=400, title="Bad Request", detail=f"Leave type code '{payload.code}' already exists")
    
    now = datetime.now(timezone.utc)
    lt = LeaveType(
        school_id=school_id,
        name=payload.name,
        code=payload.code,
        days_per_year=payload.days_per_year,
        requires_approval=payload.requires_approval,
        max_consecutive_days=payload.max_consecutive_days,
        is_paid=payload.is_paid,
        color=payload.color,
        description=payload.description,
        is_active=payload.is_active,
        created_at=now,
    )
    db.add(lt)
    db.commit()
    db.refresh(lt)
    return _leave_type_out(lt)


@router.put("/leave/types/{leave_type_id}", response_model=LeaveTypeOut, dependencies=[Depends(require_permission("staff:write"))])
def update_leave_type(
    leave_type_id: uuid.UUID,
    payload: LeaveTypeUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> LeaveTypeOut:
    """Update a leave type."""
    lt = db.get(LeaveType, leave_type_id)
    if not lt or lt.school_id != school_id:
        raise not_found("Leave type not found")
    
    data = payload.model_dump(exclude_unset=True)
    
    # Check if code is being changed and if it conflicts
    if "code" in data and data["code"] != lt.code:
        existing = db.execute(
            select(LeaveType).where(
                LeaveType.school_id == school_id,
                LeaveType.code == data["code"],
                LeaveType.id != leave_type_id
            )
        ).scalar_one_or_none()
        
        if existing:
            raise problem(status_code=400, title="Bad Request", detail=f"Leave type code '{data['code']}' already exists")
    
    for k, v in data.items():
        setattr(lt, k, v)
    
    lt.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lt)
    return _leave_type_out(lt)


@router.delete("/leave/types/{leave_type_id}", dependencies=[Depends(require_permission("staff:write"))])
def delete_leave_type(
    leave_type_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    """Delete a leave type (soft delete)."""
    lt = db.get(LeaveType, leave_type_id)
    if not lt or lt.school_id != school_id:
        raise not_found("Leave type not found")
    
    # Check if any balances or requests exist
    balance_count = db.scalar(
        select(func.count()).where(LeaveBalance.leave_type_id == leave_type_id)
    ) or 0
    
    if balance_count > 0:
        # Soft delete
        lt.is_active = False
        lt.updated_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "ok", "message": f"Leave type deactivated (has {balance_count} balances)"}
    
    # Hard delete if no dependencies
    db.delete(lt)
    db.commit()
    return {"status": "ok"}


# ============================================================================
# LEAVE BALANCES
# ============================================================================

def _leave_balance_out(lb: LeaveBalance, include_type: bool = False) -> LeaveBalanceOut | LeaveBalanceWithType:
    """Convert LeaveBalance model to output schema."""
    available = lb.total_days + lb.carried_forward - lb.used_days - lb.pending_days
    
    base = LeaveBalanceOut(
        id=lb.id,
        staff_id=lb.staff_id,
        leave_type_id=lb.leave_type_id,
        year=lb.year,
        total_days=lb.total_days,
        used_days=lb.used_days,
        pending_days=lb.pending_days,
        carried_forward=lb.carried_forward,
        available_days=available,
        created_at=lb.created_at,
        updated_at=lb.updated_at,
    )
    
    if not include_type:
        return base
    
    # This would require a join - simplified for now
    return base


@router.get("/leave/balances/staff/{staff_id}", response_model=list[LeaveBalanceOut])
def get_staff_leave_balances(
    staff_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    year: Optional[int] = None,
) -> list[LeaveBalanceOut]:
    """Get leave balances for a staff member."""
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    
    base = select(LeaveBalance).where(LeaveBalance.staff_id == staff_id)
    
    if year:
        base = base.where(LeaveBalance.year == year)
    else:
        # Default to current year
        current_year = datetime.now().year
        base = base.where(LeaveBalance.year == current_year)
    
    rows = db.execute(base).scalars().all()
    return [_leave_balance_out(r) for r in rows]


@router.post("/leave/balances/initialize", dependencies=[Depends(require_permission("staff:write"))])
def initialize_leave_balances(
    payload: LeaveBalanceInitialize,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, int]:
    """Initialize leave balances for all staff for a given year."""
    # Get all active staff
    staff_list = db.execute(
        select(Staff).where(
            Staff.school_id == school_id,
            Staff.status == "active"
        )
    ).scalars().all()
    
    # Get all active leave types
    leave_types = db.execute(
        select(LeaveType).where(
            LeaveType.school_id == school_id,
            LeaveType.is_active == True
        )
    ).scalars().all()
    
    created_count = 0
    now = datetime.now(timezone.utc)
    
    for staff in staff_list:
        for lt in leave_types:
            # Check if balance already exists
            existing = db.execute(
                select(LeaveBalance).where(
                    LeaveBalance.staff_id == staff.id,
                    LeaveBalance.leave_type_id == lt.id,
                    LeaveBalance.year == payload.year
                )
            ).scalar_one_or_none()
            
            if not existing:
                # Calculate carry forward from previous year
                carried_forward = 0
                if payload.carry_forward_percentage > 0:
                    prev_balance = db.execute(
                        select(LeaveBalance).where(
                            LeaveBalance.staff_id == staff.id,
                            LeaveBalance.leave_type_id == lt.id,
                            LeaveBalance.year == payload.year - 1
                        )
                    ).scalar_one_or_none()
                    
                    if prev_balance:
                        available = prev_balance.total_days + prev_balance.carried_forward - prev_balance.used_days
                        carried_forward = int(available * payload.carry_forward_percentage / 100)
                
                balance = LeaveBalance(
                    staff_id=staff.id,
                    leave_type_id=lt.id,
                    year=payload.year,
                    total_days=lt.days_per_year,
                    used_days=0,
                    pending_days=0,
                    carried_forward=carried_forward,
                    created_at=now,
                )
                db.add(balance)
                created_count += 1
    
    db.commit()
    return {"status": "ok", "created": created_count}


@router.put("/leave/balances/{balance_id}", response_model=LeaveBalanceOut, dependencies=[Depends(require_permission("staff:write"))])
def adjust_leave_balance(
    balance_id: uuid.UUID,
    payload: LeaveBalanceUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> LeaveBalanceOut:
    """Adjust a leave balance (admin only)."""
    balance = db.get(LeaveBalance, balance_id)
    if not balance:
        raise not_found("Leave balance not found")
    
    # Verify staff belongs to school
    staff = db.get(Staff, balance.staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Leave balance not found")
    
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(balance, k, v)
    
    balance.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(balance)
    return _leave_balance_out(balance)


@router.get("/leave/balances/summary", response_model=dict)
def get_leave_balance_summary(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    year: Optional[int] = None,
) -> dict:
    """Get school-wide leave balance summary."""
    if not year:
        year = datetime.now().year
    
    # Get all staff in school
    staff_ids = db.execute(
        select(Staff.id).where(Staff.school_id == school_id)
    ).scalars().all()
    
    balances = db.execute(
        select(LeaveBalance).where(
            LeaveBalance.staff_id.in_(staff_ids),
            LeaveBalance.year == year
        )
    ).scalars().all()
    
    total_allocated = sum(b.total_days + b.carried_forward for b in balances)
    total_used = sum(b.used_days for b in balances)
    total_pending = sum(b.pending_days for b in balances)
    total_available = total_allocated - total_used - total_pending
    
    return {
        "year": year,
        "total_allocated": total_allocated,
        "total_used": total_used,
        "total_pending": total_pending,
        "total_available": total_available,
        "staff_count": len(staff_ids),
        "balance_count": len(balances),
    }


# ============================================================================
# LEAVE REQUESTS
# ============================================================================

def _leave_request_out(lr: StaffLeaveRequest) -> StaffLeaveRequestOut:
    """Convert StaffLeaveRequest model to output schema."""
    return StaffLeaveRequestOut(
        id=lr.id,
        staff_id=lr.staff_id,
        leave_type_id=lr.leave_type_id,
        start_date=lr.start_date,
        end_date=lr.end_date,
        total_days=lr.total_days,
        reason=lr.reason,
        status=lr.status,
        approved_by_user_id=lr.approved_by_user_id,
        approved_at=lr.approved_at,
        rejection_reason=lr.rejection_reason,
        cancelled_at=lr.cancelled_at,
        created_at=lr.created_at,
        updated_at=lr.updated_at,
    )


def _calculate_leave_days(start_date: date, end_date: date) -> int:
    """Calculate number of leave days (including both start and end dates)."""
    return (end_date - start_date).days + 1


@router.get("/leave/requests", response_model=dict)
def list_leave_requests(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    staff_id: Optional[uuid.UUID] = None,
    leave_type_id: Optional[uuid.UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    """List all leave requests with filtering."""
    # Get all staff in school
    staff_ids = db.execute(
        select(Staff.id).where(Staff.school_id == school_id)
    ).scalars().all()
    
    offset = (page - 1) * limit if page > 1 else 0
    base = select(StaffLeaveRequest).where(StaffLeaveRequest.staff_id.in_(staff_ids))
    
    if status:
        base = base.where(StaffLeaveRequest.status == status)
    if staff_id:
        base = base.where(StaffLeaveRequest.staff_id == staff_id)
    if leave_type_id:
        base = base.where(StaffLeaveRequest.leave_type_id == leave_type_id)
    if start_date:
        base = base.where(StaffLeaveRequest.end_date >= start_date)
    if end_date:
        base = base.where(StaffLeaveRequest.start_date <= end_date)
    
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(StaffLeaveRequest.created_at.desc()).offset(offset).limit(limit)).scalars().all()
    
    return {
        "items": [_leave_request_out(r).model_dump() for r in rows],
        "total": int(total),
        "page": page,
        "limit": limit,
    }


@router.post("/leave/requests", response_model=StaffLeaveRequestOut, dependencies=[Depends(require_permission("staff:write"))])
def create_leave_request(
    payload: StaffLeaveRequestCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffLeaveRequestOut:
    """Create a new leave request."""
    staff = db.get(Staff, payload.staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    
    leave_type = db.get(LeaveType, payload.leave_type_id)
    if not leave_type or leave_type.school_id != school_id:
        raise not_found("Leave type not found")
    
    # Validate dates
    if payload.end_date < payload.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    
    # Calculate days
    total_days = _calculate_leave_days(payload.start_date, payload.end_date)
    
    # Check max consecutive days
    if leave_type.max_consecutive_days and total_days > leave_type.max_consecutive_days:
        raise problem(
            status_code=400,
            title="Bad Request",
            detail=f"Cannot request more than {leave_type.max_consecutive_days} consecutive days for {leave_type.name}"
        )
    
    # Check balance
    current_year = payload.start_date.year
    balance = db.execute(
        select(LeaveBalance).where(
            LeaveBalance.staff_id == payload.staff_id,
            LeaveBalance.leave_type_id == payload.leave_type_id,
            LeaveBalance.year == current_year
        )
    ).scalar_one_or_none()
    
    if balance:
        available = balance.total_days + balance.carried_forward - balance.used_days - balance.pending_days
        if total_days > available:
            raise problem(
                status_code=400,
                title="Insufficient Leave Balance",
                detail=f"Only {available} days available, but {total_days} days requested"
            )
    
    now = datetime.now(timezone.utc)
    request = StaffLeaveRequest(
        staff_id=payload.staff_id,
        leave_type_id=payload.leave_type_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_days=total_days,
        reason=payload.reason,
        status="pending",
        created_at=now,
    )
    db.add(request)
    
    # Update pending days in balance
    if balance:
        balance.pending_days += total_days
        balance.updated_at = now
    
    db.commit()
    db.refresh(request)
    return _leave_request_out(request)


@router.get("/leave/requests/{request_id}", response_model=StaffLeaveRequestOut)
def get_leave_request(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffLeaveRequestOut:
    """Get a specific leave request."""
    request = db.get(StaffLeaveRequest, request_id)
    if not request:
        raise not_found("Leave request not found")
    
    # Verify staff belongs to school
    staff = db.get(Staff, request.staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Leave request not found")
    
    return _leave_request_out(request)


@router.put("/leave/requests/{request_id}", response_model=StaffLeaveRequestOut, dependencies=[Depends(require_permission("staff:write"))])
def update_leave_request(
    request_id: uuid.UUID,
    payload: StaffLeaveRequestUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffLeaveRequestOut:
    """Update a leave request (only if pending)."""
    request = db.get(StaffLeaveRequest, request_id)
    if not request:
        raise not_found("Leave request not found")
    
    # Verify staff belongs to school
    staff = db.get(Staff, request.staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Leave request not found")
    
    if request.status != "pending":
        raise problem(status_code=400, title="Bad Request", detail="Can only update pending requests")
    
    data = payload.model_dump(exclude_unset=True)
    
    # If dates are changing, recalculate days
    if "start_date" in data or "end_date" in data:
        start = data.get("start_date", request.start_date)
        end = data.get("end_date", request.end_date)
        
        if end < start:
            raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
        
        old_days = request.total_days
        new_days = _calculate_leave_days(start, end)
        data["total_days"] = new_days
        
        # Update balance pending days
        balance = db.execute(
            select(LeaveBalance).where(
                LeaveBalance.staff_id == request.staff_id,
                LeaveBalance.leave_type_id == request.leave_type_id,
                LeaveBalance.year == start.year
            )
        ).scalar_one_or_none()
        
        if balance:
            balance.pending_days = balance.pending_days - old_days + new_days
            balance.updated_at = datetime.now(timezone.utc)
    
    for k, v in data.items():
        setattr(request, k, v)
    
    request.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    return _leave_request_out(request)


@router.delete("/leave/requests/{request_id}", dependencies=[Depends(require_permission("staff:write"))])
def cancel_leave_request(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    """Cancel a leave request."""
    request = db.get(StaffLeaveRequest, request_id)
    if not request:
        raise not_found("Leave request not found")
    
    # Verify staff belongs to school
    staff = db.get(Staff, request.staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Leave request not found")
    
    if request.status == "cancelled":
        raise problem(status_code=400, title="Bad Request", detail="Request is already cancelled")
    
    now = datetime.now(timezone.utc)
    
    # Update balance
    balance = db.execute(
        select(LeaveBalance).where(
            LeaveBalance.staff_id == request.staff_id,
            LeaveBalance.leave_type_id == request.leave_type_id,
            LeaveBalance.year == request.start_date.year
        )
    ).scalar_one_or_none()
    
    if balance:
        if request.status == "pending":
            balance.pending_days -= request.total_days
        elif request.status == "approved":
            balance.used_days -= request.total_days
        balance.updated_at = now
    
    request.status = "cancelled"
    request.cancelled_at = now
    request.updated_at = now
    db.commit()
    return {"status": "ok"}


@router.patch("/leave/requests/{request_id}/approve", response_model=StaffLeaveRequestOut, dependencies=[Depends(require_permission("staff:write"))])
def approve_leave_request(
    request_id: uuid.UUID,
    payload: StaffLeaveRequestApprove,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> StaffLeaveRequestOut:
    """Approve a leave request."""
    request = db.get(StaffLeaveRequest, request_id)
    if not request:
        raise not_found("Leave request not found")
    
    # Verify staff belongs to school
    staff = db.get(Staff, request.staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Leave request not found")
    
    if request.status != "pending":
        raise problem(status_code=400, title="Bad Request", detail="Can only approve pending requests")
    
    now = datetime.now(timezone.utc)
    
    # Update balance: move from pending to used
    balance = db.execute(
        select(LeaveBalance).where(
            LeaveBalance.staff_id == request.staff_id,
            LeaveBalance.leave_type_id == request.leave_type_id,
            LeaveBalance.year == request.start_date.year
        )
    ).scalar_one_or_none()
    
    if balance:
        balance.pending_days -= request.total_days
        balance.used_days += request.total_days
        balance.updated_at = now
    
    request.status = "approved"
    request.approved_by_user_id = user.id
    request.approved_at = now
    request.updated_at = now
    db.commit()
    db.refresh(request)
    return _leave_request_out(request)


@router.patch("/leave/requests/{request_id}/reject", response_model=StaffLeaveRequestOut, dependencies=[Depends(require_permission("staff:write"))])
def reject_leave_request(
    request_id: uuid.UUID,
    payload: StaffLeaveRequestReject,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    school_id=Depends(get_active_school_id),
) -> StaffLeaveRequestOut:
    """Reject a leave request."""
    request = db.get(StaffLeaveRequest, request_id)
    if not request:
        raise not_found("Leave request not found")
    
    # Verify staff belongs to school
    staff = db.get(Staff, request.staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Leave request not found")
    
    if request.status != "pending":
        raise problem(status_code=400, title="Bad Request", detail="Can only reject pending requests")
    
    now = datetime.now(timezone.utc)
    
    # Update balance: remove from pending
    balance = db.execute(
        select(LeaveBalance).where(
            LeaveBalance.staff_id == request.staff_id,
            LeaveBalance.leave_type_id == request.leave_type_id,
            LeaveBalance.year == request.start_date.year
        )
    ).scalar_one_or_none()
    
    if balance:
        balance.pending_days -= request.total_days
        balance.updated_at = now
    
    request.status = "rejected"
    request.approved_by_user_id = user.id
    request.approved_at = now
    request.rejection_reason = payload.rejection_reason
    request.updated_at = now
    db.commit()
    db.refresh(request)
    return _leave_request_out(request)


@router.get("/leave/requests/staff/{staff_id}", response_model=list[StaffLeaveRequestOut])
def get_staff_leave_requests(
    staff_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    year: Optional[int] = None,
) -> list[StaffLeaveRequestOut]:
    """Get all leave requests for a staff member."""
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    
    base = select(StaffLeaveRequest).where(StaffLeaveRequest.staff_id == staff_id)
    
    if year:
        base = base.where(
            func.extract('year', StaffLeaveRequest.start_date) == year
        )
    
    rows = db.execute(base.order_by(StaffLeaveRequest.start_date.desc())).scalars().all()
    return [_leave_request_out(r) for r in rows]


@router.get("/leave/requests/pending", response_model=list[StaffLeaveRequestOut])
def get_pending_leave_requests(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[StaffLeaveRequestOut]:
    """Get all pending leave requests for the school."""
    # Get all staff in school
    staff_ids = db.execute(
        select(Staff.id).where(Staff.school_id == school_id)
    ).scalars().all()
    
    rows = db.execute(
        select(StaffLeaveRequest).where(
            StaffLeaveRequest.staff_id.in_(staff_ids),
            StaffLeaveRequest.status == "pending"
        ).order_by(StaffLeaveRequest.created_at.asc())
    ).scalars().all()
    
    return [_leave_request_out(r) for r in rows]


@router.get("/leave/calendar", response_model=list[LeaveCalendarEntry])
def get_leave_calendar(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> list[LeaveCalendarEntry]:
    """Get leave calendar view."""
    # Get all staff in school
    staff_ids = db.execute(
        select(Staff.id).where(Staff.school_id == school_id)
    ).scalars().all()
    
    base = select(StaffLeaveRequest).where(
        StaffLeaveRequest.staff_id.in_(staff_ids),
        StaffLeaveRequest.status == "approved"
    )
    
    if start_date:
        base = base.where(StaffLeaveRequest.end_date >= start_date)
    if end_date:
        base = base.where(StaffLeaveRequest.start_date <= end_date)
    
    requests = db.execute(base).scalars().all()
    
    # Build calendar entries
    entries = []
    for req in requests:
        staff = db.get(Staff, req.staff_id)
        leave_type = db.get(LeaveType, req.leave_type_id)
        
        if not staff or not leave_type:
            continue
        
        # Create an entry for each day in the range
        current_date = req.start_date
        while current_date <= req.end_date:
            entries.append(
                LeaveCalendarEntry(
                    date=current_date,
                    staff_id=staff.id,
                    staff_name=staff.full_name,
                    leave_type_id=leave_type.id,
                    leave_type_name=leave_type.name,
                    leave_type_color=leave_type.color,
                    request_id=req.id,
                )
            )
            from datetime import timedelta
            current_date += timedelta(days=1)
    
    return entries
