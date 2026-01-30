import uuid
from collections.abc import Callable
from typing import Optional

from fastapi import Depends, Header, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.problems import forbidden, unauthorized
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.membership import Membership
from app.models.role import Role
from app.models.school import School
from app.models.user import User
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def get_current_user(request: Request, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(payload["sub"])
    except Exception as exc:
        raise unauthorized("Invalid access token") from exc

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise unauthorized("User not found or inactive")
    tenant_id = getattr(request.state, "tenant_id", None)
    is_saas_admin = bool(getattr(request.state, "is_saas_admin", False))
    if is_saas_admin:
        if user.tenant_id is not None:
            raise unauthorized("Invalid tenant context")
    elif tenant_id is not None:
        if user.tenant_id != tenant_id:
            raise unauthorized("Invalid tenant context")
    return user


def get_active_school_id(x_school_id: Optional[str] = Header(default=None)) -> uuid.UUID:
    if not x_school_id:
        raise forbidden("X-School-Id header is required for this endpoint")
    try:
        return uuid.UUID(x_school_id)
    except Exception as exc:
        raise forbidden("Invalid X-School-Id") from exc


def get_current_tenant_id(request: Request) -> Optional[uuid.UUID]:
    if hasattr(request.state, "tenant_id"):
        return request.state.tenant_id
    return None


def require_tenant() -> Callable:
    def dependency(request: Request) -> uuid.UUID:
        tenant_id = getattr(request.state, "tenant_id", None)
        if tenant_id is None:
            raise forbidden("Tenant is required")
        return tenant_id

    return dependency


def require_saas_admin_host() -> Callable:
    def dependency(request: Request) -> None:
        if not bool(getattr(request.state, "is_saas_admin", False)):
            raise forbidden("SaaS admin host is required")

    return dependency


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


def require_platform_admin() -> Callable:
    def dependency(
        *,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ) -> None:
        row = db.execute(
            select(Membership)
            .join(Role, Role.id == Membership.role_id)
            .where(
                Membership.user_id == user.id,
                Membership.is_active.is_(True),
                Role.name == "platform_admin",
            )
            .limit(1)
        ).scalar_one_or_none()
        if not row:
            raise forbidden("Platform admin access required")

    return dependency


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
        request: Request,
        x_school_id: Optional[str] = Header(default=None),
    ) -> None:
        if not x_school_id:
            raise forbidden("X-School-Id header is required for this endpoint")
        try:
            school_id = uuid.UUID(x_school_id)
        except Exception as exc:
            raise forbidden("Invalid X-School-Id") from exc

        tenant_id = getattr(request.state, "tenant_id", None)
        if tenant_id is None:
            raise forbidden("Tenant is required")
        school = db.get(School, school_id)
        if not school or school.tenant_id != tenant_id:
            raise forbidden("Invalid school for tenant")

        if not has_permission(db, user_id=user.id, school_id=school_id, permission=permission):
            raise forbidden("Missing required permission")

    return dependency
