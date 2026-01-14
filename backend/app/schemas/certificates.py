import uuid
from typing import Optional

from pydantic import BaseModel, Field


class CertificateTemplateOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    template_type: str
    name: str
    content: str


class CertificateTemplateCreate(BaseModel):
    template_type: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=120)
    content: str = Field(min_length=1, max_length=4000)


class CertificateOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    student_id: uuid.UUID
    template_type: str
    filename: str
    notes: Optional[str]

