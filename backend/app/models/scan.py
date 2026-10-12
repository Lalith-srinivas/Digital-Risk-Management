import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    brand_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'social' or 'app'
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)  # 'pending', 'running', 'completed', 'failed'
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    candidates_checked: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    findings_created: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    brand = relationship("Brand", back_populates="scans")
    findings = relationship("Finding", back_populates="scan")
