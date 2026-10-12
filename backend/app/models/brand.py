import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, JSON, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    website: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    official_social_urls: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    official_apps: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    official_developers: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    aliases: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now(), onupdate=utc_now)

    candidates = relationship("Candidate", back_populates="brand", cascade="all, delete-orphan")
    scans = relationship("Scan", back_populates="brand", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="brand", cascade="all, delete-orphan")
