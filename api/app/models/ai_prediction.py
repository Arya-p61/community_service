from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AIProcessingStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    service_request_id: Mapped[int] = mapped_column(
        ForeignKey("service_requests.id"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_action: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    department: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    processing_status: Mapped[AIProcessingStatus] = mapped_column(
        SqlEnum(AIProcessingStatus, name="ai_processing_status"),
        default=AIProcessingStatus.PENDING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    service_request: Mapped["ServiceRequest"] = relationship(
        "ServiceRequest", back_populates="ai_predictions"
    )