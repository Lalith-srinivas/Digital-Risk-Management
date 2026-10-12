import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.common import ReviewStatusEnum, RiskLevelEnum, SourceTypeEnum
from app.schemas.candidate import CandidateResponse


class FindingStatusUpdate(BaseModel):
    review_status: ReviewStatusEnum = Field(..., description="Updated human review status label")


class FindingResponse(BaseModel):
    id: uuid.UUID
    brand_id: uuid.UUID
    candidate_id: uuid.UUID
    scan_id: Optional[uuid.UUID] = None
    source_type: str
    risk_score: int = Field(..., ge=0, le=100, description="Risk score from 0 to 100")
    risk_level: str
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Structured detection evidence breakdown")
    explanation: Optional[str] = Field(None, description="Detailed explanation of risk assessment")
    review_status: str = Field(..., description="Current review status")
    is_demo: bool
    created_at: datetime
    updated_at: datetime
    candidate: Optional[CandidateResponse] = None

    model_config = ConfigDict(from_attributes=True)
