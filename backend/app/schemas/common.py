from enum import Enum
from typing import Generic, List, TypeVar, Optional, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class SourceTypeEnum(str, Enum):
    SOCIAL = "social"
    APP = "app"


class RiskLevelEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ReviewStatusEnum(str, Enum):
    NEW = "New"
    UNDER_REVIEW = "Under Review"
    CONFIRMED_SUSPICIOUS = "Confirmed Suspicious"
    FALSE_POSITIVE = "False Positive"
    RESOLVED = "Resolved"


class ScanStatusEnum(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorDetail(BaseModel):
    detail: str
    code: Optional[str] = None
    errors: Optional[Any] = None
