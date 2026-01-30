import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.deps import require_platform_admin, require_saas_admin_host
from app.core.problems import not_found, problem
from app.core.security import hash_password
from app.core.seed import ensure_default_roles
from app.db.session import get_db
from app.models.membership import Membership
from app.models.refresh_token import RefreshToken
from app.models.role import Role
from app.models.school import School
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenants import (
    TenantAdminPasswordResetRequest,
    TenantAdminUpdateRequest,
    TenantOut,
    TenantProvisionRequest,
    TenantProvisionResponse,
    TenantStatusUpdate,
)

router = APIRouter(dependencies=[Depends(require_saas_admin_host()), Depends(require_platform_admin())])


_SUBDOMAIN_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$")


@router.get("", response_model=list[TenantOut])
def list_tenants(db: Session = Depends(get_db)) -> list[TenantOut]:
    admin_emails = (
        select(
            School.tenant_id.label("tenant_id"),
            func.min(User.email).label("admin_email"),
        )
        .join(Membership, Membership.school_id == School.id)
        .join(Role, Role.id == Membership.role_id)
        .join(User, User.id == Membership.user_id)
        .where(Membership.is_active.is_(True), Role.name == "admin")
        .group_by(School.tenant_id)
    ).subquery()

    rows = db.execute(
        select(Tenant, admin_emails.c.admin_email)
        .outerjoin(admin_emails, admin_emails.c.tenant_id == Tenant.id)
        .order_by(Tenant.created_at.desc())
    ).all()

    out: list[TenantOut] = []
    for tenant, admin_email in rows:
        out.append(TenantOut.model_validate(tenant).model_copy(update={"admin_email": admin_email}))
    return out


@router.post("", response_model=TenantProvisionResponse)
def provision_tenant(payload: TenantProvisionRequest, db: Session = Depends(get_db)) -> TenantProvisionResponse:
    subdomain = payload.subdomain.strip().lower()
    if not _SUBDOMAIN_RE.match(subdomain):
        raise problem(status_code=400, title="Validation Error", detail="Invalid subdomain format")

    existing = db.scalar(select(Tenant).where(Tenant.subdomain == subdomain))
    if existing:
        raise problem(status_code=409, title="Conflict", detail="Subdomain already exists")

    now = datetime.now(timezone.utc)
    tenant = Tenant(
        name=payload.name.strip(),
        subdomain=subdomain,
        custom_domain=(payload.custom_domain.strip() if payload.custom_domain else None),
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(tenant)
    db.flush()

    ensure_default_roles(db)

    admin_email = payload.admin_email.strip().lower()
    existing_user = db.scalar(select(User).where(User.email == admin_email))
    if existing_user:
        raise problem(status_code=409, title="Conflict", detail="Admin email already exists")

    admin_user = User(
        tenant_id=tenant.id,
        email=admin_email,
        full_name=None,
        phone=None,
        photo_url=None,
        password_hash=hash_password(payload.admin_password),
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(admin_user)
    db.flush()

    school_code = (payload.school_code.strip() if payload.school_code else f"TENANT_{subdomain.upper()}")
    existing_school = db.scalar(select(School).where(School.code == school_code))
    if existing_school:
        school_code = f"{school_code}_{uuid.uuid4().hex[:6].upper()}"

    school = School(
        tenant_id=tenant.id,
        name=payload.school_name.strip(),
        code=school_code,
        is_active=True,
        created_at=now,
    )
    db.add(school)
    db.flush()

    role = db.scalar(select(Role).where(Role.name == "admin"))
    if not role:
        raise problem(status_code=500, title="Internal Server Error", detail="Admin role missing")

    db.add(Membership(user_id=admin_user.id, school_id=school.id, role_id=role.id, is_active=True, created_at=now))
    db.commit()
    db.refresh(tenant)

    return TenantProvisionResponse(tenant=TenantOut.model_validate(tenant), school_id=school.id, admin_user_id=admin_user.id)


@router.patch("/{tenant_id}/status", response_model=TenantOut)
def update_tenant_status(tenant_id: uuid.UUID, payload: TenantStatusUpdate, db: Session = Depends(get_db)) -> TenantOut:
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise not_found("Tenant not found")
    status = payload.status.strip().lower()
    if status not in {"active", "inactive"}:
        raise problem(status_code=400, title="Validation Error", detail="Status must be active or inactive")
    tenant.status = status
    tenant.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tenant)
    return TenantOut.model_validate(tenant)


@router.post("/{tenant_id}/admin-password")
def reset_tenant_admin_password(
    tenant_id: uuid.UUID,
    payload: TenantAdminPasswordResetRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise not_found("Tenant not found")

    email = payload.admin_email.strip().lower()
    user = db.scalar(select(User).where(User.email == email, User.tenant_id == tenant_id))
    if not user or not user.is_active:
        raise not_found("Tenant admin not found")

    is_admin = db.execute(
        select(Membership)
        .join(Role, Role.id == Membership.role_id)
        .join(School, School.id == Membership.school_id)
        .where(
            Membership.user_id == user.id,
            Membership.is_active.is_(True),
            School.tenant_id == tenant_id,
            Role.name == "admin",
        )
        .limit(1)
    ).scalar_one_or_none()
    if not is_admin:
        raise not_found("Tenant admin not found")

    user.password_hash = hash_password(payload.new_password)
    user.updated_at = datetime.now(timezone.utc)

    db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))
    db.commit()

    return {"status": "ok"}


@router.patch("/{tenant_id}/admin", response_model=TenantOut)
def update_tenant_admin(
    tenant_id: uuid.UUID,
    payload: TenantAdminUpdateRequest,
    db: Session = Depends(get_db),
) -> TenantOut:
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise not_found("Tenant not found")

    current_email = payload.current_admin_email.strip().lower()
    new_email = payload.new_admin_email.strip().lower() if payload.new_admin_email else None
    new_password = payload.new_password

    user = db.execute(
        select(User)
        .join(Membership, Membership.user_id == User.id)
        .join(Role, Role.id == Membership.role_id)
        .join(School, School.id == Membership.school_id)
        .where(
            User.tenant_id == tenant_id,
            User.email == current_email,
            User.is_active.is_(True),
            Membership.is_active.is_(True),
            School.tenant_id == tenant_id,
            Role.name == "admin",
        )
        .limit(1)
    ).scalar_one_or_none()
    if not user:
        raise not_found("Tenant admin not found")

    if new_email and new_email != current_email:
        existing_user = db.scalar(select(User).where(User.email == new_email))
        if existing_user:
            raise problem(status_code=409, title="Conflict", detail="Email already exists")
        user.email = new_email

    if new_password:
        user.password_hash = hash_password(new_password)
        db.execute(delete(RefreshToken).where(RefreshToken.user_id == user.id))

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tenant)

    return TenantOut.model_validate(tenant).model_copy(update={"admin_email": user.email})
