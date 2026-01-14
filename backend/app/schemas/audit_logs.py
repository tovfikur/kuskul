import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    details: Optional[str]
    created_at: datetime

