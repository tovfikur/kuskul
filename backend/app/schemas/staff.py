import uuid
from datetime import date
from typing import Optional, Any

from pydantic import BaseModel, EmailStr, Field


class StaffOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    employee_id: Optional[str] = None
    
    # Linked entities (UUIDs)
    designation_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    
    # Legacy string fields
    designation: Optional[str] = None
    department: Optional[str] = None
    
    email: Optional[EmailStr]
    phone: Optional[str]
    
    # Personal Info
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    religion: Optional[str] = None
    
    # Address
    address: Optional[str] = None
    present_address: Optional[str] = None # Mapped from address
    permanent_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    
    date_of_joining: Optional[date]
    employment_type: Optional[str] = None
    status: str
    
    # Qualifications Summary
    highest_qualification: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    
    # Bank Details
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    
    photo_url: Optional[str]
    profile_photo_url: Optional[str] = None # Mapped from photo_url
    
    class Config:
        from_attributes = True


class StaffCreate(BaseModel):
    # Support either full_name OR first_name + last_name
    full_name: Optional[str] = Field(default=None, max_length=200)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    
    employee_id: Optional[str] = Field(default=None, max_length=64)
    
    designation_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    
    designation: Optional[str] = Field(default=None, max_length=100)
    department: Optional[str] = Field(default=None, max_length=100)
    
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=32)
    
    # Personal Info
    gender: Optional[str] = Field(default=None, max_length=20)
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = Field(default=None, max_length=10)
    nationality: Optional[str] = Field(default=None, max_length=100)
    religion: Optional[str] = None # Not in DB yet
    marital_status: Optional[str] = None # Not in DB yet
    
    # Address
    present_address: Optional[str] = None # Maps to address
    permanent_address: Optional[str] = None # Not in DB yet
    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    country: Optional[str] = None # Not in DB yet
    
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=32)
    emergency_contact_relation: Optional[str] = Field(default=None, max_length=64)
    
    date_of_joining: Optional[date] = None
    employment_type: Optional[str] = None # Not in DB yet
    status: str = Field(default="active", max_length=32)
    
    # Other new fields to accept but ignore for now
    highest_qualification: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    
    profile_photo_url: Optional[str] = None # Maps to photo_url


class StaffUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=200)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    
    employee_id: Optional[str] = Field(default=None, max_length=64)
    
    designation_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    
    designation: Optional[str] = Field(default=None, max_length=100)
    department: Optional[str] = Field(default=None, max_length=100)
    
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=32)
    
    gender: Optional[str] = Field(default=None, max_length=20)
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = Field(default=None, max_length=10)
    nationality: Optional[str] = Field(default=None, max_length=100)
    religion: Optional[str] = None 
    marital_status: Optional[str] = None
    
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    country: Optional[str] = None
    
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=32)
    emergency_contact_relation: Optional[str] = Field(default=None, max_length=64)
    
    date_of_joining: Optional[date] = None
    employment_type: Optional[str] = None
    status: Optional[str] = Field(default=None, max_length=32)
    
    highest_qualification: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    
    photo_url: Optional[str] = Field(default=None, max_length=500)
    profile_photo_url: Optional[str] = None


class StaffQualificationOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    staff_id: uuid.UUID
    title: str
    institution: Optional[str] = None
    issued_on: Optional[date] = None
    expires_on: Optional[date] = None
    credential_id: Optional[str] = None
    class Config:
        from_attributes = True


class StaffQualificationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    institution: Optional[str] = Field(default=None, max_length=200)
    issued_on: Optional[date] = None
    expires_on: Optional[date] = None
    credential_id: Optional[str] = Field(default=None, max_length=100)


class StaffPerformanceRecordOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    staff_id: uuid.UUID
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    rating: Optional[int] = None
    summary: Optional[str] = None
    created_by_user_id: uuid.UUID
    class Config:
        from_attributes = True


class StaffPerformanceRecordCreate(BaseModel):
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    summary: Optional[str] = Field(default=None, max_length=2000)
