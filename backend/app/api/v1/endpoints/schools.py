from datetime import datetime, timezone

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, has_permission, is_super_admin, require_permission
from app.core.problems import not_found, problem
from app.core.seed import ensure_default_roles
from app.db.session import get_db
from app.models.membership import Membership
from app.models.role import Role
from app.models.school import School
from app.schemas.schools import SchoolCreate, SchoolOut, SchoolUpdate

router = APIRouter()


@router.get("", response_model=list[SchoolOut])
def list_schools(db: Session = Depends(get_db), user=Depends(get_current_user)) -> list[SchoolOut]:
    # If super admin, return all schools
    from app.api.deps import is_super_admin
    if is_super_admin(db, user.id):
        schools = db.execute(select(School)).scalars().all()
        return [SchoolOut(id=s.id, name=s.name, code=s.code, is_active=s.is_active) for s in schools]
    # Otherwise, only schools with membership
    school_ids = db.execute(
        select(Membership.school_id).where(Membership.user_id == user.id, Membership.is_active.is_(True))
    ).scalars().all()
    if not school_ids:
        return []
    schools = db.execute(select(School).where(School.id.in_(school_ids))).scalars().all()
    return [SchoolOut(id=s.id, name=s.name, code=s.code, is_active=s.is_active) for s in schools]


@router.post("", response_model=SchoolOut, dependencies=[Depends(require_permission("schools:write"))])
def create_school(payload: SchoolCreate, db: Session = Depends(get_db), user=Depends(get_current_user)) -> SchoolOut:
    existing = db.scalar(select(School).where(School.code == payload.code))
    if existing:
        raise problem(status_code=409, title="Conflict", detail="School code already exists")

    now = datetime.now(timezone.utc)
    school = School(name=payload.name, code=payload.code, is_active=True, created_at=now)
    db.add(school)
    ensure_default_roles(db)
    admin_role = db.scalar(select(Role).where(Role.name == "admin"))
    db.flush()
    if admin_role:
        db.add(Membership(user_id=user.id, school_id=school.id, role_id=admin_role.id, is_active=True, created_at=now))
    db.commit()
    return SchoolOut(id=school.id, name=school.name, code=school.code, is_active=school.is_active)


@router.get("/{school_id}", response_model=SchoolOut)
def get_school(school_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)) -> SchoolOut:
    if not is_super_admin(db, user.id):
        if not has_permission(db, user_id=user.id, school_id=school_id, permission="schools:read"):
            raise not_found("School not found")
    school = db.get(School, school_id)
    if not school:
        raise not_found("School not found")
    return SchoolOut(id=school.id, name=school.name, code=school.code, is_active=school.is_active)


@router.patch("/{school_id}", response_model=SchoolOut)
def update_school(
    school_id: uuid.UUID,
    payload: SchoolUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> SchoolOut:
    if not is_super_admin(db, user.id):
        if not has_permission(db, user_id=user.id, school_id=school_id, permission="schools:write"):
            raise not_found("School not found")

    school = db.get(School, school_id)
    if not school:
        raise not_found("School not found")

    if payload.code and payload.code != school.code:
        existing = db.scalar(select(School).where(School.code == payload.code))
        if existing:
            raise problem(status_code=409, title="Conflict", detail="School code already exists")
        school.code = payload.code
    if payload.name:
        school.name = payload.name
    if payload.is_active is not None:
        school.is_active = payload.is_active

    db.commit()
    return SchoolOut(id=school.id, name=school.name, code=school.code, is_active=school.is_active)


@router.delete("/{school_id}")
def delete_school(
    school_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> dict[str, str]:
    if not is_super_admin(db, user.id):
        if not has_permission(db, user_id=user.id, school_id=school_id, permission="schools:write"):
            raise not_found("School not found")
    school = db.get(School, school_id)
    if not school:
        raise not_found("School not found")
    school.is_active = False
    db.commit()
    return {"status": "ok"}


@router.patch("/{school_id}/activate", include_in_schema=False)
def activate_school(
    school_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> dict[str, str]:
    update_school(school_id=school_id, payload=SchoolUpdate(is_active=True), db=db, user=user)
    return {"status": "ok"}


@router.patch("/{school_id}/deactivate", include_in_schema=False)
def deactivate_school(
    school_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> dict[str, str]:
    update_school(school_id=school_id, payload=SchoolUpdate(is_active=False), db=db, user=user)
    return {"status": "ok"}
