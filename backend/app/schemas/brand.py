import uuid
from datetime import datetime
from typing import List, Optional, Any, Union, Dict
from pydantic import BaseModel, Field, ConfigDict, model_validator


class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Brand name")
    website: Optional[str] = Field(None, max_length=1024, description="Official brand website URL")
    logo_url: Optional[str] = Field(None, max_length=2048, description="Official brand logo URL")
    official_social_urls: List[str] = Field(default_factory=list, description="List of official social profile URLs")
    official_apps: List[Any] = Field(default_factory=list, description="List of official app identifiers or details")
    official_developers: List[str] = Field(default_factory=list, description="List of verified official developer names")
    aliases: List[str] = Field(default_factory=list, description="Known brand aliases and abbreviations")

    @model_validator(mode="before")
    @classmethod
    def normalize_frontend_fields(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        # Normalize logo / logo_url
        if "logo" in values and "logo_url" not in values:
            values["logo_url"] = values["logo"]

        # Normalize official_developers / developerNames
        if "developerNames" in values and "official_developers" not in values:
            values["official_developers"] = values["developerNames"]

        # Normalize official_social_urls / officialSocials
        if "officialSocials" in values and "official_social_urls" not in values:
            socials = values["officialSocials"]
            extracted = []
            if isinstance(socials, list):
                for item in socials:
                    if isinstance(item, str):
                        extracted.append(item)
                    elif isinstance(item, dict):
                        url = item.get("url") or item.get("handle")
                        if url:
                            extracted.append(str(url))
            values["official_social_urls"] = extracted

        # Normalize official_apps / officialApps
        if "officialApps" in values and "official_apps" not in values:
            values["official_apps"] = values["officialApps"]

        return values


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

    @property
    def logo(self) -> Optional[str]:
        return self.logo_url

    model_config = ConfigDict(from_attributes=True)
