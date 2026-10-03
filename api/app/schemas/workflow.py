from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.service_request import ServiceRequestStatus


class OfficerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str
    phone: str | None = None
    password: str = Field(min_length=8, max_length=128)
    department_id: int


class OfficerUpdate(BaseModel):
    department_id: int | None = None
    is_active: bool | None = None


class AssignmentUpdate(BaseModel):
    department_id: int | None = None
    assigned_officer_id: int | None = None


class OfficerResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None
    role: str
    department_id: int | None
    department_name: str | None
    is_active: bool


class StatusUpdate(BaseModel):
    status: ServiceRequestStatus
    note: str | None = None


class NoteCreate(BaseModel):
    note: str = Field(min_length=1, max_length=5000)


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_request_id: int
    officer_id: int
    note: str
    created_at: datetime
    updated_at: datetime


class StatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_request_id: int
    old_status: str | None
    new_status: str
    changed_by: int
    note: str | None
    created_at: datetime


class OfficerRequestResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    location: str | None
    latitude: float | None
    longitude: float | None
    image: str | None
    status: ServiceRequestStatus
    department_id: int | None
    department_name: str | None
    assigned_officer_id: int | None
    assigned_officer_name: str | None
    category: str | None
    priority: str | None
    ai_summary: str | None
    suggested_action: str | None
    confidence: float | None
    created_at: datetime
    updated_at: datetime