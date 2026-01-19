import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    school_id: uuid.UUID
    first_name: str
    last_name: Optional[str]
    admission_no: Optional[str]
    gender: Optional[str]
    date_of_birth: Optional[date]
    full_name_bc: Optional[str]
    place_of_birth: Optional[str]
    nationality: Optional[str]
    religion: Optional[str]
    blood_group: Optional[str]

    admission_date: Optional[date]
    admission_status: str
    medium: Optional[str]
    shift: Optional[str]
    previous_school_name: Optional[str]
    previous_class: Optional[str]
    transfer_certificate_no: Optional[str]

    present_address: Optional[str]
    permanent_address: Optional[str]
    city: Optional[str]
    thana: Optional[str]
    postal_code: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]

    known_allergies: Optional[str]
    chronic_illness: Optional[str]
    physical_disabilities: Optional[str]
    special_needs: Optional[str]
    doctor_name: Optional[str]
    doctor_phone: Optional[str]
    vaccination_status: Optional[str]

    birth_certificate_no: Optional[str]
    national_id_no: Optional[str]
    passport_no: Optional[str]

    fee_category: Optional[str]
    scholarship_type: Optional[str]
    portal_username: Optional[str]
    portal_access_student: bool
    portal_access_parent: bool
    remarks: Optional[str]

    rfid_nfc_no: Optional[str]
    hostel_status: Optional[str]
    library_card_no: Optional[str]
    status: str
    photo_url: Optional[str]


class StudentCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    admission_no: Optional[str] = Field(default=None, max_length=64)
    gender: Optional[str] = Field(default=None, max_length=16)
    date_of_birth: Optional[date] = None
    full_name_bc: Optional[str] = Field(default=None, max_length=200)
    place_of_birth: Optional[str] = Field(default=None, max_length=100)
    nationality: Optional[str] = Field(default=None, max_length=64)
    religion: Optional[str] = Field(default=None, max_length=64)
    blood_group: Optional[str] = Field(default=None, max_length=8)

    admission_date: Optional[date] = None
    admission_status: str = Field(default="pending", max_length=32)
    medium: Optional[str] = Field(default=None, max_length=32)
    shift: Optional[str] = Field(default=None, max_length=32)
    previous_school_name: Optional[str] = Field(default=None, max_length=200)
    previous_class: Optional[str] = Field(default=None, max_length=64)
    transfer_certificate_no: Optional[str] = Field(default=None, max_length=64)

    present_address: Optional[str] = Field(default=None, max_length=500)
    permanent_address: Optional[str] = Field(default=None, max_length=500)
    city: Optional[str] = Field(default=None, max_length=100)
    thana: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=32)

    known_allergies: Optional[str] = Field(default=None, max_length=500)
    chronic_illness: Optional[str] = Field(default=None, max_length=500)
    physical_disabilities: Optional[str] = Field(default=None, max_length=500)
    special_needs: Optional[str] = Field(default=None, max_length=500)
    doctor_name: Optional[str] = Field(default=None, max_length=200)
    doctor_phone: Optional[str] = Field(default=None, max_length=32)
    vaccination_status: Optional[str] = Field(default=None, max_length=100)

    birth_certificate_no: Optional[str] = Field(default=None, max_length=64)
    national_id_no: Optional[str] = Field(default=None, max_length=64)
    passport_no: Optional[str] = Field(default=None, max_length=64)

    fee_category: Optional[str] = Field(default=None, max_length=64)
    scholarship_type: Optional[str] = Field(default=None, max_length=64)
    portal_username: Optional[str] = Field(default=None, max_length=64)
    portal_access_student: bool = False
    portal_access_parent: bool = False
    remarks: Optional[str] = Field(default=None, max_length=1000)

    rfid_nfc_no: Optional[str] = Field(default=None, max_length=64)
    hostel_status: Optional[str] = Field(default=None, max_length=32)
    library_card_no: Optional[str] = Field(default=None, max_length=64)
    status: str = Field(default="active", max_length=32)


class StudentUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    admission_no: Optional[str] = Field(default=None, max_length=64)
    gender: Optional[str] = Field(default=None, max_length=16)
    date_of_birth: Optional[date] = None
    full_name_bc: Optional[str] = Field(default=None, max_length=200)
    place_of_birth: Optional[str] = Field(default=None, max_length=100)
    nationality: Optional[str] = Field(default=None, max_length=64)
    religion: Optional[str] = Field(default=None, max_length=64)
    blood_group: Optional[str] = Field(default=None, max_length=8)

    admission_date: Optional[date] = None
    admission_status: Optional[str] = Field(default=None, max_length=32)
    medium: Optional[str] = Field(default=None, max_length=32)
    shift: Optional[str] = Field(default=None, max_length=32)
    previous_school_name: Optional[str] = Field(default=None, max_length=200)
    previous_class: Optional[str] = Field(default=None, max_length=64)
    transfer_certificate_no: Optional[str] = Field(default=None, max_length=64)

    present_address: Optional[str] = Field(default=None, max_length=500)
    permanent_address: Optional[str] = Field(default=None, max_length=500)
    city: Optional[str] = Field(default=None, max_length=100)
    thana: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    emergency_contact_name: Optional[str] = Field(default=None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=32)

    known_allergies: Optional[str] = Field(default=None, max_length=500)
    chronic_illness: Optional[str] = Field(default=None, max_length=500)
    physical_disabilities: Optional[str] = Field(default=None, max_length=500)
    special_needs: Optional[str] = Field(default=None, max_length=500)
    doctor_name: Optional[str] = Field(default=None, max_length=200)
    doctor_phone: Optional[str] = Field(default=None, max_length=32)
    vaccination_status: Optional[str] = Field(default=None, max_length=100)

    birth_certificate_no: Optional[str] = Field(default=None, max_length=64)
    national_id_no: Optional[str] = Field(default=None, max_length=64)
    passport_no: Optional[str] = Field(default=None, max_length=64)

    fee_category: Optional[str] = Field(default=None, max_length=64)
    scholarship_type: Optional[str] = Field(default=None, max_length=64)
    portal_username: Optional[str] = Field(default=None, max_length=64)
    portal_access_student: Optional[bool] = None
    portal_access_parent: Optional[bool] = None
    remarks: Optional[str] = Field(default=None, max_length=1000)

    rfid_nfc_no: Optional[str] = Field(default=None, max_length=64)
    hostel_status: Optional[str] = Field(default=None, max_length=32)
    library_card_no: Optional[str] = Field(default=None, max_length=64)
    status: Optional[str] = Field(default=None, max_length=32)
    photo_url: Optional[str] = Field(default=None, max_length=500)
