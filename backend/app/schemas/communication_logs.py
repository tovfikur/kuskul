import uuid
from datetime import date
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


class SendSmsRequest(BaseModel):
    recipients: list[str] = Field(min_length=1)
    message: str = Field(min_length=1, max_length=2000)


class SendEmailRequest(BaseModel):
    recipients: list[str] = Field(min_length=1)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=2000)

