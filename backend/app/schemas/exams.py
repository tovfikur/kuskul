import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class ExamOut(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    name: str
    exam_code: Optional[str] = None
    exam_type_code: Optional[str] = None
    exam_type: Optional[str]
    status: str
    start_date: Optional[date]
    end_date: Optional[date]
    weight_percentage: Optional[int] = None
    included_in_final_result: bool = True
    best_of_count: Optional[int] = None
    aggregation_method: Optional[str] = None
    counts_for_gpa: bool = True
    result_entry_deadline: Optional[date] = None
    result_publish_date: Optional[date] = None
    locked_at: Optional[datetime] = None
    is_result_editable: bool = True
    instructions: Optional[str] = None
    is_published: bool


class ExamTypeOut(BaseModel):
    code: str
    label: str
    frequency_hint: Optional[str] = None
    weight_min: Optional[int] = None
    weight_max: Optional[int] = None
    is_active: bool


class ExamCreate(BaseModel):
    academic_year_id: uuid.UUID
    name: str = Field(min_length=1, max_length=150)
    exam_code: Optional[str] = Field(default=None, max_length=64)
    exam_type_code: Optional[str] = Field(default=None, max_length=32)
    exam_type: Optional[str] = Field(default=None, max_length=64)
    status: Optional[str] = Field(default=None, max_length=24)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    weight_percentage: Optional[int] = Field(default=None, ge=0, le=100)
    included_in_final_result: Optional[bool] = None
    best_of_count: Optional[int] = Field(default=None, ge=1, le=100)
    aggregation_method: Optional[str] = Field(default=None, max_length=24)
    counts_for_gpa: Optional[bool] = None
    result_entry_deadline: Optional[date] = None
    result_publish_date: Optional[date] = None
    is_result_editable: Optional[bool] = None
    instructions: Optional[str] = Field(default=None, max_length=4000)


class ExamUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    exam_code: Optional[str] = Field(default=None, max_length=64)
    exam_type_code: Optional[str] = Field(default=None, max_length=32)
    exam_type: Optional[str] = Field(default=None, max_length=64)
    status: Optional[str] = Field(default=None, max_length=24)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    weight_percentage: Optional[int] = Field(default=None, ge=0, le=100)
    included_in_final_result: Optional[bool] = None
    best_of_count: Optional[int] = Field(default=None, ge=1, le=100)
    aggregation_method: Optional[str] = Field(default=None, max_length=24)
    counts_for_gpa: Optional[bool] = None
    result_entry_deadline: Optional[date] = None
    result_publish_date: Optional[date] = None
    is_result_editable: Optional[bool] = None
    instructions: Optional[str] = Field(default=None, max_length=4000)

