import uuid
from typing import Optional

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    uploaded_by_user_id: uuid.UUID
    entity_type: Optional[str]
    entity_id: Optional[str]
    filename: str

