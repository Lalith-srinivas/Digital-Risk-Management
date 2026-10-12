import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    brand_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # 'social' or 'app'
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    developer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    package_identifier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())

    brand = relationship("Brand", back_populates="candidates")
    findings = relationship("Finding", back_populates="candidate", cascade="all, delete-orphan")
