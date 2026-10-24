"""
SOC 360 - Data Sources Base Specification & Schemas
===================================================
Provides abstract interfaces, shared data schemas, metadata models,
and normalization utilities for digital risk protection candidates.

Design Principles:
- Clear separation between demo data and live API findings (enforced via is_demo).
- Explicit status reporting for missing API keys or unauthorized access (no false positives).
- Strict validation of candidate URLs, platforms, and metadata.
- Backend compatibility with FastAPI and detection engine contracts.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union
import re
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator


class CandidateType(str, Enum):
    """Category of candidate artifact being monitored."""
    SOCIAL = "social"
    APP = "app"


class CandidateSourceType(str, Enum):
    """Origin mechanism of the candidate record."""
    DEMO = "demo"
    USER_SUBMITTED = "user_submitted"
    MANUAL_INPUT = "manual_input"
    LIVE_API = "live_api"
    PUBLIC_DIRECTORY = "public_directory"


class DataSourceStatus(str, Enum):
    """Operational status returned by data-source connectors."""
    SUCCESS = "success"
    NOT_CONFIGURED = "not_configured"
    UNAUTHORIZED = "unauthorized"
    RATE_LIMITED = "rate_limited"
    NOT_FOUND = "not_found"
    ERROR = "error"
    DEMO_MODE = "demo_mode"


class SocialPlatform(str, Enum):
    """Supported or recognized social media platforms."""
    TWITTER = "twitter"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    GITHUB = "github"
    REDDIT = "reddit"
    OTHER = "other"


class AppPlatform(str, Enum):
    """Supported or recognized application stores."""
    GOOGLE_PLAY = "google_play"
    APPLE_APP_STORE = "apple_app_store"
    MICROSOFT_STORE = "microsoft_store"
    OTHER = "other"


# ==========================================
# Exceptions
# ==========================================

class DataSourceError(Exception):
    """Base exception for all data source operations."""
    def __init__(self, message: str, source_id: Optional[str] = None):
        super().__init__(message)
        self.source_id = source_id


class ConfigurationError(DataSourceError):
    """Raised when an external API connector lacks required authentication or config."""
    pass


class RateLimitError(DataSourceError):
    """Raised when an upstream API rate limit is exceeded."""
    pass


class AuthenticationError(DataSourceError):
    """Raised when upstream API credentials are rejected."""
    pass


class CandidateValidationError(DataSourceError):
    """Raised when user-supplied candidate data fails validation."""
    pass


# ==========================================
# Data Models
# ==========================================

class RegisteredBrand(BaseModel):
    """
    Representation of a registered brand protected by SOC 360.
    Used by detection engines to match against suspicious candidates.
    """
    brand_id: Optional[str] = Field(default=None, description="Unique brand identifier in SOC 360")
    brand_name: str = Field(..., min_length=1, max_length=200, description="Official legal or trade brand name")
    registered_domains: List[str] = Field(default_factory=list, description="Official domains (e.g., example.com)")
    official_handles: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Official social handles by platform (e.g. {'twitter': ['northstarpay']})"
    )
    official_app_ids: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Official store app IDs by platform (e.g. {'google_play': ['com.northstarpay.app']})"
    )
    keywords: List[str] = Field(
        default_factory=list,
        description="Key terms associated with the brand (e.g., ['payments', 'wallet', 'fintech'])"
    )
    description: Optional[str] = Field(default=None, description="Brand background summary")

    @field_validator("brand_name")
    @classmethod
    def clean_brand_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Brand name cannot be blank or whitespace only")
        return cleaned


class CandidateProfile(BaseModel):
    """
    Normalized social media profile candidate for SOC 360 analysis.
    Compatible with FastAPI backend schemas and detection engine inputs.
    """
    id: Optional[str] = Field(default=None, description="UUID identifier assigned upon ingestion")
    candidate_type: CandidateType = Field(default=CandidateType.SOCIAL, description="Candidate category")
    display_name: str = Field(..., min_length=1, max_length=255, description="Profile display name")
    username: str = Field(..., min_length=1, max_length=150, description="Handle or username")
    profile_url: str = Field(..., min_length=5, description="Full profile URL")
    bio: Optional[str] = Field(default=None, max_length=4000, description="Profile biography or description")
    image_url: Optional[str] = Field(default=None, description="Avatar or banner image URL")
    source_platform: str = Field(..., description="Platform identifier (twitter, instagram, etc.)")
    is_demo: bool = Field(
        default=False,
        description="CRITICAL: Set to True for synthetic demo records. Never represent demo data as live scans."
    )
    source_type: CandidateSourceType = Field(
        default=CandidateSourceType.USER_SUBMITTED,
        description="Source channel (demo, user_submitted, manual_input, live_api)"
    )
    query_matched: Optional[str] = Field(default=None, description="Search term or brand query that yielded candidate")
    raw_metadata: Dict[str, Any] = Field(default_factory=dict, description="Raw upstream or connector metadata")
    retrieved_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when candidate was fetched or submitted"
    )

    @field_validator("profile_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        parsed = urlparse(v.strip())
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(f"Invalid profile URL '{v}'. Must include scheme (http/https) and domain.")
        if parsed.scheme.lower() not in ("http", "https"):
            raise ValueError(f"URL scheme '{parsed.scheme}' not allowed; must be http or https.")
        return v.strip()

    @field_validator("username", "display_name", "source_platform")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class CandidateApp(BaseModel):
    """
    Normalized mobile application candidate for SOC 360 analysis.
    Compatible with FastAPI backend schemas and detection engine inputs.
    """
    id: Optional[str] = Field(default=None, description="UUID identifier assigned upon ingestion")
    candidate_type: CandidateType = Field(default=CandidateType.APP, description="Candidate category")
    app_name: str = Field(..., min_length=1, max_length=255, description="Application title in store")
    store_url: str = Field(..., min_length=5, description="Application store link")
    package_id: str = Field(..., min_length=1, max_length=255, description="Bundle ID or package identifier (e.g. com.example.app)")
    developer_name: str = Field(..., min_length=1, max_length=255, description="Publisher or developer name")
    description: Optional[str] = Field(default=None, max_length=10000, description="Application description in store")
    icon_url: Optional[str] = Field(default=None, description="Application icon link")
    source_platform: str = Field(..., description="Store platform (google_play, apple_app_store, etc.)")
    is_demo: bool = Field(
        default=False,
        description="CRITICAL: Set to True for synthetic demo records. Never represent demo data as live scans."
    )
    source_type: CandidateSourceType = Field(
        default=CandidateSourceType.USER_SUBMITTED,
        description="Source channel (demo, user_submitted, manual_input, live_api)"
    )
    query_matched: Optional[str] = Field(default=None, description="Search term or brand query that yielded candidate")
    version: Optional[str] = Field(default=None, description="Version string reported by store")
    rating: Optional[float] = Field(default=None, ge=0.0, le=5.0, description="Average user rating")
    raw_metadata: Dict[str, Any] = Field(default_factory=dict, description="Raw upstream or connector metadata")
    retrieved_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when candidate was fetched or submitted"
    )

    @field_validator("store_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        parsed = urlparse(v.strip())
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(f"Invalid store URL '{v}'. Must include scheme (http/https) and domain.")
        if parsed.scheme.lower() not in ("http", "https"):
            raise ValueError(f"URL scheme '{parsed.scheme}' not allowed; must be http or https.")
        return v.strip()

    @field_validator("app_name", "package_id", "developer_name", "source_platform")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class DataSourceMetadata(BaseModel):
    """Descriptor documenting connector capabilities, authentication, and limits."""
    source_id: str
    name: str
    description: str
    version: str = "1.0.0"
    is_live_api: bool = False
    requires_auth: bool = False
    auth_configured: bool = False
    rate_limit_info: str
    supported_platforms: List[str]
    access_restrictions: Optional[str] = None
    official_documentation_url: Optional[str] = None


class DataSourceResponse(BaseModel):
    """
    Standard envelope returned by all SOC 360 data sources.
    Guarantees consistent handling by the FastAPI scan controllers.
    """
    source_id: str
    status: DataSourceStatus
    is_demo: bool = False
    records: List[Union[CandidateProfile, CandidateApp]] = Field(default_factory=list)
    total_count: int = 0
    error_message: Optional[str] = None
    rate_limit_remaining: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode="after")
    def sync_total_count_and_demo(self) -> "DataSourceResponse":
        self.total_count = len(self.records)
        # Enforce is_demo flag consistency
        if self.records and all(r.is_demo for r in self.records):
            self.is_demo = True
        return self


# ==========================================
# Abstract Base Connector
# ==========================================

class BaseDataSource(ABC):
    """Abstract base class for all SOC 360 data source implementations."""

    @property
    @abstractmethod
    def metadata(self) -> DataSourceMetadata:
        """Return the documentation and operational metadata of this source."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Check whether credentials/dependencies are present for live fetching."""
        pass

    def validate_configuration(self) -> tuple[bool, Optional[str]]:
        """Return (is_valid, reason) describing whether the connector can run."""
        if not self.metadata.requires_auth:
            return True, "No authentication required."
        if self.is_configured():
            return True, "Authentication credentials configured."
        return False, (
            f"Connector '{self.metadata.name}' requires authentication credentials which are not set. "
            f"Refer to {self.metadata.official_documentation_url or 'documentation'}."
        )
