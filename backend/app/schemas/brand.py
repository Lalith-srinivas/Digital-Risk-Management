import uuid
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field, HttpUrl, ConfigDict


class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Brand name")
    website: Optional[str] = Field(None, max_length=1024, description="Official brand website URL")
    logo_url: Optional[str] = Field(None, max_length=2048, description="Official brand logo URL")
    official_social_urls: List[str] = Field(default_factory=list, description="List of official social profile URLs")
    official_apps: List[Any] = Field(default_factory=list, description="List of official app identifiers or details")
    official_developers: List[str] = Field(default_factory=list, description="List of verified official developer names")
    aliases: List[str] = Field(default_factory=list, description="Known brand aliases and abbreviations")


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated brand name")
    website: Optional[str] = Field(None, max_length=1024, description="Updated official website")
    logo_url: Optional[str] = Field(None, max_length=2048, description="Updated logo URL")
    official_social_urls: Optional[List[str]] = Field(None, description="Updated official social URLs")
    official_apps: Optional[List[Any]] = Field(None, description="Updated official app records")
    official_developers: Optional[List[str]] = Field(None, description="Updated official developer names")
    aliases: Optional[List[str]] = Field(None, description="Updated aliases")


class BrandResponse(BrandBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
