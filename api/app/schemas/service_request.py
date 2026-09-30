from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.service_request import ServiceRequestStatus


class ServiceRequestCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    location: str | None = Field(default=None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None


class ServiceRequestUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1)
    location: str | None = Field(default=None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None


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
    created_at: datetime
    updated_at: datetime