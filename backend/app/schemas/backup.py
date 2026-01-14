import uuid
from typing import Optional

from pydantic import BaseModel, Field


class BackupEntryOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    created_by_user_id: uuid.UUID
    status: str
    filename: str
    notes: Optional[str]


class CreateBackupRequest(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=500)

