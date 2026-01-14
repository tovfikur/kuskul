import uuid
from typing import Optional

from pydantic import BaseModel, Field


class NotificationOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    user_id: uuid.UUID
    notification_type: Optional[str]
    title: str
    message: str
    is_read: bool


class NotificationSend(BaseModel):
    user_ids: list[uuid.UUID] = Field(min_length=1)
    notification_type: Optional[str] = Field(default=None, max_length=32)
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)

