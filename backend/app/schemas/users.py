import uuid
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role_name: str = Field(min_length=2, max_length=64)

    @field_validator("password")
    @classmethod
    def _bcrypt_max_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 bytes")
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=32)
    photo_url: Optional[str] = Field(default=None, max_length=500)
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    is_active: Optional[bool] = None
    role_name: Optional[str] = Field(default=None, min_length=2, max_length=64)

    @field_validator("password")
    @classmethod
    def _bcrypt_max_bytes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 bytes")
        return v


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: bool
    role_name: Optional[str] = None


class UserDetail(UserOut):
    school_id: uuid.UUID
    role_name: str


class UserList(BaseModel):
    items: list[UserOut]
    total: int
    offset: int
    limit: int
