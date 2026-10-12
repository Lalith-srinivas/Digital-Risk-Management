import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.candidate import SocialCandidateInput, AppCandidateInput
from app.schemas.finding import FindingResponse


class SocialScanRequest(BaseModel):
    brand_id: uuid.UUID = Field(..., description="ID of the registered brand to monitor")
    candidates: Optional[List[SocialCandidateInput]] = Field(default=None, description="List of social profiles to check (auto-discovered if empty)")
    is_demo: Optional[bool] = Field(False, description="Whether this scan represents a demo run")


class AppScanRequest(BaseModel):
    brand_id: uuid.UUID = Field(..., description="ID of the registered brand to monitor")
    candidates: Optional[List[AppCandidateInput]] = Field(default=None, description="List of applications to check (auto-discovered if empty)")
    is_demo: Optional[bool] = Field(False, description="Whether this scan represents a demo run")


class ScanResponse(BaseModel):
    id: uuid.UUID
    brand_id: uuid.UUID
    source_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    candidates_checked: int
    findings_created: int
    error_message: Optional[str] = None
    is_demo: bool

    model_config = ConfigDict(from_attributes=True)


class ScanResultResponse(BaseModel):
    scan: ScanResponse
    findings: List[FindingResponse]


class BrandScanResponse(BaseModel):
    brand_id: uuid.UUID
    brand_name: str
    status: str
    candidates_analyzed: int
    findings_generated: int
    scans: List[ScanResponse]
    findings: List[FindingResponse]
    is_demo: bool
