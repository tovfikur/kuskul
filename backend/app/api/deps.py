import uuid
from collections.abc import Callable
from typing import Optional

from fastapi import Depends, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.problems import forbidden, unauthorized
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.membership import Membership
from app.models.role import Role
from app.models.user import User
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(payload["sub"])
    except Exception as exc:
        raise unauthorized("Invalid access token") from exc

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise unauthorized("User not found or inactive")
    return user


def get_active_school_id(x_school_id: Optional[str] = Header(default=None)) -> uuid.UUID:
    if not x_school_id:
        raise forbidden("X-School-Id header is required for this endpoint")
    try:
        return uuid.UUID(x_school_id)
    except Exception as exc:
        raise forbidden("Invalid X-School-Id") from exc


def is_super_admin(db: Session, user_id: uuid.UUID) -> bool:
    perms = db.execute(
        select(Role.permissions)
        .join(Membership, Membership.role_id == Role.id)
        .where(Membership.user_id == user_id, Membership.is_active.is_(True))
    ).scalars().all()
    for p in perms:
        allow = set((p or {}).get("allow", []))
        if "super:*" in allow:
            return True
    return False


def has_permission(db: Session, *, user_id: uuid.UUID, school_id: uuid.UUID, permission: str) -> bool:
    membership = db.scalar(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.school_id == school_id,
            Membership.is_active.is_(True),
        )
    )
    if not membership:
        return False
    role = db.get(Role, membership.role_id)
    allow = set(((role.permissions if role else None) or {}).get("allow", []))
    return permission in allow or "super:*" in allow


def require_permission(permission: str) -> Callable:
    def dependency(
        *,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
        x_school_id: Optional[str] = Header(default=None),
    ) -> None:
        if not x_school_id:
            if is_super_admin(db, user.id):
                return
            raise forbidden("X-School-Id header is required for this endpoint")
        try:
            school_id = uuid.UUID(x_school_id)
        except Exception as exc:
            raise forbidden("Invalid X-School-Id") from exc

        if not has_permission(db, user_id=user.id, school_id=school_id, permission=permission):
            raise forbidden("Missing required permission")

    return dependency
