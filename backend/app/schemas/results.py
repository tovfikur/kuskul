import uuid
from typing import Optional

from pydantic import BaseModel


class ResultOut(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    student_id: uuid.UUID
    total_marks: int
    obtained_marks: int
    percentage: float
    grade_id: Optional[uuid.UUID]

