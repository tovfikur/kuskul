import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class LibraryBookOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    title: str
    author: Optional[str]
    category: Optional[str]
    isbn: Optional[str]
    description: Optional[str]
    total_copies: int
    available_copies: int
    cover_url: Optional[str]


class LibraryBookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    author: Optional[str] = Field(default=None, max_length=150)
    category: Optional[str] = Field(default=None, max_length=80)
    isbn: Optional[str] = Field(default=None, max_length=32)
    description: Optional[str] = Field(default=None, max_length=2000)
    total_copies: int = Field(default=1, ge=0, le=100000)


class LibraryBookUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    author: Optional[str] = Field(default=None, max_length=150)
    category: Optional[str] = Field(default=None, max_length=80)
    isbn: Optional[str] = Field(default=None, max_length=32)
    description: Optional[str] = Field(default=None, max_length=2000)
    total_copies: Optional[int] = Field(default=None, ge=0, le=100000)


class LibraryIssueOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    book_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    due_date: date
    renewed_count: int
    fine_amount: int


class IssueBookRequest(BaseModel):
    book_id: uuid.UUID
    user_id: uuid.UUID
    due_date: Optional[date] = None


class ReturnBookRequest(BaseModel):
    issue_id: uuid.UUID

