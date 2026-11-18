import uuid
from typing import Optional

from pydantic import BaseModel, Field

CHAPTER_NAME_PATTERN = r"^Chapter ([1-9]|1[0-5])$"


class CurriculumUnitOut(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    subject_id: uuid.UUID
    title: str
    chapter_name: Optional[str] = None
    description: Optional[str] = None
    order_index: int


class CurriculumUnitCreate(BaseModel):
    academic_year_id: uuid.UUID
    subject_id: uuid.UUID
    title: str = Field(min_length=1, max_length=200)
    chapter_name: Optional[str] = Field(
        default=None, max_length=50, pattern=CHAPTER_NAME_PATTERN
    )
    description: Optional[str] = None
    order_index: int = 0


class CurriculumUnitUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    chapter_name: Optional[str] = Field(
        default=None, max_length=50, pattern=CHAPTER_NAME_PATTERN
    )
    description: Optional[str] = None
    order_index: Optional[int] = None

