import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class CommunicationLogOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    sent_by_user_id: uuid.UUID
    communication_type: str
    status: str
    recipient: str
    subject: Optional[str]
    body: Optional[str]
    student_id: Optional[uuid.UUID] = None
    category: Optional[str] = None
    provider_result: Optional[str] = None
    created_at: datetime


class SendSmsRequest(BaseModel):
    recipients: list[str] = Field(min_length=1)
    message: str = Field(min_length=1, max_length=2000)


class SendEmailRequest(BaseModel):
    recipients: list[str] = Field(min_length=1)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=2000)


class TestSmsRequest(BaseModel):
    recipient: str = Field(min_length=1, max_length=50)
    message: str = Field(min_length=1, max_length=2000)

