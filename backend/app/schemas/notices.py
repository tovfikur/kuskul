import uuid
from typing import Optional

from pydantic import BaseModel, Field


class NoticeOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    notice_type: Optional[str]
    target_audience: Optional[str]
    title: str
    content: str
    attachment_url: Optional[str]
    is_published: bool


class NoticeCreate(BaseModel):
    notice_type: Optional[str] = Field(default=None, max_length=32)
    target_audience: Optional[str] = Field(default=None, max_length=32)
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=4000)


class NoticeUpdate(BaseModel):
    notice_type: Optional[str] = Field(default=None, max_length=32)
    target_audience: Optional[str] = Field(default=None, max_length=32)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    content: Optional[str] = Field(default=None, min_length=1, max_length=4000)
    attachment_url: Optional[str] = Field(default=None, max_length=500)

