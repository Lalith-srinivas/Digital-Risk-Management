"""
SOC 360 - Modular Social Data Source
====================================
Provides candidate profile ingestion, URL normalization, live API connectors
(where permitted and configured), and explicit status reporting.

Supported Modes:
1. User-Submitted Profile URLs (canonical URL parsing & handle extraction).
2. Manually Supplied Profile Metadata.
3. Permitted Public API Connector: GitHub Public User API (authorized, no credentials needed for low volume).
4. Restricted Commercial Connectors (Twitter/X API v2, Instagram Graph API) with strict credential checks.
   When unconfigured, returns DataSourceStatus.NOT_CONFIGURED instead of fabricated live data.
5. Synthetic Demo Feed (is_demo = True).
"""

import os
import re
from typing import Any, Dict, List, Optional, Tuple, Union
from urllib.parse import urlparse

import httpx

from .base import (
    BaseDataSource,
    CandidateProfile,
    CandidateSourceType,
    CandidateType,
    CandidateValidationError,
    ConfigurationError,
    DataSourceMetadata,
    DataSourceResponse,
    DataSourceStatus,
    RateLimitError,
    RegisteredBrand,
    SocialPlatform,
)


# Known platform host regex mappings
PLATFORM_DOMAINS = {
    SocialPlatform.TWITTER: [r"(?:.*\.)?twitter\.com", r"(?:.*\.)?x\.com"],
    SocialPlatform.INSTAGRAM: [r"(?:.*\.)?instagram\.com"],
    SocialPlatform.LINKEDIN: [r"(?:.*\.)?linkedin\.com"],
    SocialPlatform.GITHUB: [r"(?:.*\.)?github\.com"],
    SocialPlatform.REDDIT: [r"(?:.*\.)?reddit\.com"],
    SocialPlatform.TIKTOK: [r"(?:.*\.)?tiktok\.com"],
    SocialPlatform.FACEBOOK: [r"(?:.*\.)?facebook\.com"],
    SocialPlatform.YOUTUBE: [r"(?:.*\.)?youtube\.com"],
}


def parse_social_url(url: str) -> Tuple[SocialPlatform, str]:
    """
    Parse a social media URL into its platform and canonical username handle.
    Raises CandidateValidationError if URL is invalid or malformed.
    """
    cleaned = url.strip()
    if not cleaned:
        raise CandidateValidationError("Social profile URL cannot be empty.")

    parsed = urlparse(cleaned)
    if not parsed.scheme or not parsed.netloc:
        raise CandidateValidationError(f"Invalid URL structure: '{cleaned}'. Missing protocol or domain.")

    netloc = parsed.netloc.lower()
    path = parsed.path.strip("/")

    # Detect platform
    detected_platform = SocialPlatform.OTHER
    for platform, patterns in PLATFORM_DOMAINS.items():
        if any(re.match(pattern, netloc) for pattern in patterns):
            detected_platform = platform
            break

    # Extract username
    segments = [s for s in path.split("/") if s]
    username = ""

    if detected_platform == SocialPlatform.TWITTER:
        if segments:
            username = segments[0].lstrip("@")
    elif detected_platform == SocialPlatform.INSTAGRAM:
        if segments:
            username = segments[0].lstrip("@")
    elif detected_platform == SocialPlatform.LINKEDIN:
        # e.g., /in/johndoe or /company/acme
        if len(segments) >= 2 and segments[0] in ("in", "company"):
            username = segments[1]
        elif segments:
            username = segments[0]
    elif detected_platform == SocialPlatform.GITHUB:
        if segments:
            username = segments[0]
    elif detected_platform == SocialPlatform.REDDIT:
        # e.g., /user/username or /u/username
        if len(segments) >= 2 and segments[0] in ("user", "u"):
            username = segments[1]
        elif segments:
            username = segments[0]
    elif detected_platform == SocialPlatform.TIKTOK:
        if segments:
            username = segments[0].lstrip("@")
    else:
        if segments:
            username = segments[-1].lstrip("@")

    if not username:
        username = "unspecified_user"

    return detected_platform, username


# ==========================================
# GitHub Live Connector (Public Permitted API)
# ==========================================

class GitHubPublicUserConnector(BaseDataSource):
    """
    Permitted public connector for GitHub users and organizations.
    Public REST API: https://api.github.com/users/{username}
    Rate limit: 60 requests/hr (unauthenticated) or 5,000 requests/hr (with GITHUB_TOKEN).
    """

    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or os.getenv("GITHUB_TOKEN")
        self.base_url = "https://api.github.com"

    @property
    def metadata(self) -> DataSourceMetadata:
        return DataSourceMetadata(
            source_id="github_public_api",
            name="GitHub Public User API",
            description="Official permitted GitHub REST API for profile and organization retrieval.",
            is_live_api=True,
            requires_auth=False,
            auth_configured=bool(self.api_token),
            rate_limit_info="60 req/hr unauthenticated; 5,000 req/hr with GITHUB_TOKEN.",
            supported_platforms=[SocialPlatform.GITHUB.value],
            access_restrictions="Public read access permitted under GitHub API Terms of Service.",
            official_documentation_url="https://docs.github.com/en/rest/users/users"
        )

    def is_configured(self) -> bool:
        # Usable even without token for low-volume public lookups
        return True

    def lookup_user(self, username: str) -> DataSourceResponse:
        """Fetch candidate profile from official GitHub REST endpoint."""
        clean_user = username.strip().lstrip("@")
        if not clean_user:
            return DataSourceResponse(
                source_id=self.metadata.source_id,
                status=DataSourceStatus.ERROR,
                is_demo=False,
                error_message="Username cannot be empty."
            )

        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "SOC360-RiskProtection/1.0"
        }
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.base_url}/users/{clean_user}", headers=headers)

                if res.status_code == 404:
                    return DataSourceResponse(
                        source_id=self.metadata.source_id,
                        status=DataSourceStatus.NOT_FOUND,
                        is_demo=False,
                        records=[],
                        error_message=f"GitHub user '{clean_user}' not found."
                    )
                if res.status_code == 403 or res.status_code == 429:
                    return DataSourceResponse(
                        source_id=self.metadata.source_id,
                        status=DataSourceStatus.RATE_LIMITED,
                        is_demo=False,
                        records=[],
                        error_message="GitHub API rate limit exceeded. Set GITHUB_TOKEN for higher limit."
                    )
                if res.status_code != 200:
                    return DataSourceResponse(
                        source_id=self.metadata.source_id,
                        status=DataSourceStatus.ERROR,
                        is_demo=False,
                        records=[],
                        error_message=f"GitHub API error: HTTP {res.status_code} - {res.text}"
                    )

                data = res.json()
                profile = CandidateProfile(
                    display_name=data.get("name") or data.get("login"),
                    username=data.get("login"),
                    profile_url=data.get("html_url") or f"https://github.com/{data.get('login')}",
                    bio=data.get("bio"),
                    image_url=data.get("avatar_url"),
                    source_platform=SocialPlatform.GITHUB.value,
                    is_demo=False,
                    source_type=CandidateSourceType.LIVE_API,
                    query_matched=clean_user,
                    raw_metadata={
                        "company": data.get("company"),
                        "blog": data.get("blog"),
                        "public_repos": data.get("public_repos"),
                        "followers": data.get("followers"),
                    }
                )

                remaining = res.headers.get("x-ratelimit-remaining")
                remaining_int = int(remaining) if remaining and remaining.isdigit() else None

                return DataSourceResponse(
                    source_id=self.metadata.source_id,
                    status=DataSourceStatus.SUCCESS,
                    is_demo=False,
                    records=[profile],
                    rate_limit_remaining=remaining_int
                )

        except httpx.RequestError as exc:
            return DataSourceResponse(
                source_id=self.metadata.source_id,
                status=DataSourceStatus.ERROR,
                is_demo=False,
                error_message=f"Network error contacting GitHub API: {str(exc)}"
            )


# ==========================================
# Twitter/X API v2 Connector (Documented Restricted API)
# ==========================================

class TwitterV2SocialConnector(BaseDataSource):
    """
    Connector specification for official X / Twitter API v2.
    Requires developer account approval and paid API access (Basic tier: $100/mo minimum).
    Enforces strict credential check: does NOT fabricate live data when unconfigured.
    """

    def __init__(self, bearer_token: Optional[str] = None):
        self.bearer_token = bearer_token or os.getenv("TWITTER_BEARER_TOKEN")
        self.base_url = "https://api.twitter.com/2"

    @property
    def metadata(self) -> DataSourceMetadata:
        return DataSourceMetadata(
            source_id="twitter_v2_api",
            name="X / Twitter API v2",
            description="Official X Developer Platform REST API for account and tweet monitoring.",
            is_live_api=True,
            requires_auth=True,
            auth_configured=self.is_configured(),
            rate_limit_info="Basic Tier ($100/mo): 10,000 tweets/mo read, 100 requests/24h per user lookup endpoint.",
            supported_platforms=[SocialPlatform.TWITTER.value],
            access_restrictions=(
                "Requires approved X Developer Project and paid Basic/Pro subscription. "
                "Unauthenticated and scraped access is strictly prohibited by X Terms of Service."
            ),
            official_documentation_url="https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference"
        )

    def is_configured(self) -> bool:
        return bool(self.bearer_token and self.bearer_token.strip())

    def lookup_user_by_username(self, username: str) -> DataSourceResponse:
        """Query official X API v2 endpoint: /2/users/by/username/{username}."""
        if not self.is_configured():
            return DataSourceResponse(
                source_id=self.metadata.source_id,
                status=DataSourceStatus.NOT_CONFIGURED,
                is_demo=False,
                records=[],
                error_message=(
                    "Twitter API v2 connector is not configured. Missing TWITTER_BEARER_TOKEN. "
                    "Access requires an approved developer account and paid subscription ($100/mo). "
                    "Use user-submitted URLs, manual entry, or synthetic demo mode."
                )
            )

        clean_user = username.strip().lstrip("@")
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "User-Agent": "SOC360-RiskProtection/1.0"
        }
        params = {
            "user.fields": "description,profile_image_url,verified,created_at,public_metrics"
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.base_url}/users/by/username/{clean_user}", headers=headers, params=params)

                if res.status_code == 401:
                    return DataSourceResponse(
                        source_id=self.metadata.source_id,
                        status=DataSourceStatus.UNAUTHORIZED,
                        is_demo=False,
                        records=[],
                        error_message="Twitter API authentication failed. Verify TWITTER_BEARER_TOKEN."
                    )
                if res.status_code == 429:
                    return DataSourceResponse(
                        source_id=self.metadata.source_id,
                        status=DataSourceStatus.RATE_LIMITED,
                        is_demo=False,
                        records=[],
                        error_message="Twitter API rate limit exceeded."
                    )
                if res.status_code != 200:
                    return DataSourceResponse(
                        source_id=self.metadata.source_id,
                        status=DataSourceStatus.ERROR,
                        is_demo=False,
                        records=[],
                        error_message=f"Twitter API HTTP {res.status_code}: {res.text}"
                    )

                data = res.json()
                user_obj = data.get("data")
                if not user_obj:
                    return DataSourceResponse(
                        source_id=self.metadata.source_id,
                        status=DataSourceStatus.NOT_FOUND,
                        is_demo=False,
                        records=[],
                        error_message=f"Twitter user '{clean_user}' not found."
                    )

                profile = CandidateProfile(
                    display_name=user_obj.get("name", clean_user),
                    username=user_obj.get("username", clean_user),
                    profile_url=f"https://x.com/{user_obj.get('username')}",
                    bio=user_obj.get("description"),
                    image_url=user_obj.get("profile_image_url"),
                    source_platform=SocialPlatform.TWITTER.value,
                    is_demo=False,
                    source_type=CandidateSourceType.LIVE_API,
                    query_matched=clean_user,
                    raw_metadata=user_obj
                )

                return DataSourceResponse(
                    source_id=self.metadata.source_id,
                    status=DataSourceStatus.SUCCESS,
                    is_demo=False,
                    records=[profile]
                )

        except httpx.RequestError as exc:
            return DataSourceResponse(
                source_id=self.metadata.source_id,
                status=DataSourceStatus.ERROR,
                is_demo=False,
                error_message=f"Network error contacting Twitter API: {str(exc)}"
            )


# ==========================================
# Modular Social Data Source Manager
# ==========================================

class ModularSocialDataSource:
    """
    Central coordinator for all social data sources in SOC 360.
    Handles:
    - User-submitted profile URLs.
    - Manually supplied candidate profiles.
    - Live permitted and authenticated connectors.
    - Synthetic demo dataset.
    - Normalized responses matching FastAPI contracts.
    """

    def __init__(
        self,
        github_connector: Optional[GitHubPublicUserConnector] = None,
        twitter_connector: Optional[TwitterV2SocialConnector] = None
    ):
        self.github_connector = github_connector or GitHubPublicUserConnector()
        self.twitter_connector = twitter_connector or TwitterV2SocialConnector()

    def get_connector_catalog(self) -> List[DataSourceMetadata]:
        """Return descriptors of all registered social source adapters."""
        return [
            DataSourceMetadata(
                source_id="user_submission",
                name="User Submitted URL / Manual Entry",
                description="Ingests user-submitted URLs or analysts' manual candidate entries.",
                is_live_api=False,
                requires_auth=False,
                auth_configured=True,
                rate_limit_info="Internal backend rate limits only (e.g. 100/min).",
                supported_platforms=[p.value for p in SocialPlatform]
            ),
            self.github_connector.metadata,
            self.twitter_connector.metadata,
            DataSourceMetadata(
                source_id="instagram_graph_api",
                name="Meta Instagram Graph API",
                description="Official Meta Business Discovery API for public business profiles.",
                is_live_api=True,
                requires_auth=True,
                auth_configured=bool(os.getenv("INSTAGRAM_ACCESS_TOKEN")),
                rate_limit_info="200 calls/hour per user.",
                supported_platforms=[SocialPlatform.INSTAGRAM.value],
                access_restrictions="Requires Meta App Review, Business Verification, and Instagram Professional Account.",
                official_documentation_url="https://developers.facebook.com/docs/instagram-api/guides/business-discovery"
            )
        ]

    def ingest_url(
        self,
        url: str,
        display_name: Optional[str] = None,
        bio: Optional[str] = None,
        image_url: Optional[str] = None,
        query_matched: Optional[str] = None
    ) -> CandidateProfile:
        """
        Normalize and ingest a user-submitted profile URL.
        Guaranteed to return a validated CandidateProfile with is_demo=False.
        """
        platform, username = parse_social_url(url)
        return CandidateProfile(
            display_name=display_name or username,
            username=username,
            profile_url=url.strip(),
            bio=bio,
            image_url=image_url,
            source_platform=platform.value,
            is_demo=False,
            source_type=CandidateSourceType.USER_SUBMITTED,
            query_matched=query_matched or username
        )

    def ingest_manual(self, data: Union[Dict[str, Any], CandidateProfile]) -> CandidateProfile:
        """
        Validate and ingest manually supplied candidate profile fields.
        Ensures is_demo=False unless explicitly flagged as demo dataset.
        """
        if isinstance(data, CandidateProfile):
            return data

        # Construct from dict
        platform_str = data.get("source_platform", SocialPlatform.OTHER.value)
        return CandidateProfile(
            display_name=data["display_name"],
            username=data["username"],
            profile_url=data["profile_url"],
            bio=data.get("bio"),
            image_url=data.get("image_url"),
            source_platform=platform_str,
            is_demo=bool(data.get("is_demo", False)),
            source_type=CandidateSourceType.MANUAL_INPUT,
            query_matched=data.get("query_matched"),
            raw_metadata=data.get("raw_metadata", {})
        )

    def query_live_source(self, platform: str, handle_or_term: str) -> DataSourceResponse:
        """
        Query an authorized live connector based on platform.
        Returns explicit status (SUCCESS, NOT_CONFIGURED, RATE_LIMITED, etc.).
        """
        clean_platform = platform.lower().strip()
        if clean_platform == SocialPlatform.GITHUB.value:
            return self.github_connector.lookup_user(handle_or_term)
        elif clean_platform == SocialPlatform.TWITTER.value:
            return self.twitter_connector.lookup_user_by_username(handle_or_term)
        elif clean_platform == SocialPlatform.INSTAGRAM.value:
            return DataSourceResponse(
                source_id="instagram_graph_api",
                status=DataSourceStatus.NOT_CONFIGURED,
                is_demo=False,
                records=[],
                error_message=(
                    "Instagram Graph API is not configured. Missing INSTAGRAM_ACCESS_TOKEN. "
                    "Requires Meta App Review, Business Verification, and Instagram Business Account. "
                    "Use user-submitted profile URLs or synthetic demo mode."
                )
            )
        else:
            return DataSourceResponse(
                source_id="unsupported_source",
                status=DataSourceStatus.NOT_CONFIGURED,
                is_demo=False,
                records=[],
                error_message=(
                    f"Platform '{platform}' does not have an active permitted automated API connector. "
                    f"Submit suspect profile URLs directly or use synthetic demo records."
                )
            )
