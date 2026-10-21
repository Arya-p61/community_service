from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Citizen rating from 1 to 5")
    comment: str | None = Field(default=None, max_length=1000, description="Optional citizen comment (max 1000 characters)")


class FeedbackUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5, description="Updated rating from 1 to 5")
    comment: str | None = Field(default=None, max_length=1000, description="Updated comment")


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_request_id: int
    citizen_id: int
    rating: int
    comment: str | None = None
    created_at: datetime
    updated_at: datetime
    service_request_title: str | None = None
    department_name: str | None = None
    citizen_name: str | None = None


class DepartmentRatingSummary(BaseModel):
    department_id: int | None = None
    department_name: str
    count: int
    average_rating: float


class AdminFeedbackOverview(BaseModel):
    total_feedback: int
    average_rating: float
    rating_distribution: dict[int, int]
    department_breakdown: list[DepartmentRatingSummary]
    items: list[FeedbackResponse]
