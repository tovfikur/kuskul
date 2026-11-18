from datetime import datetime, timezone

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_active_school_id, require_permission
from app.core.problems import not_found, problem
from app.core.security import hash_password
from app.core.seed import ensure_default_roles
from app.db.session import get_db
from app.models.membership import Membership
from app.models.role import Role
from app.models.school import School
from app.models.user import User
from app.schemas.users import (
    TeacherUserFromStaffCreate,
    UserCreate,
    UserDetail,
    UserList,
    UserOut,
    UserUpdate,
)

router = APIRouter(dependencies=[Depends(require_permission("users:read"))])


@router.get("", response_model=UserList)
def list_users(
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
    page: int = 1,
    offset: int = 0,
    limit: int = 50,
    email: Optional[str] = None,
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    include_inactive: bool = False,
) -> UserList:
    if page > 1 and offset == 0:
        offset = (page - 1) * limit
    if search and not email:
        email = search
    if is_active is not None:
        include_inactive = True

    base = (
        select(User, Role.name)
        .join(Membership, Membership.user_id == User.id)
        .join(Role, Role.id == Membership.role_id)
        .where(Membership.school_id == school_id, Membership.is_active.is_(True))
    )
    if email:
        base = base.where(User.email.ilike(f"%{email}%"))
    if search:
        base = base.where(
            User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%")
        )

    if role:
        base = base.where(Role.name == role)
    if is_active is not None:
        base = base.where(User.is_active.is_(is_active))
    elif not include_inactive:
        base = base.where(User.is_active.is_(True))

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.order_by(User.email.asc()).offset(offset).limit(limit)).all()
    
    return UserList(
        items=[
            UserOut(
                id=u.id, 
                email=u.email, 
                full_name=u.full_name,
                phone=u.phone,
                photo_url=u.photo_url,
                is_active=u.is_active,
                role_name=r_name
            ) for u, r_name in rows
        ],
        total=int(total),
        offset=offset,
        limit=limit,
    )


@router.get("/{user_id}", response_model=UserDetail)
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> UserDetail:
    membership = db.scalar(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.school_id == school_id,
            Membership.is_active.is_(True),
        )
    )
    if not membership:
        raise not_found("User not found in this school")
    user = db.get(User, user_id)
    if not user:
        raise not_found("User not found")
    role = db.get(Role, membership.role_id)
    return UserDetail(
        id=user.id, 
        email=user.email, 
        full_name=user.full_name,
        phone=user.phone,
        photo_url=user.photo_url,
        is_active=user.is_active, 
        school_id=school_id, 
        role_name=(role.name if role else "")
    )


@router.post("", response_model=UserOut, dependencies=[Depends(require_permission("users:write"))])
def create_user(payload: UserCreate, db: Session = Depends(get_db), school_id=Depends(get_active_school_id)) -> UserOut:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise problem(status_code=409, title="Conflict", detail="Email already exists")

    ensure_default_roles(db)
    role = db.scalar(select(Role).where(Role.name == payload.role_name))
    if not role:
        raise problem(status_code=400, title="Bad Request", detail="Unknown role_name")

    now = datetime.now(timezone.utc)
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        is_active=payload.is_active,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.flush()

    db.add(Membership(user_id=user.id, school_id=school_id, role_id=role.id, is_active=True, created_at=now))

    db.commit()
    return UserOut(
        id=user.id, 
        email=user.email, 
        full_name=user.full_name,
        phone=user.phone,
        photo_url=user.photo_url,
        is_active=user.is_active,
        role_name=role.name
    )


@router.post(
    "/teacher-from-staff",
    response_model=UserOut,
    dependencies=[Depends(require_permission("users:write"))],
)
def create_teacher_user_from_staff(
    payload: TeacherUserFromStaffCreate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> UserOut:
    ensure_default_roles(db)
    role = db.scalar(select(Role).where(Role.name == "teacher"))
    if not role:
        raise problem(status_code=400, title="Bad Request", detail="Unknown teacher role")

    now = datetime.now(timezone.utc)
    email = str(payload.email).strip().lower()
    full_name = payload.full_name.strip() if payload.full_name else None

    school = db.get(School, school_id)
    if not school:
        raise problem(status_code=400, title="Bad Request", detail="Active school not found")

    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user:
        if user.tenant_id is not None and user.tenant_id != school.tenant_id:
            raise problem(
                status_code=409,
                title="Conflict",
                detail="Email already belongs to another tenant.",
            )

        teacher_membership = db.scalar(
            select(Membership).where(
                Membership.user_id == user.id,
                Membership.school_id == school_id,
                Membership.role_id == role.id,
                Membership.is_active.is_(True),
            )
        )
        if teacher_membership:
            raise problem(
                status_code=409,
                title="Conflict",
                detail="Already Teacher role user.",
            )

        membership_row = db.execute(
            select(Membership, Role.name)
            .join(Role, Role.id == Membership.role_id)
            .where(
                Membership.user_id == user.id,
                Membership.school_id == school_id,
                Membership.is_active.is_(True),
            )
        ).first()
        membership = membership_row[0] if membership_row else None
        existing_role_name = membership_row[1] if membership_row else None
        if membership:
            raise problem(
                status_code=409,
                title="Conflict",
                detail=f"Email already exists with {existing_role_name} role in this school.",
            )
        else:
            db.add(
                Membership(
                    user_id=user.id,
                    school_id=school_id,
                    role_id=role.id,
                    is_active=True,
                    created_at=now,
                )
            )
            user.tenant_id = school.tenant_id
            user.password_hash = hash_password(payload.password)

        if full_name:
            user.full_name = full_name
        user.is_active = payload.is_active
        user.updated_at = now
    else:
        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(payload.password),
            is_active=payload.is_active,
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        db.flush()
        db.add(
            Membership(
                user_id=user.id,
                school_id=school_id,
                role_id=role.id,
                is_active=True,
                created_at=now,
            )
        )

    db.commit()
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        photo_url=user.photo_url,
        is_active=user.is_active,
        role_name=role.name,
    )


@router.patch("/{user_id}", response_model=UserDetail, dependencies=[Depends(require_permission("users:write"))])
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> UserDetail:
    membership = db.scalar(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.school_id == school_id,
            Membership.is_active.is_(True),
        )
    )
    if not membership:
        raise not_found("User not found in this school")
    user = db.get(User, user_id)
    if not user:
        raise not_found("User not found")

    if payload.email and payload.email != user.email:
        existing = db.scalar(select(User).where(User.email == payload.email))
        if existing:
            raise problem(status_code=409, title="Conflict", detail="Email already exists")
        user.email = payload.email

    # Update profile fields
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.photo_url is not None:
        user.photo_url = payload.photo_url

    # Sync to Linked Guardians
    from app.models.guardian import Guardian
    guardians = db.execute(select(Guardian).where(Guardian.user_id == user.id)).scalars().all()
    for g in guardians:
        if payload.email:
            g.email = payload.email
        if payload.full_name:
            g.full_name = payload.full_name
        if payload.phone:
            g.phone = payload.phone
        if payload.photo_url:
            g.photo_url = payload.photo_url

    if payload.password:
        user.password_hash = hash_password(payload.password)

    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.role_name:
        ensure_default_roles(db)
        role = db.scalar(select(Role).where(Role.name == payload.role_name))
        if not role:
            raise problem(status_code=400, title="Bad Request", detail="Unknown role_name")
        membership.role_id = role.id

    user.updated_at = datetime.now(timezone.utc)
    db.commit()

    role = db.get(Role, membership.role_id)
    return UserDetail(
        id=user.id, 
        email=user.email, 
        full_name=user.full_name,
        phone=user.phone,
        photo_url=user.photo_url,
        is_active=user.is_active, 
        school_id=school_id, 
        role_name=(role.name if role else "")
    )


@router.delete("/{user_id}", dependencies=[Depends(require_permission("users:write"))])
def deactivate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    membership = db.scalar(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.school_id == school_id,
            Membership.is_active.is_(True),
        )
    )
    if not membership:
        raise not_found("User not found in this school")
    user = db.get(User, user_id)
    if not user:
        raise not_found("User not found")

    membership.is_active = False
    user.is_active = False
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.patch("/{user_id}/activate", dependencies=[Depends(require_permission("users:write"))], include_in_schema=False)
def activate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    update_user(user_id=user_id, payload=UserUpdate(is_active=True), db=db, school_id=school_id)
    return {"status": "ok"}


@router.patch("/{user_id}/deactivate", dependencies=[Depends(require_permission("users:write"))], include_in_schema=False)
def deactivate_user_alias(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    school_id=Depends(get_active_school_id),
) -> dict[str, str]:
    deactivate_user(user_id=user_id, db=db, school_id=school_id)
    return {"status": "ok"}
