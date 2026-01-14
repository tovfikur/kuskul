import uuid
from typing import Optional

from pydantic import BaseModel, Field


class MessageOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    sender_id: uuid.UUID
    recipient_id: uuid.UUID
    content: str
    is_read: bool


class SendMessageRequest(BaseModel):
    recipient_id: uuid.UUID
    content: str = Field(min_length=1, max_length=4000)


class ConversationOut(BaseModel):
    user_id: uuid.UUID
    last_message: Optional[str]
    last_message_at: Optional[str]
    unread_count: int

