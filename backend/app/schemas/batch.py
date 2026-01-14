import uuid
from typing import Optional

from pydantic import BaseModel, Field


class BatchPromoteStudentsRequest(BaseModel):
    enrollment_ids: list[uuid.UUID] = Field(min_length=1)
    new_academic_year_id: uuid.UUID
    new_class_id: uuid.UUID
    new_section_id: Optional[uuid.UUID] = None


class BatchTransferStudentsRequest(BaseModel):
    enrollment_ids: list[uuid.UUID] = Field(min_length=1)
    new_section_id: Optional[uuid.UUID] = None

