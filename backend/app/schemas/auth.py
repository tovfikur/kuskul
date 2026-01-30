import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    school_name: str = Field(min_length=2, max_length=255)
    school_code: str = Field(min_length=2, max_length=64)

    @field_validator("password")
    @classmethod
    def _bcrypt_max_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 bytes")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("password")
    @classmethod
    def _bcrypt_max_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 bytes")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    memberships: list[dict]
    is_platform_admin: bool = False
    tenant_id: Optional[uuid.UUID] = None


class ParentRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    school_code: str = Field(min_length=2, max_length=64)

    guardian_id: Optional[uuid.UUID] = None
    guardian_full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    guardian_phone: Optional[str] = Field(default=None, max_length=32)
    guardian_email: Optional[EmailStr] = None

    @field_validator("password")
    @classmethod
    def _bcrypt_max_bytes_parent(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 bytes")
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    status: str = "ok"
    reset_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    reset_token: str = Field(min_length=10, max_length=500)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _bcrypt_max_bytes_reset(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("new_password must be at most 72 bytes")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("current_password")
    @classmethod
    def _bcrypt_max_bytes_current(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("current_password must be at most 72 bytes")
        return v

    @field_validator("new_password")
    @classmethod
    def _bcrypt_max_bytes_new(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("new_password must be at most 72 bytes")
        return v


class UpdateEmailRequest(BaseModel):
    email: EmailStr
