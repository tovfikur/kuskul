import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TenantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    subdomain: str
    custom_domain: Optional[str] = None
    status: str
    admin_email: Optional[str] = None


class TenantProvisionRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    subdomain: str = Field(min_length=2, max_length=63)
    custom_domain: Optional[str] = Field(default=None, max_length=255)
    admin_email: str = Field(min_length=3, max_length=255)
    admin_password: str = Field(min_length=6, max_length=255)
    school_name: str = Field(min_length=2, max_length=255)
    school_code: Optional[str] = Field(default=None, min_length=2, max_length=64)


class TenantProvisionResponse(BaseModel):
    tenant: TenantOut
    school_id: uuid.UUID
    admin_user_id: uuid.UUID


class TenantStatusUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=20)


class TenantAdminPasswordResetRequest(BaseModel):
    admin_email: str = Field(min_length=3, max_length=255)
    new_password: str = Field(min_length=6, max_length=255)


class TenantAdminUpdateRequest(BaseModel):
    current_admin_email: str = Field(min_length=3, max_length=255)
    new_admin_email: Optional[str] = Field(default=None, min_length=3, max_length=255)
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=255)
