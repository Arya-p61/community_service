from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, Enum):
    CITIZEN = "citizen"
    OFFICER = "officer"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SqlEnum(UserRole, name="user_role"), default=UserRole.CITIZEN, nullable=False
    )
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    profile_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    service_requests: Mapped[list["ServiceRequest"]] = relationship(
        "ServiceRequest", foreign_keys="ServiceRequest.user_id", back_populates="user", cascade="all, delete-orphan"
    )
    department: Mapped["Department | None"] = relationship("Department", back_populates="officers")
    assigned_requests: Mapped[list["ServiceRequest"]] = relationship(
        "ServiceRequest", foreign_keys="ServiceRequest.assigned_officer_id", back_populates="assigned_officer"
    )
    status_changes: Mapped[list["RequestStatusHistory"]] = relationship("RequestStatusHistory", back_populates="changer")
    request_notes: Mapped[list["RequestNote"]] = relationship("RequestNote", back_populates="officer")

    @property
    def department_name(self) -> str | None:
        return self.department.name if self.department else None