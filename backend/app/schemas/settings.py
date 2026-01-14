import uuid

from pydantic import BaseModel, Field


class SettingOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    key: str
    value: str


class SettingUpdate(BaseModel):
    value: str = Field(min_length=0, max_length=4000)

