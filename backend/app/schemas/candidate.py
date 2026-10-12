import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.common import SourceTypeEnum


class SocialCandidateInput(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=255, description="Candidate profile display name")
    username: Optional[str] = Field(None, max_length=255, description="Candidate social handle/username")
    profile_url: Optional[str] = Field(None, max_length=2048, description="URL of the social profile")
    bio: Optional[str] = Field(None, description="Profile biography or description")
    image_url: Optional[str] = Field(None, max_length=2048, description="Profile avatar/image URL")
    is_demo: bool = Field(False, description="Flag indicating if this candidate is test/demo data")


class AppCandidateInput(BaseModel):
    app_name: str = Field(..., min_length=1, max_length=255, description="Candidate application name")
    store_url: Optional[str] = Field(None, max_length=2048, description="Store URL (Play Store, App Store, APK site)")
    package_identifier: Optional[str] = Field(None, max_length=255, description="Bundle/Package ID (e.g. com.company.app)")
    developer_name: Optional[str] = Field(None, max_length=255, description="Publisher or developer name listed")
    description: Optional[str] = Field(None, description="App description or release notes")
    icon_url: Optional[str] = Field(None, max_length=2048, description="App icon URL")
    is_demo: bool = Field(False, description="Flag indicating if this candidate is test/demo data")


class CandidateResponse(BaseModel):
    id: uuid.UUID
    brand_id: uuid.UUID
    source_type: str
    candidate_name: str
    username: Optional[str] = None
    source_url: Optional[str] = None
    developer_name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    package_identifier: Optional[str] = None
    is_demo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
