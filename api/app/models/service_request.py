from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User


class ServiceRequestStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    assigned_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[ServiceRequestStatus] = mapped_column(
        SqlEnum(ServiceRequestStatus, name="service_request_status"),
        default=ServiceRequestStatus.SUBMITTED,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User", foreign_keys=[user_id], back_populates="service_requests")
    department: Mapped["Department | None"] = relationship("Department", back_populates="service_requests")
    assigned_officer: Mapped["User | None"] = relationship(
        "User", foreign_keys=[assigned_officer_id], back_populates="assigned_requests"
    )
    ai_predictions: Mapped[list["AIPrediction"]] = relationship(
        "AIPrediction", back_populates="service_request", cascade="all, delete-orphan"
    )
    status_history: Mapped[list["RequestStatusHistory"]] = relationship(
        "RequestStatusHistory", back_populates="service_request", cascade="all, delete-orphan"
    )
    notes: Mapped[list["RequestNote"]] = relationship(
        "RequestNote", back_populates="service_request", cascade="all, delete-orphan"
    )

    @property
    def department_name(self) -> str | None:
        return self.department.name if self.department else None

    @property
    def assigned_officer_name(self) -> str | None:
        return self.assigned_officer.name if self.assigned_officer else None