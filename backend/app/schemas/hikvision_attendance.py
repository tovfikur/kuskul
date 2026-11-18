import uuid
from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class HikvisionDeviceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    external_device_id: Optional[str] = Field(default=None, max_length=128)
    app_key: Optional[str] = Field(default=None, max_length=255)
    secret_key: Optional[str] = Field(default=None, max_length=255)
    area_domain: Optional[str] = Field(default=None, max_length=255)
    timezone: str = Field(default="Asia/Dhaka", max_length=64)
    late_after: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    active: bool = True


class HikvisionDeviceOut(BaseModel):
    id: uuid.UUID
    name: str
    external_device_id: Optional[str]
    provider: str
    area_domain: Optional[str]
    timezone: str
    late_after: Optional[str]
    active: bool
    credentials_configured: bool
    last_sync_at: Optional[datetime]


class HikvisionDeviceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    external_device_id: Optional[str] = Field(default=None, max_length=128)
    app_key: Optional[str] = Field(default=None, max_length=255)
    secret_key: Optional[str] = Field(default=None, max_length=255)
    area_domain: Optional[str] = Field(default=None, max_length=255)
    timezone: Optional[str] = Field(default=None, max_length=64)
    late_after: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    active: Optional[bool] = None


class HikvisionCredentialCreate(BaseModel):
    student_id: uuid.UUID
    person_code: str = Field(min_length=1, max_length=64)


class HikvisionEventIn(BaseModel):
    person_code: str = Field(min_length=1, max_length=64)
    card_number: Optional[str] = Field(default=None, min_length=1, max_length=64)
    event_at: datetime
    external_event_id: Optional[str] = Field(default=None, max_length=128)
    verification_method: Optional[str] = Field(default="fingerprint", max_length=32)
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class HikvisionIngestRequest(BaseModel):
    events: list[HikvisionEventIn] = Field(min_length=1, max_length=2000)


class HikvisionSyncBatchRequest(BaseModel):
    start_date: date
    end_date: date
    page_index: int = Field(default=1, ge=1)
    cutoff: Optional[datetime] = None
    previous_page: Optional[str] = Field(default=None, pattern=r"^[a-f0-9]{64}$")
