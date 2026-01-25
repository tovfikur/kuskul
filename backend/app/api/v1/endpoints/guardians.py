import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, not_implemented, problem
from app.db.session import get_db
from app.models.guardian import Guardian
from app.models.student import Student
from app.models.student_guardian import StudentGuardian
from app.schemas.guardians import GuardianCreate, GuardianOut, GuardianUpdate
from app.schemas.students import StudentOut

router = APIRouter(dependencies=[Depends(require_permission("guardians:read"))])


def _out(g: Guardian) -> GuardianOut:
    return GuardianOut(
        id=g.id,
        school_id=g.school_id,
        full_name=g.full_name,
        phone=g.phone,
        email=g.email,
        occupation=g.occupation,
        id_number=g.id_number,
        emergency_contact_name=g.emergency_contact_name,
        emergency_contact_phone=g.emergency_contact_phone,
        address=g.address,
        photo_url=g.photo_url,
    )


@router.get("", response_model=dict)
def list_guardians(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
) -> dict:
    offset = (page - 1) * limit if page > 1 else 0
    base = select(Guardian).where(Guardian.school_id == school_id)
    if search:
        base = base.where(
            Guardian.full_name.ilike(f"%{search}%")
            | Guardian.phone.ilike(f"%{search}%")
            | Guardian.email.ilike(f"%{search}%")
        )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(Guardian.full_name.asc()).offset(offset).limit(limit)).scalars().all()
    return {"items": [_out(g).model_dump() for g in rows], "total": int(total), "page": page, "limit": limit}


@router.get("/{guardian_id}", response_model=GuardianOut)
def get_guardian(
    guardian_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> GuardianOut:
    g = db.get(Guardian, guardian_id)
    if not g or g.school_id != school_id:
        raise not_found("Guardian not found")
    return _out(g)


@router.post("", response_model=GuardianOut, dependencies=[Depends(require_permission("guardians:write"))])
def create_guardian(
    payload: GuardianCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> GuardianOut:
    # Deduplication logic: Check if guardian already exists by email or phone
    existing = None
    if payload.email:
        existing = db.scalar(
            select(Guardian).where(
                Guardian.school_id == school_id, 
                Guardian.email == str(payload.email)
            ).limit(1)
        )
    
    if not existing and payload.phone:
        existing = db.scalar(
            select(Guardian).where(
                Guardian.school_id == school_id, 
                Guardian.phone == payload.phone
            ).limit(1)
        )

    now = datetime.now(timezone.utc)
    
    if existing:
        # Update existing guardian with provided details
        data = payload.model_dump(exclude_unset=True)
        if "email" in data:
            data["email"] = str(data["email"]) if data["email"] else None
        
        for k, v in data.items():
            setattr(existing, k, v)
        g = existing
    else:
        # Create new guardian
        g = Guardian(
            school_id=school_id,
            full_name=payload.full_name,
            phone=payload.phone,
            email=str(payload.email) if payload.email else None,
            occupation=payload.occupation,
            id_number=payload.id_number,
            emergency_contact_name=payload.emergency_contact_name,
            emergency_contact_phone=payload.emergency_contact_phone,
            address=payload.address,
            created_at=now,
        )
        db.add(g)
    
    # Sync with User: Link to User if email matches
    if g.email:
        from app.models.user import User
        user = db.scalar(select(User).where(User.email == g.email).limit(1))
        if user:
            g.user_id = user.id

    db.commit()
    db.refresh(g)
    return _out(g)


@router.put("/{guardian_id}", response_model=GuardianOut, dependencies=[Depends(require_permission("guardians:write"))])
def update_guardian(
    guardian_id: uuid.UUID,
    payload: GuardianUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> GuardianOut:
    g = db.get(Guardian, guardian_id)
    if not g or g.school_id != school_id:
        raise not_found("Guardian not found")
    data = payload.model_dump(exclude_unset=True)
    if "email" in data:
        data["email"] = str(data["email"]) if data["email"] else None
        new_email = data["email"]
        
        # Sync to User
        if new_email:
            from app.models.user import User
            if g.user_id:
                u = db.get(User, g.user_id)
                if u:
                     # Check uniqueness logic could be here, but DB will catch unique constraint violation if we don't.
                     # However, a friendly error is better.
                     existing_user = db.scalar(select(User).where(User.email == new_email))
                     if existing_user and existing_user.id != u.id:
                         raise problem(status_code=409, title="Conflict", detail="Email linked to another user")
                     u.email = new_email
            else:
                 # Check if we should link to an existing user
                 u = db.scalar(select(User).where(User.email == new_email))
                 if u:
                     g.user_id = u.id

    for k, v in data.items():
        setattr(g, k, v)
    
    # Sync other fields to User if linked
    if g.user_id:
        from app.models.user import User
        u = db.get(User, g.user_id)
        if u:
            # Sync fields
            if "full_name" in data:
                u.full_name = data["full_name"]
            if "phone" in data:
                u.phone = data["phone"]
            if "photo_url" in data:
                u.photo_url = data["photo_url"]
    
    db.commit()
    return _out(g)


@router.delete("/{guardian_id}", dependencies=[Depends(require_permission("guardians:write"))])
def delete_guardian(
    guardian_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> dict[str, str]:
    g = db.get(Guardian, guardian_id)
    if not g or g.school_id != school_id:
        raise not_found("Guardian not found")
    db.delete(g)
    db.commit()
    return {"status": "ok"}


@router.get("/{guardian_id}/students", response_model=list[StudentOut])
def get_guardian_students(
    guardian_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)
) -> list[StudentOut]:
    g = db.get(Guardian, guardian_id)
    if not g or g.school_id != school_id:
        raise not_found("Guardian not found")
    students = db.execute(
        select(Student)
        .join(StudentGuardian, StudentGuardian.student_id == Student.id)
        .where(StudentGuardian.guardian_id == guardian_id, Student.school_id == school_id)
        .order_by(Student.first_name.asc())
    ).scalars().all()
    return [StudentOut.model_validate(s) for s in students]


@router.post("/{guardian_id}/photo", dependencies=[Depends(require_permission("guardians:write"))])
def upload_guardian_photo(
    guardian_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    g = db.get(Guardian, guardian_id)
    if not g or g.school_id != school_id:
        raise not_found("Guardian not found")
    if not file.filename:
        raise problem(status_code=400, title="Bad Request", detail="Missing filename")
        
    # Save file to static directory
    import shutil
    import os
    
    EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in EXTENSIONS:
        raise problem(status_code=400, title="Bad Request", detail="Invalid image format")
        
    filename = f"guardian_{guardian_id}_{uuid.uuid4().hex[:8]}{ext}"
    static_path = os.path.join("static", filename)
    
    with open(static_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    g.photo_url = f"/static/{filename}"
    
    # Sync to User if linked
    if g.user_id:
        from app.models.user import User
        u = db.get(User, g.user_id)
        if u:
            u.photo_url = g.photo_url
            
    db.commit()
    return {"status": "ok"}


@router.post("/bulk-import", include_in_schema=False)
def bulk_import_users() -> None:
    raise not_implemented("Bulk import is not implemented yet")
