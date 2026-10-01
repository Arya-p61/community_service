from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RequestNote(Base):
    __tablename__ = "request_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    service_request_id: Mapped[int] = mapped_column(ForeignKey("service_requests.id"), nullable=False, index=True)
    officer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    service_request: Mapped["ServiceRequest"] = relationship("ServiceRequest", back_populates="notes")
    officer: Mapped["User"] = relationship("User", back_populates="request_notes")