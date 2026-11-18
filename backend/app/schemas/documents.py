import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    uploaded_by_user_id: Optional[uuid.UUID] = None
    entity_type: Optional[str]
    entity_id: Optional[str]
    filename: str
    content_type: Optional[str] = None
    created_at: datetime

