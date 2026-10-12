"""
Unit Tests for SOC 360 Synthetic Demo Data
==========================================
Verifies that all synthetic records are clearly labelled with is_demo = True,
use safe/reserved example domains, and represent all hackathon demo scenarios.
"""

import pytest
from urllib.parse import urlparse

from data_sources.base import (
    CandidateSourceType,
    CandidateType,
    DataSourceStatus,
)
from data_sources.demo_data import (
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


class TestDemoBrand:

    def test_demo_brand_properties(self):
        brand = get_demo_brand()
        assert brand.brand_name == "Northstar Pay"
        assert len(brand.registered_domains) >= 1
        assert all("example." in d for d in brand.registered_domains)
        assert "twitter" in brand.official_handles
        assert "northstarpay" in brand.official_handles["twitter"]
        assert "google_play" in brand.official_app_ids
        assert "com.northstarpay.app" in brand.official_app_ids["google_play"]


class TestSyntheticSocialCandidates:

    def test_all_social_profiles_marked_is_demo_true(self):
        profiles = get_demo_social_candidates()
        assert len(profiles) >= 4
        for p in profiles:
            assert p.is_demo is True, f"Profile '{p.username}' must have is_demo=True"
            assert p.candidate_type == CandidateType.SOCIAL
            assert p.source_type == CandidateSourceType.DEMO
            # Check domain is reserved RFC example domain
            parsed = urlparse(p.profile_url)
            assert "example" in parsed.netloc, f"Profile URL '{p.profile_url}' must use example domain"

    def test_social_scenario_coverage(self):
        profiles = get_demo_social_candidates()
        usernames = {p.username for p in profiles}

        # 1. Official profile
        assert "northstarpay" in usernames
        # 2. Typosquatting spelling variation
        assert "northstarpaay" in usernames
        # 3. Added keyword 'support'
        assert "northstarpay_support" in usernames
        # 4. Legitimate look-alike
        assert "northstar_payment_advisory" in usernames


class TestSyntheticAppCandidates:

    def test_all_apps_marked_is_demo_true(self):
        apps = get_demo_app_candidates()
        assert len(apps) >= 3
        for a in apps:
            assert a.is_demo is True, f"App '{a.app_name}' must have is_demo=True"
            assert a.candidate_type == CandidateType.APP
            assert a.source_type == CandidateSourceType.DEMO
            parsed = urlparse(a.store_url)
            assert "example" in parsed.netloc, f"Store URL '{a.store_url}' must use example domain"

    def test_app_scenario_coverage(self):
        apps = get_demo_app_candidates()
        pkg_ids = {a.package_id: a for a in apps}

        # 1. Official app
        assert "com.northstarpay.app" in pkg_ids
        assert pkg_ids["com.northstarpay.app"].developer_name == "Northstar Financial Technologies Inc."

        # 2. Similar name, different developer (rogue clone)
        assert "com.northstar.paywallet.online" in pkg_ids
        assert pkg_ids["com.northstar.paywallet.online"].developer_name != "Northstar Financial Technologies Inc."

        # 3. Unrelated application (benign look-alike)
        assert "com.northstarnav.compass" in pkg_ids
        assert "Compass" in pkg_ids["com.northstarnav.compass"].app_name


class TestDemoResponseEnvelopes:

    def test_social_demo_response(self):
        response = get_demo_social_response()
        assert response.status == DataSourceStatus.DEMO_MODE
        assert response.is_demo is True
        assert response.total_count == len(response.records)
        assert response.total_count > 0
        assert "SYNTHETIC DEMO DATA" in response.metadata.get("disclaimer", "")

    def test_app_demo_response(self):
        response = get_demo_app_response()
        assert response.status == DataSourceStatus.DEMO_MODE
        assert response.is_demo is True
        assert response.total_count == len(response.records)
        assert response.total_count > 0
        assert "SYNTHETIC DEMO DATA" in response.metadata.get("disclaimer", "")

    def test_get_demo_response_by_type(self):
        soc_resp = get_demo_response_by_type("social")
        assert soc_resp.records[0].candidate_type == CandidateType.SOCIAL

        app_resp = get_demo_response_by_type("app")
        assert app_resp.records[0].candidate_type == CandidateType.APP

        all_resp = get_demo_response_by_type("all")
        assert all_resp.total_count == len(get_all_demo_candidates())
