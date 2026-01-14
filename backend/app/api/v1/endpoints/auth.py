import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.problems import forbidden, not_found, not_implemented, problem, unauthorized
from app.core.security import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    new_refresh_token,
    verify_password,
)
from app.core.seed import ensure_default_roles
from app.db.session import get_db
from app.models.guardian import Guardian
from app.models.membership import Membership
from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.role import Role
from app.models.school import School
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MeResponse,
    ParentRegisterRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateEmailRequest,
)
from app.api.deps import get_current_user

router = APIRouter()


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.refresh_token_cookie_name,
        value=token,
        httponly=True,
        secure=settings.refresh_token_cookie_secure,
        samesite=settings.refresh_token_cookie_samesite,
        max_age=settings.refresh_token_expires_days * 24 * 60 * 60,
        path=f"{settings.api_v1_prefix}/auth",
    )


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise problem(status_code=409, title="Conflict", detail="Email already registered")

    now = datetime.now(timezone.utc)
    user = User(email=payload.email, password_hash=hash_password(payload.password), is_active=True, created_at=now, updated_at=now)
    db.add(user)

    school_existing = db.scalar(select(School).where(School.code == payload.school_code))
    if school_existing:
        raise problem(status_code=409, title="Conflict", detail="School code already exists")

    school = School(name=payload.school_name, code=payload.school_code, is_active=True, created_at=now)
    db.add(school)

    ensure_default_roles(db)
    role = db.scalar(select(Role).where(Role.name == "admin"))

    db.flush()
    membership = Membership(user_id=user.id, school_id=school.id, role_id=role.id, is_active=True, created_at=now)
    db.add(membership)

    raw_refresh = new_refresh_token()
    refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh),
        expires_at=now + timedelta(days=settings.refresh_token_expires_days),
        revoked_at=None,
        created_at=now,
    )
    db.add(refresh)
    db.commit()

    _set_refresh_cookie(response, raw_refresh)
    access = create_access_token(subject=str(user.id), claims={"email": user.email})
    return TokenResponse(access_token=access)


@router.post("/register-parent", response_model=TokenResponse)
def register_parent(payload: ParentRegisterRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise problem(status_code=409, title="Conflict", detail="Email already registered")

    school = db.scalar(select(School).where(School.code == payload.school_code))
    if not school or not school.is_active:
        raise not_found("School not found")

    now = datetime.now(timezone.utc)
    user = User(email=payload.email, password_hash=hash_password(payload.password), is_active=True, created_at=now, updated_at=now)
    db.add(user)

    ensure_default_roles(db)
    role = db.scalar(select(Role).where(Role.name == "parent"))
    if not role:
        raise problem(status_code=500, title="Internal Server Error", detail="Parent role is not configured")

    db.flush()
    db.add(Membership(user_id=user.id, school_id=school.id, role_id=role.id, is_active=True, created_at=now))

    guardian: Optional[Guardian] = None
    if payload.guardian_id:
        guardian = db.get(Guardian, payload.guardian_id)
        if not guardian or guardian.school_id != school.id:
            raise not_found("Guardian not found")
        phone_match = payload.guardian_phone and guardian.phone and payload.guardian_phone.strip() == guardian.phone.strip()
        email_match = payload.guardian_email and guardian.email and str(payload.guardian_email).lower() == str(guardian.email).lower()
        if not phone_match and not email_match:
            raise forbidden("Guardian verification failed")
        if guardian.user_id and guardian.user_id != user.id:
            raise problem(status_code=409, title="Conflict", detail="Guardian is already linked to another account")
        guardian.user_id = user.id
    else:
        full_name = payload.guardian_full_name or payload.email.split("@", 1)[0]
        guardian = Guardian(
            school_id=school.id,
            user_id=user.id,
            full_name=full_name,
            phone=payload.guardian_phone,
            email=str(payload.guardian_email) if payload.guardian_email else None,
            address=None,
            created_at=now,
        )
        db.add(guardian)

    raw_refresh = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_refresh),
            expires_at=now + timedelta(days=settings.refresh_token_expires_days),
            revoked_at=None,
            created_at=now,
        )
    )
    db.commit()

    _set_refresh_cookie(response, raw_refresh)
    access = create_access_token(subject=str(user.id), claims={"email": user.email})
    return TokenResponse(access_token=access)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not user.is_active:
        raise unauthorized("Invalid credentials")
    if not verify_password(payload.password, user.password_hash):
        raise unauthorized("Invalid credentials")

    has_membership = db.scalar(select(Membership).where(Membership.user_id == user.id, Membership.is_active.is_(True)))
    if not has_membership:
        raise forbidden("User has no active school membership")

    now = datetime.now(timezone.utc)
    raw_refresh = new_refresh_token()
    refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh),
        expires_at=now + timedelta(days=settings.refresh_token_expires_days),
        revoked_at=None,
        created_at=now,
    )
    db.add(refresh)
    db.commit()

    _set_refresh_cookie(response, raw_refresh)
    access = create_access_token(subject=str(user.id), claims={"email": user.email})
    return TokenResponse(access_token=access)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None, alias=settings.refresh_token_cookie_name),
) -> TokenResponse:
    if refresh_token is None:
        raise unauthorized("Missing refresh token cookie")

    token_hash = hash_refresh_token(refresh_token)
    token_row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    now = datetime.now(timezone.utc)
    expires_at = token_row.expires_at.replace(tzinfo=timezone.utc) if token_row and token_row.expires_at.tzinfo is None else (token_row.expires_at if token_row else None)
    if not token_row or token_row.revoked_at is not None or (expires_at is not None and expires_at <= now):
        raise unauthorized("Invalid refresh token")

    user = db.get(User, token_row.user_id)
    if not user or not user.is_active:
        raise unauthorized("User not found or inactive")

    token_row.revoked_at = now
    raw_refresh = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_refresh),
            expires_at=now + timedelta(days=settings.refresh_token_expires_days),
            revoked_at=None,
            created_at=now,
        )
    )
    db.commit()

    _set_refresh_cookie(response, raw_refresh)
    access = create_access_token(subject=str(user.id), claims={"email": user.email})
    return TokenResponse(access_token=access)


@router.post("/refresh-token", response_model=TokenResponse, include_in_schema=False)
def refresh_token_alias(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None, alias=settings.refresh_token_cookie_name),
) -> TokenResponse:
    return refresh(response=response, db=db, refresh_token=refresh_token)


@router.post("/logout")
def logout(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None, alias=settings.refresh_token_cookie_name),
) -> dict[str, str]:
    if refresh_token:
        token_hash = hash_refresh_token(refresh_token)
        token_row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        if token_row and token_row.revoked_at is None:
            token_row.revoked_at = datetime.now(timezone.utc)
            db.commit()

    response.delete_cookie(key=settings.refresh_token_cookie_name, path=f"{settings.api_v1_prefix}/auth")
    return {"status": "ok"}


@router.get("/profile", response_model=MeResponse, include_in_schema=False)
def profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MeResponse:
    return me(user=user, db=db)


@router.get("/verify-token", include_in_schema=False)
def verify_token(user: User = Depends(get_current_user)) -> dict[str, str]:
    return {"status": "ok", "user_id": str(user.id)}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> ForgotPasswordResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not user.is_active:
        return ForgotPasswordResponse(status="ok", reset_token=None)

    now = datetime.now(timezone.utc)
    raw = secrets.token_urlsafe(48)
    token_hash = hash_refresh_token(raw)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(minutes=30),
            used_at=None,
            created_at=now,
        )
    )
    db.commit()
    return ForgotPasswordResponse(status="ok", reset_token=raw if settings.environment != "production" else None)


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    now = datetime.now(timezone.utc)
    token_hash = hash_refresh_token(payload.reset_token)
    row = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash))
    if not row:
        raise unauthorized("Invalid reset token")
    expires_at = row.expires_at.replace(tzinfo=timezone.utc) if row.expires_at.tzinfo is None else row.expires_at
    if row.used_at is not None or expires_at <= now:
        raise unauthorized("Invalid reset token")
    user = db.get(User, row.user_id)
    if not user or not user.is_active:
        raise unauthorized("Invalid reset token")
    user.password_hash = hash_password(payload.new_password)
    user.updated_at = now
    row.used_at = now
    db.commit()
    return {"status": "ok"}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict[str, str]:
    if not verify_password(payload.current_password, user.password_hash):
        raise unauthorized("Invalid credentials")
    now = datetime.now(timezone.utc)
    user.password_hash = hash_password(payload.new_password)
    user.updated_at = now
    db.commit()
    return {"status": "ok"}


@router.put("/profile", response_model=MeResponse)
def update_profile(payload: UpdateEmailRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MeResponse:
    existing = db.scalar(select(User).where(User.email == payload.email, User.id != user.id))
    if existing:
        raise problem(status_code=409, title="Conflict", detail="Email already registered")
    user.email = payload.email
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return me(user=user, db=db)


@router.post("/verify-email", include_in_schema=False)
def verify_email() -> None:
    raise not_implemented("Email verification is not implemented yet")


@router.post("/resend-verification", include_in_schema=False)
def resend_verification() -> None:
    raise not_implemented("Email verification is not implemented yet")


@router.post("/enable-2fa", include_in_schema=False)
def enable_two_factor() -> None:
    raise not_implemented("2FA is not implemented yet")


@router.post("/verify-2fa", include_in_schema=False)
def verify_two_factor() -> None:
    raise not_implemented("2FA is not implemented yet")


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MeResponse:
    results = db.execute(
        select(Membership, School)
        .join(School, Membership.school_id == School.id)
        .where(Membership.user_id == user.id, Membership.is_active.is_(True))
    ).all()
    items: list[dict] = []
    for m, s in results:
        items.append({
            "school_id": str(m.school_id),
            "role_id": str(m.role_id),
            "school_name": s.name
        })
    return MeResponse(user_id=user.id, email=user.email, memberships=items)
