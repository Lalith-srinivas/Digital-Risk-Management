import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, JSON, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    brand_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("scans.id", ondelete="SET NULL"), nullable=True, index=True)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # 'social' or 'app'
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, index=True)  # 0 to 100
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # 'low', 'medium', 'high', 'critical'
    evidence: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_status: Mapped[str] = mapped_column(
        String(30), default="New", nullable=False, index=True
    )  # 'New', 'Under Review', 'Confirmed Suspicious', 'False Positive', 'Resolved'
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now(), onupdate=utc_now)

    brand = relationship("Brand", back_populates="findings")
    candidate = relationship("Candidate", back_populates="findings")
    scan = relationship("Scan", back_populates="findings")
