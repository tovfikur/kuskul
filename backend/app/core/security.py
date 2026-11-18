import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

PUBLIC_ADMISSION_SCOPE = "admission_form"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(*, subject: str, claims: dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=settings.jwt_access_token_expires_minutes)
    payload = {
        "sub": subject,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        **claims,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=["HS256"],
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
    )


def create_public_admission_token(*, school_id: uuid.UUID, version: str) -> str:
    payload = {
        "scope": PUBLIC_ADMISSION_SCOPE,
        "school_id": str(school_id),
        "version": version,
        "iat": int(datetime.now(timezone.utc).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")


def decode_public_admission_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
    except JWTError as exc:
        raise ValueError("Invalid admission form token") from exc
    if payload.get("scope") != PUBLIC_ADMISSION_SCOPE:
        raise ValueError("Invalid token scope")
    if not payload.get("school_id") or not payload.get("version"):
        raise ValueError("Invalid token payload")
    return payload


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
