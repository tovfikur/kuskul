import uuid
from typing import Any, Optional

from pydantic import BaseModel, Field


class RoleOut(BaseModel):
    id: uuid.UUID
    name: str
    permissions: dict[str, Any]


class RoleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=64)
    permissions: dict[str, Any] = Field(default_factory=dict)


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=64)


class RolePermissionsUpdate(BaseModel):
    permissions: dict[str, Any]

