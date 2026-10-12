import uuid
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict, model_validator


class SocialCandidateInput(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=255, description="Candidate profile display name")
    username: Optional[str] = Field(None, max_length=255, description="Candidate social handle/username")
    profile_url: Optional[str] = Field(None, max_length=2048, description="URL of the social profile")
    platform: Optional[str] = Field(None, max_length=100, description="Platform (Twitter/X, Telegram, etc.)")
    bio: Optional[str] = Field(None, description="Profile biography or description")
    image_url: Optional[str] = Field(None, max_length=2048, description="Profile avatar/image URL")
    is_demo: bool = Field(False, description="Flag indicating if this candidate is test/demo data")

    @model_validator(mode="before")
    @classmethod
    def normalize_frontend_input(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        if "candidateName" in values and "display_name" not in values:
            values["display_name"] = values["candidateName"]
        if "handle" in values and "username" not in values:
            values["username"] = values["handle"]
        if "profileUrl" in values and "profile_url" not in values:
            values["profile_url"] = values["profileUrl"]
        if "description" in values and "bio" not in values:
            values["bio"] = values["description"]
        if "avatarUrl" in values and "image_url" not in values:
            values["image_url"] = values["avatarUrl"]

        return values


class AppCandidateInput(BaseModel):
    app_name: str = Field(..., min_length=1, max_length=255, description="Candidate application name")
    store_url: Optional[str] = Field(None, max_length=2048, description="Store URL (Play Store, App Store, APK site)")
    package_identifier: Optional[str] = Field(None, max_length=255, description="Bundle/Package ID (e.g. com.company.app)")
    developer_name: Optional[str] = Field(None, max_length=255, description="Publisher or developer name listed")
    store_type: Optional[str] = Field(None, max_length=100, description="Marketplace type")
    description: Optional[str] = Field(None, description="App description or release notes")
    icon_url: Optional[str] = Field(None, max_length=2048, description="App icon URL")
    is_demo: bool = Field(False, description="Flag indicating if this candidate is test/demo data")

    @model_validator(mode="before")
    @classmethod
    def normalize_frontend_input(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        if "appName" in values and "app_name" not in values:
            values["app_name"] = values["appName"]
        if "storeUrl" in values and "store_url" not in values:
            values["store_url"] = values["storeUrl"]
        if "packageId" in values and "package_identifier" not in values:
            values["package_identifier"] = values["packageId"]
        if "developer" in values and "developer_name" not in values:
            values["developer_name"] = values["developer"]
        if "iconUrl" in values and "icon_url" not in values:
            values["icon_url"] = values["iconUrl"]
        if "storeType" in values and "store_type" not in values:
            values["store_type"] = values["storeType"]

        return values


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
