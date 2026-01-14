import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.problems import not_found, problem
from app.db.session import get_db
from app.models.role import Role
from app.schemas.roles import RoleCreate, RoleOut, RolePermissionsUpdate, RoleUpdate

router = APIRouter(dependencies=[Depends(require_permission("super:*"))])


@router.get("", response_model=list[RoleOut])
def list_roles(db: Session = Depends(get_db)) -> list[RoleOut]:
    roles = db.execute(select(Role).order_by(Role.name.asc())).scalars().all()
    return [RoleOut(id=r.id, name=r.name, permissions=r.permissions or {}) for r in roles]


@router.get("/{role_id}", response_model=RoleOut)
def get_role(role_id: uuid.UUID, db: Session = Depends(get_db)) -> RoleOut:
    role = db.get(Role, role_id)
    if not role:
        raise not_found("Role not found")
    return RoleOut(id=role.id, name=role.name, permissions=role.permissions or {})


@router.post("", response_model=RoleOut)
def create_role(payload: RoleCreate, db: Session = Depends(get_db)) -> RoleOut:
    existing = db.scalar(select(Role).where(Role.name == payload.name))
    if existing:
        raise problem(status_code=409, title="Conflict", detail="Role name already exists")
    role = Role(name=payload.name, permissions=payload.permissions or {})
    db.add(role)
    db.commit()
    db.refresh(role)
    return RoleOut(id=role.id, name=role.name, permissions=role.permissions or {})


@router.put("/{role_id}", response_model=RoleOut)
def update_role(role_id: uuid.UUID, payload: RoleUpdate, db: Session = Depends(get_db)) -> RoleOut:
    role = db.get(Role, role_id)
    if not role:
        raise not_found("Role not found")
    if payload.name and payload.name != role.name:
        existing = db.scalar(select(Role).where(Role.name == payload.name))
        if existing:
            raise problem(status_code=409, title="Conflict", detail="Role name already exists")
        role.name = payload.name
    db.commit()
    return RoleOut(id=role.id, name=role.name, permissions=role.permissions or {})


@router.delete("/{role_id}")
def delete_role(role_id: uuid.UUID, db: Session = Depends(get_db)) -> dict[str, str]:
    role = db.get(Role, role_id)
    if not role:
        raise not_found("Role not found")
    db.delete(role)
    db.commit()
    return {"status": "ok"}


@router.get("/{role_id}/permissions", response_model=dict)
def get_role_permissions(role_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    role = db.get(Role, role_id)
    if not role:
        raise not_found("Role not found")
    return role.permissions or {}


@router.put("/{role_id}/permissions", response_model=dict)
def update_role_permissions(role_id: uuid.UUID, payload: RolePermissionsUpdate, db: Session = Depends(get_db)) -> dict:
    role = db.get(Role, role_id)
    if not role:
        raise not_found("Role not found")
    role.permissions = payload.permissions or {}
    db.commit()
    return role.permissions or {}

