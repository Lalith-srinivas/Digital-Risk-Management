"""
SOC 360 - Data Sources Package
==============================
Modular adapters, data schemas, candidate normalization, and synthetic demo
data for the SOC 360 Digital Risk Protection platform.
"""

from .base import (
    AppPlatform,
    BaseDataSource,
    CandidateApp,
    CandidateProfile,
    CandidateSourceType,
    CandidateType,
    CandidateValidationError,
    ConfigurationError,
    DataSourceError,
    DataSourceMetadata,
    DataSourceResponse,
    DataSourceStatus,
    RateLimitError,
    RegisteredBrand,
    SocialPlatform,
)
from .social_source import (
    GitHubPublicUserConnector,
    ModularSocialDataSource,
    TwitterV2SocialConnector,
    parse_social_url,
)
from .app_source import (
    AppleAppStoreSearchConnector,
    GooglePlayStoreConnector,
    ModularAppDataSource,
    parse_app_url,
)
from .demo_data import (
    DEMO_APPLICATIONS,
    DEMO_BRAND,
    DEMO_SOCIAL_PROFILES,
    get_all_demo_candidates,
    get_demo_app_candidates,
    get_demo_app_response,
    get_demo_brand,
    get_demo_response_by_type,
    get_demo_social_candidates,
    get_demo_social_response,
)

__all__ = [
    # Schemas
    "RegisteredBrand",
    "CandidateProfile",
    "CandidateApp",
    "DataSourceMetadata",
    "DataSourceResponse",
    "CandidateType",
    "CandidateSourceType",
    "DataSourceStatus",
    "SocialPlatform",
    "AppPlatform",
    # Base
    "BaseDataSource",
    "DataSourceError",
    "ConfigurationError",
    "RateLimitError",
    "CandidateValidationError",
    # Social
    "ModularSocialDataSource",
    "GitHubPublicUserConnector",
    "TwitterV2SocialConnector",
    "parse_social_url",
    # Apps
    "ModularAppDataSource",
    "AppleAppStoreSearchConnector",
    "GooglePlayStoreConnector",
    "parse_app_url",
    # Demo
    "DEMO_BRAND",
    "DEMO_SOCIAL_PROFILES",
    "DEMO_APPLICATIONS",
    "get_demo_brand",
    "get_demo_social_candidates",
    "get_demo_app_candidates",
    "get_all_demo_candidates",
    "get_demo_social_response",
    "get_demo_app_response",
    "get_demo_response_by_type",
]
