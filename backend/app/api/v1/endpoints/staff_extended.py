"""API endpoints for extended staff management (departments, designations, contracts)."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.staff import Staff
from app.models.staff_extended import Department, Designation, StaffContract
from app.schemas.staff_extended import (
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
    DesignationCreate,
    DesignationOut,
    DesignationUpdate,
    StaffContractCreate,
    StaffContractOut,
    StaffContractTerminate,
    StaffContractUpdate,
)

router = APIRouter()  # Removed router-level permission - add to individual endpoints if needed


# ============================================================================
# DEPARTMENTS
# ============================================================================

def _dept_out(d: Department) -> DepartmentOut:
    """Convert Department model to output schema."""
    return DepartmentOut(
        id=d.id,
        school_id=d.school_id,
        name=d.name,
        code=d.code,
        head_staff_id=d.head_staff_id,
        budget_allocated=d.budget_allocated,
        description=d.description,
        is_active=d.is_active,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


@router.get("/departments", response_model=dict)
def list_departments(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    limit: int = 50,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
) -> dict:
    """List all departments with pagination and filtering."""
    offset = (page - 1) * limit if page > 1 else 0
    base = select(Department).where(Department.school_id == school_id)
    
    if is_active is not None:
        base = base.where(Department.is_active == is_active)
    if search:
        base = base.where(
            Department.name.ilike(f"%{search}%") | Department.code.ilike(f"%{search}%")
        )
    
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(Department.name.asc()).offset(offset).limit(limit)).scalars().all()
    
    return {
        "items": [_dept_out(r).model_dump() for r in rows],
        "total": int(total),
        "page": page,
        "limit": limit,
    }


@router.post("/departments", response_model=DepartmentOut, dependencies=[Depends(require_permission("staff:write"))])
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> DepartmentOut:
    """Create a new department."""
    # Check if code already exists
    existing = db.execute(
        select(Department).where(
            Department.school_id == school_id,
            Department.code == payload.code
        )
    ).scalar_one_or_none()
    
    if existing:
        raise problem(status_code=400, title="Bad Request", detail=f"Department code '{payload.code}' already exists")
    
    now = datetime.now(timezone.utc)
    dept = Department(
        school_id=school_id,
        name=payload.name,
        code=payload.code,
        head_staff_id=payload.head_staff_id,
        budget_allocated=payload.budget_allocated,
        description=payload.description,
        is_active=payload.is_active,
        created_at=now,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return _dept_out(dept)


@router.get("/departments/{department_id}", response_model=DepartmentOut)
def get_department(
    department_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> DepartmentOut:
    """Get a specific department by ID."""
    dept = db.get(Department, department_id)
    if not dept or dept.school_id != school_id:
        raise not_found("Department not found")
    return _dept_out(dept)


@router.put("/departments/{department_id}", response_model=DepartmentOut, dependencies=[Depends(require_permission("staff:write"))])
def update_department(
    department_id: uuid.UUID,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> DepartmentOut:
    """Update a department."""
    dept = db.get(Department, department_id)
    if not dept or dept.school_id != school_id:
        raise not_found("Department not found")
    
    data = payload.model_dump(exclude_unset=True)
    
    # Check if code is being changed and if it conflicts
    if "code" in data and data["code"] != dept.code:
        existing = db.execute(
            select(Department).where(
                Department.school_id == school_id,
                Department.code == data["code"],
                Department.id != department_id
            )
        ).scalar_one_or_none()
        
        if existing:
            raise problem(status_code=400, title="Bad Request", detail=f"Department code '{data['code']}' already exists")
    
    for k, v in data.items():
        setattr(dept, k, v)
    
    dept.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(dept)
    return _dept_out(dept)


@router.delete("/departments/{department_id}", dependencies=[Depends(require_permission("staff:write"))])
def delete_department(
    department_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    """Delete a department (soft delete by setting is_active=False)."""
    dept = db.get(Department, department_id)
    if not dept or dept.school_id != school_id:
        raise not_found("Department not found")
    
    # Check if any staff are assigned to this department
    staff_count = db.scalar(
        select(func.count()).where(Staff.department_id == department_id)
    ) or 0
    
    if staff_count > 0:
        # Soft delete instead of hard delete
        dept.is_active = False
        dept.updated_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "ok", "message": f"Department deactivated (has {staff_count} staff members)"}
    
    # Hard delete if no staff assigned
    db.delete(dept)
    db.commit()
    return {"status": "ok"}


@router.get("/departments/{department_id}/staff", response_model=dict)
def list_department_staff(
    department_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    limit: int = 20,
) -> dict:
    """List all staff in a department."""
    dept = db.get(Department, department_id)
    if not dept or dept.school_id != school_id:
        raise not_found("Department not found")
    
    offset = (page - 1) * limit if page > 1 else 0
    base = select(Staff).where(
        Staff.school_id == school_id,
        Staff.department_id == department_id
    )
    
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(Staff.full_name.asc()).offset(offset).limit(limit)).scalars().all()
    
    from app.api.v1.endpoints.staff import _out as staff_out
    
    return {
        "items": [staff_out(r).model_dump() for r in rows],
        "total": int(total),
        "page": page,
        "limit": limit,
    }


@router.put("/departments/{department_id}/head", dependencies=[Depends(require_permission("staff:write"))])
def assign_department_head(
    department_id: uuid.UUID,
    staff_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> DepartmentOut:
    """Assign a staff member as department head."""
    dept = db.get(Department, department_id)
    if not dept or dept.school_id != school_id:
        raise not_found("Department not found")
    
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    
    dept.head_staff_id = staff_id
    dept.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(dept)
    return _dept_out(dept)


# ============================================================================
# DESIGNATIONS
# ============================================================================

def _desig_out(d: Designation) -> DesignationOut:
    """Convert Designation model to output schema."""
    return DesignationOut(
        id=d.id,
        school_id=d.school_id,
        title=d.title,
        code=d.code,
        level=d.level,
        department_id=d.department_id,
        min_salary=d.min_salary,
        max_salary=d.max_salary,
        description=d.description,
        is_active=d.is_active,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


@router.get("/designations", response_model=dict)
def list_designations(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    limit: int = 50,
    department_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
) -> dict:
    """List all designations with pagination and filtering."""
    offset = (page - 1) * limit if page > 1 else 0
    base = select(Designation).where(Designation.school_id == school_id)
    
    if department_id:
        base = base.where(Designation.department_id == department_id)
    if is_active is not None:
        base = base.where(Designation.is_active == is_active)
    if search:
        base = base.where(
            Designation.title.ilike(f"%{search}%") | Designation.code.ilike(f"%{search}%")
        )
    
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(Designation.level.asc(), Designation.title.asc()).offset(offset).limit(limit)).scalars().all()
    
    return {
        "items": [_desig_out(r).model_dump() for r in rows],
        "total": int(total),
        "page": page,
        "limit": limit,
    }


@router.post("/designations", response_model=DesignationOut, dependencies=[Depends(require_permission("staff:write"))])
def create_designation(
    payload: DesignationCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> DesignationOut:
    """Create a new designation."""
    # Check if code already exists
    existing = db.execute(
        select(Designation).where(
            Designation.school_id == school_id,
            Designation.code == payload.code
        )
    ).scalar_one_or_none()
    
    if existing:
        raise problem(status_code=400, title="Bad Request", detail=f"Designation code '{payload.code}' already exists")
    
    now = datetime.now(timezone.utc)
    desig = Designation(
        school_id=school_id,
        title=payload.title,
        code=payload.code,
        level=payload.level,
        department_id=payload.department_id,
        min_salary=payload.min_salary,
        max_salary=payload.max_salary,
        description=payload.description,
        is_active=payload.is_active,
        created_at=now,
    )
    db.add(desig)
    db.commit()
    db.refresh(desig)
    return _desig_out(desig)


@router.get("/designations/{designation_id}", response_model=DesignationOut)
def get_designation(
    designation_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> DesignationOut:
    """Get a specific designation by ID."""
    desig = db.get(Designation, designation_id)
    if not desig or desig.school_id != school_id:
        raise not_found("Designation not found")
    return _desig_out(desig)


@router.put("/designations/{designation_id}", response_model=DesignationOut, dependencies=[Depends(require_permission("staff:write"))])
def update_designation(
    designation_id: uuid.UUID,
    payload: DesignationUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> DesignationOut:
    """Update a designation."""
    desig = db.get(Designation, designation_id)
    if not desig or desig.school_id != school_id:
        raise not_found("Designation not found")
    
    data = payload.model_dump(exclude_unset=True)
    
    # Check if code is being changed and if it conflicts
    if "code" in data and data["code"] != desig.code:
        existing = db.execute(
            select(Designation).where(
                Designation.school_id == school_id,
                Designation.code == data["code"],
                Designation.id != designation_id
            )
        ).scalar_one_or_none()
        
        if existing:
            raise problem(status_code=400, title="Bad Request", detail=f"Designation code '{data['code']}' already exists")
    
    for k, v in data.items():
        setattr(desig, k, v)
    
    desig.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(desig)
    return _desig_out(desig)


@router.delete("/designations/{designation_id}", dependencies=[Depends(require_permission("staff:write"))])
def delete_designation(
    designation_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    """Delete a designation (soft delete by setting is_active=False)."""
    desig = db.get(Designation, designation_id)
    if not desig or desig.school_id != school_id:
        raise not_found("Designation not found")
    
    # Check if any staff have this designation
    staff_count = db.scalar(
        select(func.count()).where(Staff.designation_id == designation_id)
    ) or 0
    
    if staff_count > 0:
        # Soft delete instead of hard delete
        desig.is_active = False
        desig.updated_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "ok", "message": f"Designation deactivated (has {staff_count} staff members)"}
    
    # Hard delete if no staff assigned
    db.delete(desig)
    db.commit()
    return {"status": "ok"}


# ============================================================================
# STAFF CONTRACTS
# ============================================================================

def _contract_out(c: StaffContract) -> StaffContractOut:
    """Convert StaffContract model to output schema."""
    return StaffContractOut(
        id=c.id,
        staff_id=c.staff_id,
        contract_type=c.contract_type,
        start_date=c.start_date,
        end_date=c.end_date,
        salary=c.salary,
        salary_currency=c.salary_currency,
        working_hours_per_week=c.working_hours_per_week,
        contract_document_url=c.contract_document_url,
        terms_and_conditions=c.terms_and_conditions,
        status=c.status,
        termination_reason=c.termination_reason,
        terminated_at=c.terminated_at,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.get("/staff/{staff_id}/contracts", response_model=list[StaffContractOut])
def list_staff_contracts(
    staff_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> list[StaffContractOut]:
    """List all contracts for a staff member."""
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    
    rows = db.execute(
        select(StaffContract)
        .where(StaffContract.staff_id == staff_id)
        .order_by(StaffContract.start_date.desc())
    ).scalars().all()
    
    return [_contract_out(r) for r in rows]


@router.post("/staff/{staff_id}/contracts", response_model=StaffContractOut, dependencies=[Depends(require_permission("staff:write"))])
def create_staff_contract(
    staff_id: uuid.UUID,
    payload: StaffContractCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffContractOut:
    """Create a new contract for a staff member."""
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    
    # Validate dates
    if payload.end_date and payload.end_date < payload.start_date:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    
    now = datetime.now(timezone.utc)
    contract = StaffContract(
        staff_id=staff_id,
        contract_type=payload.contract_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        salary=payload.salary,
        salary_currency=payload.salary_currency,
        working_hours_per_week=payload.working_hours_per_week,
        contract_document_url=payload.contract_document_url,
        terms_and_conditions=payload.terms_and_conditions,
        status=payload.status,
        created_at=now,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return _contract_out(contract)


@router.get("/staff/{staff_id}/contracts/{contract_id}", response_model=StaffContractOut)
def get_staff_contract(
    staff_id: uuid.UUID,
    contract_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffContractOut:
    """Get a specific contract."""
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    
    contract = db.get(StaffContract, contract_id)
    if not contract or contract.staff_id != staff_id:
        raise not_found("Contract not found")
    
    return _contract_out(contract)


@router.put("/staff/{staff_id}/contracts/{contract_id}", response_model=StaffContractOut, dependencies=[Depends(require_permission("staff:write"))])
def update_staff_contract(
    staff_id: uuid.UUID,
    contract_id: uuid.UUID,
    payload: StaffContractUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffContractOut:
    """Update a contract."""
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    
    contract = db.get(StaffContract, contract_id)
    if not contract or contract.staff_id != staff_id:
        raise not_found("Contract not found")
    
    data = payload.model_dump(exclude_unset=True)
    
    # Validate dates if both are present
    start = data.get("start_date", contract.start_date)
    end = data.get("end_date", contract.end_date)
    if end and end < start:
        raise problem(status_code=400, title="Bad Request", detail="end_date must be >= start_date")
    
    for k, v in data.items():
        setattr(contract, k, v)
    
    contract.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(contract)
    return _contract_out(contract)


@router.patch("/staff/{staff_id}/contracts/{contract_id}/terminate", response_model=StaffContractOut, dependencies=[Depends(require_permission("staff:write"))])
def terminate_staff_contract(
    staff_id: uuid.UUID,
    contract_id: uuid.UUID,
    payload: StaffContractTerminate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> StaffContractOut:
    """Terminate a contract."""
    staff = db.get(Staff, staff_id)
    if not staff or staff.school_id != school_id:
        raise not_found("Staff not found")
    
    contract = db.get(StaffContract, contract_id)
    if not contract or contract.staff_id != staff_id:
        raise not_found("Contract not found")
    
    if contract.status == "terminated":
        raise problem(status_code=400, title="Bad Request", detail="Contract is already terminated")
    
    now = datetime.now(timezone.utc)
    contract.status = "terminated"
    contract.termination_reason = payload.termination_reason
    contract.terminated_at = now
    contract.updated_at = now
    db.commit()
    db.refresh(contract)
    return _contract_out(contract)


@router.get("/contracts/expiring", response_model=list[StaffContractOut])
def get_expiring_contracts(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    days: int = 30,
) -> list[StaffContractOut]:
    """Get contracts expiring within the specified number of days."""
    from datetime import timedelta
    
    cutoff_date = datetime.now(timezone.utc) + timedelta(days=days)
    
    # Get all staff in this school
    staff_ids = db.execute(
        select(Staff.id).where(Staff.school_id == school_id)
    ).scalars().all()
    
    rows = db.execute(
        select(StaffContract)
        .where(
            StaffContract.staff_id.in_(staff_ids),
            StaffContract.status == "active",
            StaffContract.end_date.isnot(None),
            StaffContract.end_date <= cutoff_date
        )
        .order_by(StaffContract.end_date.asc())
    ).scalars().all()
    
    return [_contract_out(r) for r in rows]
