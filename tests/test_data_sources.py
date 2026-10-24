"""
Unit Tests for SOC 360 Data Sources
===================================
Tests candidate normalization, URL parsing, validation rules,
error handling, and connector behavior (mocked where network is involved).
"""

import pytest
from unittest.mock import MagicMock, patch
import httpx

from data_sources.base import (
    AppPlatform,
    CandidateApp,
    CandidateProfile,
    CandidateSourceType,
    CandidateType,
    CandidateValidationError,
    ConfigurationError,
    DataSourceMetadata,
    DataSourceResponse,
    DataSourceStatus,
    RegisteredBrand,
    SocialPlatform,
)
from data_sources.social_source import (
    GitHubPublicUserConnector,
    ModularSocialDataSource,
    TwitterV2SocialConnector,
    parse_social_url,
)
from data_sources.app_source import (
    AppleAppStoreSearchConnector,
    GooglePlayStoreConnector,
    ModularAppDataSource,
    parse_app_url,
)


# ==========================================
# 1. URL Parsing & Normalization Tests
# ==========================================

class TestSocialUrlParsing:

    def test_parse_twitter_urls(self):
        platform, username = parse_social_url("https://twitter.com/northstarpay")
        assert platform == SocialPlatform.TWITTER
        assert username == "northstarpay"

        platform2, username2 = parse_social_url("https://x.com/northstar_support")
        assert platform2 == SocialPlatform.TWITTER
        assert username2 == "northstar_support"

    def test_parse_instagram_url(self):
        platform, username = parse_social_url("https://instagram.com/northstarpay_official/")
        assert platform == SocialPlatform.INSTAGRAM
        assert username == "northstarpay_official"

    def test_parse_linkedin_urls(self):
        platform, company = parse_social_url("https://linkedin.com/company/northstar-pay")
        assert platform == SocialPlatform.LINKEDIN
        assert company == "northstar-pay"

        platform2, individual = parse_social_url("https://linkedin.com/in/john-doe")
        assert platform2 == SocialPlatform.LINKEDIN
        assert individual == "john-doe"

    def test_parse_github_url(self):
        platform, user = parse_social_url("https://github.com/northstarpay-dev")
        assert platform == SocialPlatform.GITHUB
        assert user == "northstarpay-dev"

    def test_invalid_social_urls(self):
        with pytest.raises(CandidateValidationError):
            parse_social_url("")

        with pytest.raises(CandidateValidationError):
            parse_social_url("not-a-valid-url")


class TestAppUrlParsing:

    def test_parse_google_play_url(self):
        url = "https://play.google.com/store/apps/details?id=com.northstarpay.app&hl=en"
        platform, pkg_id = parse_app_url(url)
        assert platform == AppPlatform.GOOGLE_PLAY
        assert pkg_id == "com.northstarpay.app"

    def test_parse_apple_app_store_url(self):
        url = "https://apps.apple.com/us/app/northstar-pay/id1234567890"
        platform, track_id = parse_app_url(url)
        assert platform == AppPlatform.APPLE_APP_STORE
        assert track_id == "1234567890"

    def test_invalid_app_urls(self):
        with pytest.raises(CandidateValidationError):
            parse_app_url("")

        with pytest.raises(CandidateValidationError):
            parse_app_url("https://play.google.com/store/apps/details")  # Missing id


# ==========================================
# 2. Candidate Schema & Validation Tests
# ==========================================

class TestCandidateValidation:

    def test_candidate_profile_valid(self):
        profile = CandidateProfile(
            display_name="Northstar Support",
            username="northstar_help",
            profile_url="https://x.com/northstar_help",
            bio="Unofficial customer support",
            source_platform="twitter",
            is_demo=False
        )
        assert profile.candidate_type == CandidateType.SOCIAL
        assert profile.username == "northstar_help"
        assert profile.is_demo is False
        assert profile.source_type == CandidateSourceType.USER_SUBMITTED

    def test_candidate_profile_invalid_url(self):
        with pytest.raises(ValueError):
            CandidateProfile(
                display_name="Test",
                username="test",
                profile_url="ftp://x.com/invalid_scheme",
                source_platform="twitter"
            )

    def test_candidate_app_valid(self):
        app = CandidateApp(
            app_name="Northstar Pay Quick Loans",
            store_url="https://play.google.com/store/apps/details?id=com.quickloans.northstar",
            package_id="com.quickloans.northstar",
            developer_name="Rogue Developers Inc.",
            source_platform="google_play",
            is_demo=False,
            rating=2.5
        )
        assert app.candidate_type == CandidateType.APP
        assert app.package_id == "com.quickloans.northstar"
        assert app.is_demo is False

    def test_candidate_app_missing_required_fields(self):
        with pytest.raises(Exception):
            # Missing package_id and developer_name
            CandidateApp(
                app_name="Incomplete App",
                store_url="https://play.google.com/store/apps/details?id=com.test",
                source_platform="google_play"
            )

    def test_registered_brand_validation(self):
        brand = RegisteredBrand(
            brand_name="Northstar Pay",
            registered_domains=["northstarpay.example.com"],
            official_handles={"twitter": ["northstarpay"]},
            official_app_ids={"google_play": ["com.northstarpay.app"]}
        )
        assert brand.brand_name == "Northstar Pay"

        with pytest.raises(ValueError):
            RegisteredBrand(brand_name="   ")  # Whitespace only brand name rejected


# ==========================================
# 3. Source Status & Unconfigured Behavior
# ==========================================

class TestUnconfiguredAndExceptions:

    def test_twitter_unconfigured_status(self):
        connector = TwitterV2SocialConnector(bearer_token=None)
        assert connector.is_configured() is False
        assert connector.metadata.auth_configured is False

        response = connector.lookup_user_by_username("suspect_handle")
        assert response.status == DataSourceStatus.NOT_CONFIGURED
        assert response.is_demo is False
        assert len(response.records) == 0
        assert "TWITTER_BEARER_TOKEN" in response.error_message

    def test_google_play_unsupported_search_status(self):
        connector = GooglePlayStoreConnector()
        assert connector.is_configured() is False

        response = connector.search_apps("Northstar")
        assert response.status == DataSourceStatus.NOT_CONFIGURED
        assert response.is_demo is False
        assert len(response.records) == 0
        assert "Google Play ToS" in response.error_message

    def test_modular_social_unsupported_platform(self):
        source = ModularSocialDataSource()
        response = source.query_live_source(platform="unknown_network", handle_or_term="test")
        assert response.status == DataSourceStatus.NOT_CONFIGURED
        assert "does not have an active permitted automated API connector" in response.error_message

    def test_modular_app_unsupported_store(self):
        source = ModularAppDataSource()
        response = source.search_live_store(platform="unsupported_store", term="Northstar")
        assert response.status == DataSourceStatus.NOT_CONFIGURED
        assert len(response.records) == 0


# ==========================================
# 4. Ingestion Workflows
# ==========================================

class TestIngestionWorkflows:

    def test_social_url_ingestion(self):
        source = ModularSocialDataSource()
        candidate = source.ingest_url(
            url="https://x.com/northstar_clone",
            display_name="Northstar Clone",
            bio="Clone bio"
        )
        assert candidate.username == "northstar_clone"
        assert candidate.source_platform == "twitter"
        assert candidate.is_demo is False
        assert candidate.source_type == CandidateSourceType.USER_SUBMITTED

    def test_social_manual_ingestion(self):
        source = ModularSocialDataSource()
        manual_dict = {
            "display_name": "Manual Impersonator",
            "username": "impersonator_101",
            "profile_url": "https://instagram.com/impersonator_101",
            "bio": "Phishing profile",
            "source_platform": "instagram"
        }
        candidate = source.ingest_manual(manual_dict)
        assert candidate.username == "impersonator_101"
        assert candidate.is_demo is False
        assert candidate.source_type == CandidateSourceType.MANUAL_INPUT

    def test_app_url_ingestion(self):
        source = ModularAppDataSource()
        candidate = source.ingest_url(
            url="https://play.google.com/store/apps/details?id=com.fake.northstar",
            app_name="Fake Northstar App",
            developer_name="Malicious Dev"
        )
        assert candidate.package_id == "com.fake.northstar"
        assert candidate.source_platform == "google_play"
        assert candidate.is_demo is False


# ==========================================
# 5. Mocked External Network Connectors
# ==========================================

class TestMockedConnectors:

    @patch("httpx.Client.get")
    def test_github_connector_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "login": "northstarpay-dev",
            "name": "Northstar Developer",
            "html_url": "https://github.com/northstarpay-dev",
            "bio": "Official dev team for Northstar",
            "avatar_url": "https://avatars.example.com/u/1234",
            "public_repos": 12,
            "followers": 45
        }
        mock_resp.headers = {"x-ratelimit-remaining": "58"}
        mock_get.return_value = mock_resp

        connector = GitHubPublicUserConnector()
        response = connector.lookup_user("northstarpay-dev")

        assert response.status == DataSourceStatus.SUCCESS
        assert response.is_demo is False
        assert len(response.records) == 1
        assert response.records[0].username == "northstarpay-dev"
        assert response.rate_limit_remaining == 58

    @patch("httpx.Client.get")
    def test_github_connector_rate_limit(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 403
        mock_get.return_value = mock_resp

        connector = GitHubPublicUserConnector()
        response = connector.lookup_user("some_user")

        assert response.status == DataSourceStatus.RATE_LIMITED
        assert len(response.records) == 0

    @patch("httpx.Client.get")
    def test_apple_itunes_connector_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "resultCount": 1,
            "results": [
                {
                    "trackName": "Northstar Trail Guide",
                    "bundleId": "com.northstarnav.app",
                    "artistName": "Northstar GPS LLC",
                    "trackViewUrl": "https://apps.apple.com/app/id123456",
                    "artworkUrl512": "https://assets.example.com/icon.png",
                    "description": "Trail navigation app",
                    "version": "1.0",
                    "averageUserRating": 4.5
                }
            ]
        }
        mock_get.return_value = mock_resp

        connector = AppleAppStoreSearchConnector()
        response = connector.search_apps("Northstar")

        assert response.status == DataSourceStatus.SUCCESS
        assert response.is_demo is False
        assert len(response.records) == 1
        assert response.records[0].app_name == "Northstar Trail Guide"
        assert response.records[0].package_id == "com.northstarnav.app"

    @patch("httpx.Client.get")
    def test_apple_itunes_connector_network_error(self, mock_get):
        mock_get.side_effect = httpx.RequestError("Network down")

        connector = AppleAppStoreSearchConnector()
        response = connector.search_apps("Northstar")

        assert response.status == DataSourceStatus.ERROR
        assert "Network error" in response.error_message
        assert len(response.records) == 0
