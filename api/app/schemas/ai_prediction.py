from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.ai_prediction import AIProcessingStatus


class AIClassificationResponse(BaseModel):
    category: str
    priority: str
    summary: str
    suggested_action: str
    confidence: float = Field(ge=0, le=1)


class AIPredictionResponse(AIClassificationResponse):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_request_id: int
    department: str
    model: str
    processing_status: AIProcessingStatus
    created_at: datetime
    updated_at: datetime