import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.common import ReviewStatusEnum, RiskLevelEnum, SourceTypeEnum
from app.schemas.candidate import CandidateResponse


class FindingStatusUpdate(BaseModel):
    review_status: Optional[str] = Field(None, description="Updated human review status label")
    reviewStatus: Optional[str] = Field(None, description="CamelCase review status label")
    reviewNotes: Optional[str] = Field(None, description="Analyst review notes")
    review_notes: Optional[str] = Field(None, description="Analyst review notes")

    def get_status_label(self) -> str:
        val = (self.review_status or self.reviewStatus or "New").strip()
        mapping = {
            "needs review": "Under Review",
            "under review": "Under Review",
            "confirmed suspicious": "Confirmed Suspicious",
            "confirmed": "Confirmed Suspicious",
            "benign": "False Positive",
            "false positive": "False Positive",
            "resolved": "Resolved",
            "new": "New",
        }
        return mapping.get(val.lower(), val)


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
