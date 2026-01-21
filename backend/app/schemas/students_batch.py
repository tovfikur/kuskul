import uuid

from pydantic import BaseModel, Field


class StudentsBatchRequest(BaseModel):
    student_ids: list[uuid.UUID] = Field(default_factory=list, max_length=500)

