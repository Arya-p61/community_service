from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.service_request import ServiceRequestStatus


class ServiceRequestCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    location: str | None = Field(default=None, max_length=255)
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)


class ServiceRequestUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1)
    location: str | None = Field(default=None, max_length=255)
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)


class ServiceRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: str
    location: str | None
    latitude: float | None
    longitude: float | None
    image: str | None
    status: ServiceRequestStatus
    department_id: int | None = None
    department_name: str | None = None
    assigned_officer_id: int | None = None
    assigned_officer_name: str | None = None
    category: str | None = None
    priority: str | None = None
    created_at: datetime
    updated_at: datetime