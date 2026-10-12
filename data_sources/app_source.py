"""
SOC 360 - Modular Application Data Source
=========================================
Provides application candidate ingestion, store URL parsing, permitted store
API connectors (Apple iTunes Search API), and explicit status reporting.

Supported Modes:
1. User-Submitted Application URLs (Google Play, Apple App Store, Microsoft Store).
2. Manually Supplied Candidate App Metadata.
3. Permitted Public API Connector: Apple iTunes Search API (official unauthenticated REST endpoint).
4. Google Play Connector: Documented status (No public REST search API exists; unauthenticated scraping
   violates Google Play ToS; requires user-submitted URLs or enterprise feeds).
5. Synthetic Demo Feed (is_demo = True).
"""

import os
import re
from typing import Any, Dict, List, Optional, Tuple, Union
from urllib.parse import parse_qs, urlparse

import httpx

from .base import (
    AppPlatform,
    BaseDataSource,
    CandidateApp,
    CandidateSourceType,
    CandidateType,
    CandidateValidationError,
    ConfigurationError,
    DataSourceMetadata,
    DataSourceResponse,
    DataSourceStatus,
    RateLimitError,
    RegisteredBrand,
)


def parse_app_url(url: str) -> Tuple[AppPlatform, str]:
    """
    Parse a mobile application store URL into platform and package/bundle identifier.
    Raises CandidateValidationError if URL is malformed or invalid.
    """
    cleaned = url.strip()
    if not cleaned:
        raise CandidateValidationError("Application store URL cannot be empty.")

    parsed = urlparse(cleaned)
    if not parsed.scheme or not parsed.netloc:
        raise CandidateValidationError(f"Invalid store URL structure: '{cleaned}'. Missing protocol or domain.")

    netloc = parsed.netloc.lower()
    path = parsed.path

    # Google Play Store: https://play.google.com/store/apps/details?id=com.example.app
    if "play.google.com" in netloc:
        query_params = parse_qs(parsed.query)
        pkg_list = query_params.get("id")
        if pkg_list and pkg_list[0]:
            return AppPlatform.GOOGLE_PLAY, pkg_list[0].strip()
        # Fallback to path if id in path
        match = re.search(r"id=([^&]+)", parsed.query)
        if match:
            return AppPlatform.GOOGLE_PLAY, match.group(1).strip()
        raise CandidateValidationError("Google Play URL is missing '?id=<package_name>' query parameter.")

    # Apple App Store: https://apps.apple.com/us/app/app-name/id1234567890
    if "apple.com" in netloc:
        match = re.search(r"id(\d+)", path)
        if match:
            return AppPlatform.APPLE_APP_STORE, match.group(1)
        # Maybe bundle id or last segment
        segments = [s for s in path.split("/") if s]
        if segments:
            return AppPlatform.APPLE_APP_STORE, segments[-1]
        raise CandidateValidationError("Apple App Store URL does not contain an app id (e.g. /id1234567890).")

    # Microsoft Store: https://apps.microsoft.com/detail/9nblggh4nns1
    if "microsoft.com" in netloc:
        segments = [s for s in path.split("/") if s]
        if segments:
            return AppPlatform.MICROSOFT_STORE, segments[-1]
        return AppPlatform.MICROSOFT_STORE, "unknown_product"

    # Generic
    segments = [s for s in path.split("/") if s]
    package_id = segments[-1] if segments else "unknown_package"
    return AppPlatform.OTHER, package_id


# ==========================================
# Apple iTunes Search Connector (Permitted Public API)
# ==========================================

class AppleAppStoreSearchConnector(BaseDataSource):
    """
    Official permitted Apple iTunes Search API for application metadata retrieval.
    Endpoint: https://itunes.apple.com/search?term={term}&entity=software&limit={limit}
    Authentication: None required (Public official Apple endpoint).
    Rate Limit: ~20 calls per minute standard.
    """

    def __init__(self, base_url: str = "https://itunes.apple.com"):
        self.base_url = base_url

    @property
    def metadata(self) -> DataSourceMetadata:
        return DataSourceMetadata(
            source_id="apple_itunes_search_api",
            name="Apple iTunes App Search API",
            description="Official permitted Apple REST endpoint for searching iOS/macOS applications.",
            is_live_api=True,
            requires_auth=False,
            auth_configured=True,
            rate_limit_info="~20 calls per minute under Apple fair-use policy.",
            supported_platforms=[AppPlatform.APPLE_APP_STORE.value],
            access_restrictions="Public unauthenticated search endpoint provided by Apple Services.",
            official_documentation_url="https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html"
        )

    def is_configured(self) -> bool:
        return True

    def search_apps(self, term: str, limit: int = 10) -> DataSourceResponse:
        """Search Apple App Store for applications matching search term."""
        clean_term = term.strip()
        if not clean_term:
            return DataSourceResponse(
                source_id=self.metadata.source_id,
                status=DataSourceStatus.ERROR,
                is_demo=False,
                records=[],
                error_message="Search term cannot be empty."
            )

        params = {
            "term": clean_term,
            "entity": "software",
            "limit": min(limit, 50)
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.base_url}/search", params=params)

                if res.status_code == 429:
                    return DataSourceResponse(
                        source_id=self.metadata.source_id,
                        status=DataSourceStatus.RATE_LIMITED,
                        is_demo=False,
                        records=[],
                        error_message="Apple iTunes search rate limit reached (~20 calls/min)."
                    )
                if res.status_code != 200:
                    return DataSourceResponse(
                        source_id=self.metadata.source_id,
                        status=DataSourceStatus.ERROR,
                        is_demo=False,
                        records=[],
                        error_message=f"Apple iTunes API returned HTTP {res.status_code}: {res.text}"
                    )

                data = res.json()
                raw_results = data.get("results", [])
                candidates: List[CandidateApp] = []

                for item in raw_results:
                    bundle_id = item.get("bundleId") or str(item.get("trackId", "unknown"))
                    track_url = item.get("trackViewUrl") or f"https://apps.apple.com/app/id{item.get('trackId')}"
                    app_name = item.get("trackName") or item.get("trackCensoredName") or "Unknown App"
                    dev_name = item.get("artistName") or item.get("sellerName") or "Unknown Developer"

                    candidates.append(CandidateApp(
                        app_name=app_name,
                        store_url=track_url,
                        package_id=bundle_id,
                        developer_name=dev_name,
                        description=item.get("description"),
                        icon_url=item.get("artworkUrl512") or item.get("artworkUrl100"),
                        source_platform=AppPlatform.APPLE_APP_STORE.value,
                        is_demo=False,
                        source_type=CandidateSourceType.LIVE_API,
                        query_matched=clean_term,
                        version=item.get("version"),
                        rating=float(item.get("averageUserRating")) if item.get("averageUserRating") is not None else None,
                        raw_metadata={
                            "track_id": item.get("trackId"),
                            "genres": item.get("genres", []),
                            "content_advisory": item.get("contentAdvisoryRating"),
                        }
                    ))

                return DataSourceResponse(
                    source_id=self.metadata.source_id,
                    status=DataSourceStatus.SUCCESS,
                    is_demo=False,
                    records=candidates,
                    metadata={"result_count": len(candidates), "query": clean_term}
                )

        except httpx.RequestError as exc:
            return DataSourceResponse(
                source_id=self.metadata.source_id,
                status=DataSourceStatus.ERROR,
                is_demo=False,
                records=[],
                error_message=f"Network error contacting Apple iTunes API: {str(exc)}"
            )


# ==========================================
# Google Play Connector (Documented Limitations)
# ==========================================

class GooglePlayStoreConnector(BaseDataSource):
    """
    Documented Google Play Connector interface.
    NOTE: Google Play does NOT offer a public search REST API.
    - Google Play Developer API requires app ownership and OAuth credentials for managing own apps.
    - Automated HTML scraping is prohibited by Google Terms of Service (§3.3) and protected by reCAPTCHA.
    - Unsanctioned scrapers violate SOC 360 ethical data policies.
    - Live candidate ingestion supports user-submitted Play Store URLs and enterprise feed ingestion.
    """

    @property
    def metadata(self) -> DataSourceMetadata:
        return DataSourceMetadata(
            source_id="google_play_connector",
            name="Google Play Store Connector",
            description="Connector for Google Play candidate ingestion and package resolution.",
            is_live_api=False,
            requires_auth=False,
            auth_configured=False,
            rate_limit_info="N/A - Public automated search API does not exist.",
            supported_platforms=[AppPlatform.GOOGLE_PLAY.value],
            access_restrictions=(
                "Google does not provide a public search API for Google Play. "
                "Automated web scraping is prohibited under Google Play ToS. "
                "Accepts user-submitted URLs, manual submissions, or commercial data feeds."
            ),
            official_documentation_url="https://developers.google.com/android-publisher"
        )

    def is_configured(self) -> bool:
        return False

    def search_apps(self, term: str) -> DataSourceResponse:
        """
        Explicitly informs backend that automated Google Play search is unavailable.
        Does NOT return fake data.
        """
        return DataSourceResponse(
            source_id=self.metadata.source_id,
            status=DataSourceStatus.NOT_CONFIGURED,
            is_demo=False,
            records=[],
            error_message=(
                "Automated Google Play search is unavailable because Google does not offer a public search API. "
                "Automated scraping is prohibited by Google Play ToS. "
                "Please submit suspect Play Store URLs directly (e.g. https://play.google.com/store/apps/details?id=...) "
                "or load synthetic demo records for demonstration."
            )
        )


# ==========================================
# Modular Application Data Source Manager
# ==========================================

class ModularAppDataSource:
    """
    Central coordinator for all application data sources in SOC 360.
    Handles:
    - User-submitted store URLs.
    - Manually supplied candidate app metadata.
    - Permitted live connectors (Apple iTunes Search API).
    - Synthetic demo dataset.
    - Normalized responses matching FastAPI backend contracts.
    """

    def __init__(
        self,
        apple_connector: Optional[AppleAppStoreSearchConnector] = None,
        google_play_connector: Optional[GooglePlayStoreConnector] = None
    ):
        self.apple_connector = apple_connector or AppleAppStoreSearchConnector()
        self.google_play_connector = google_play_connector or GooglePlayStoreConnector()

    def get_connector_catalog(self) -> List[DataSourceMetadata]:
        """Return descriptors of all registered application source adapters."""
        return [
            DataSourceMetadata(
                source_id="user_submission",
                name="User Submitted Store URL / Manual Entry",
                description="Ingests user-submitted application store links or manual analyst entries.",
                is_live_api=False,
                requires_auth=False,
                auth_configured=True,
                rate_limit_info="Backend ingestion rate limits (e.g. 100/min).",
                supported_platforms=[p.value for p in AppPlatform]
            ),
            self.apple_connector.metadata,
            self.google_play_connector.metadata
        ]

    def ingest_url(
        self,
        url: str,
        app_name: Optional[str] = None,
        developer_name: Optional[str] = None,
        description: Optional[str] = None,
        icon_url: Optional[str] = None,
        query_matched: Optional[str] = None
    ) -> CandidateApp:
        """
        Normalize and ingest a user-submitted store URL.
        Parses package ID and platform automatically.
        Guaranteed to return CandidateApp with is_demo=False.
        """
        platform, package_id = parse_app_url(url)
        resolved_name = app_name or package_id
        resolved_dev = developer_name or "Reported by Submitter"

        return CandidateApp(
            app_name=resolved_name,
            store_url=url.strip(),
            package_id=package_id,
            developer_name=resolved_dev,
            description=description,
            icon_url=icon_url,
            source_platform=platform.value,
            is_demo=False,
            source_type=CandidateSourceType.USER_SUBMITTED,
            query_matched=query_matched or resolved_name
        )

    def ingest_manual(self, data: Union[Dict[str, Any], CandidateApp]) -> CandidateApp:
        """
        Validate and ingest manually supplied application metadata.
        Ensures is_demo=False unless explicitly flagged as demo dataset.
        """
        if isinstance(data, CandidateApp):
            return data

        platform_str = data.get("source_platform", AppPlatform.OTHER.value)
        return CandidateApp(
            app_name=data["app_name"],
            store_url=data["store_url"],
            package_id=data["package_id"],
            developer_name=data["developer_name"],
            description=data.get("description"),
            icon_url=data.get("icon_url"),
            source_platform=platform_str,
            is_demo=bool(data.get("is_demo", False)),
            source_type=CandidateSourceType.MANUAL_INPUT,
            query_matched=data.get("query_matched"),
            version=data.get("version"),
            rating=data.get("rating"),
            raw_metadata=data.get("raw_metadata", {})
        )

    def search_live_store(self, platform: str, term: str, limit: int = 10) -> DataSourceResponse:
        """
        Search supported live store using authorized public APIs.
        Returns explicit status (SUCCESS, NOT_CONFIGURED, RATE_LIMITED, etc.).
        """
        clean_platform = platform.lower().strip()
        if clean_platform in (AppPlatform.APPLE_APP_STORE.value, "apple", "ios"):
            return self.apple_connector.search_apps(term, limit=limit)
        elif clean_platform in (AppPlatform.GOOGLE_PLAY.value, "google", "android"):
            return self.google_play_connector.search_apps(term)
        else:
            return DataSourceResponse(
                source_id="unsupported_store",
                status=DataSourceStatus.NOT_CONFIGURED,
                is_demo=False,
                records=[],
                error_message=f"Store platform '{platform}' does not have an active permitted search connector."
            )
