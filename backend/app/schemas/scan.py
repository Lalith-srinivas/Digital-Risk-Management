import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
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


class GuestScanRequest(BaseModel):
    name: str = Field(..., description="Brand name to analyze")
    website: Optional[str] = Field(None, description="Official website URL")
    logo_url: Optional[str] = Field(None, description="Official logo image URL")
    official_social_urls: List[str] = Field(default_factory=list, description="Known official social handles")
    official_apps: List[str] = Field(default_factory=list, description="Known official app titles or IDs")
    official_developers: List[str] = Field(default_factory=list, description="Known authorized publisher/developer names")
    aliases: List[str] = Field(default_factory=list, description="Alternative spellings or aliases")
    is_demo: bool = Field(False, description="Whether to include simulated threat candidates in demo mode")

    @classmethod
    def from_flexible_dict(cls, data: dict) -> "GuestScanRequest":
        return cls(
            name=data.get("name") or data.get("brand_name") or data.get("brandName") or "",
            website=data.get("website") or data.get("website_url") or data.get("websiteUrl"),
            logo_url=data.get("logo_url") or data.get("logoUrl") or data.get("logo"),
            official_social_urls=data.get("official_social_urls") or data.get("officialSocialUrls") or [],
            official_apps=data.get("official_apps") or data.get("officialApps") or [],
            official_developers=data.get("official_developers") or data.get("officialDevelopers") or [],
            aliases=data.get("aliases") or [],
            is_demo=bool(data.get("is_demo", False)),
        )


class GuestScanResponse(BaseModel):
    brand_name: str
    status: str = "completed"
    candidates_analyzed: int
    findings_generated: int
    social_analyzed: int
    apps_analyzed: int
    sources_checked: List[str]
    findings: List[Dict[str, Any]]
    is_demo: bool = False
    is_guest: bool = True
    sources_status: Optional[Dict[str, Any]] = None
    brand_verification: Optional[Dict[str, Any]] = None
    scan_message: Optional[str] = None
    risk_summary: Optional[Dict[str, int]] = None
    privacy_notice: str = (
        "GUEST DATA PRIVACY: This scan was processed entirely in memory. "
        "No brand details, scans, or findings were persisted in the database."
    )

