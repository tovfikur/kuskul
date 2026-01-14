import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

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


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
