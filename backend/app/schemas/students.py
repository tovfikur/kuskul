import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class StudentOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    first_name: str
    last_name: Optional[str]
    admission_no: Optional[str]
    gender: Optional[str]
    date_of_birth: Optional[date]
    status: str
    photo_url: Optional[str]


class StudentCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    admission_no: Optional[str] = Field(default=None, max_length=64)
    gender: Optional[str] = Field(default=None, max_length=16)
    date_of_birth: Optional[date] = None
    status: str = Field(default="active", max_length=32)


class StudentUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    admission_no: Optional[str] = Field(default=None, max_length=64)
    gender: Optional[str] = Field(default=None, max_length=16)
    date_of_birth: Optional[date] = None
    status: Optional[str] = Field(default=None, max_length=32)
    photo_url: Optional[str] = Field(default=None, max_length=500)

