import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.connectors import get_connector_manager
from app.detection_adapter import (
    InternalDetectionAdapter,
    DetectionInput,
    SOC360DetectionEngine,
)
from app.services.brand_validator import BrandValidator
from app.services.scan_service import ScanService
from app.schemas.scan import GuestScanRequest


@pytest.fixture
def client():
    return TestClient(app)


def test_different_brands_do_not_produce_identical_candidates():
    """Verify different brand names do not automatically return identical candidate sets in live scan."""
    req_spotify = GuestScanRequest(name="Spotify", website="https://spotify.com", is_demo=False)
    res_spotify = ScanService.execute_guest_scan(req_spotify)

    req_netflix = GuestScanRequest(name="Netflix", website="https://netflix.com", is_demo=False)
    res_netflix = ScanService.execute_guest_scan(req_netflix)

    names_spotify = {f.get("candidateName") for f in res_spotify["findings"]}
    names_netflix = {f.get("candidateName") for f in res_netflix["findings"]}

    # Candidate sets must not be identical
    assert names_spotify != names_netflix


def test_random_inputs_do_not_generate_fabricated_candidates_or_critical_risks():
    """Random inputs such as 'spo' or gibberish must never fabricate fake profiles or flag apps as critical."""
    req = GuestScanRequest(name="spo", is_demo=False)
    res = ScanService.execute_guest_scan(req)

    # Social channels have no live unconfigured profiles fabricated
    assert res["social_analyzed"] == 0 or all(not f.get("isDemo") for f in res["findings"])

    # Any candidate retrieved (e.g. from app store matching query) must NOT be inflated to critical
    for finding in res["findings"]:
        # An app like YouTube or Instagram that happens to be returned by iTunes for query 'spo'
        # must NOT be classified as High or Critical impersonation of brand 'spo'
        assert finding["risk_score"] < 60
        assert finding["risk_level"].lower() not in ["critical"]

    # Brand verification must reflect that 'spo' is unverified
    assert res["brand_verification"]["verified"] is False


def test_unavailable_connectors_produce_honest_status():
    """Unconfigured connectors must report status 'unconfigured' and document required keys."""
    mgr = get_connector_manager()
    status = mgr.get_sources_status()

    assert "app_sources" in status
    assert "social_sources" in status

    # Verify at least one unconfigured connector has honest message
    unconfigured_sources = [
        s for s in status["app_sources"] + status["social_sources"]
        if s["status"] == "unconfigured"
    ]
    assert len(unconfigured_sources) > 0
    for s in unconfigured_sources:
        assert len(s["required_keys"]) > 0
        assert "not configured" in s.get("message", "").lower() or "unconfigured" in s.get("message", "").lower()


def test_zero_results_handled_honestly():
    """When a scan finds 0 candidates, it reports 0 candidates and clean status rather than fabricating."""
    # A random query unlikely to match any software on app store or github
    gibberish_name = f"qxzyw_{uuid.uuid4().hex[:8]}"
    req = GuestScanRequest(name=gibberish_name, is_demo=False)
    res = ScanService.execute_guest_scan(req)

    assert res["candidates_analyzed"] == len(res["findings"])
    assert res["findings_generated"] == len(res["findings"])
    # If 0 candidates, must not show fabricated stats
    if len(res["findings"]) == 0:
        assert res["candidates_analyzed"] == 0
        assert "no matching candidates" in res["scan_message"].lower() or "no suspicious" in res["scan_message"].lower()


def test_official_account_is_not_flagged_critical():
    """An official registered or verified account must be scored low / excluded, not critical."""
    adapter = InternalDetectionAdapter()
    data = DetectionInput(
        brand_name="GlobalBank",
        official_social_urls=["https://x.com/globalbank"],
        source_type="social",
        candidate_name="GlobalBank",
        username="@globalbank",
        source_url="https://x.com/globalbank",
        description="The verified official account of GlobalBank.",
    )
    result = adapter.analyze(data)

    assert result.risk_score <= 15
    assert result.risk_level.lower() == "low"
    assert result.review_recommendation == "Ignore"

    # Also test production detection engine
    engine = SOC360DetectionEngine()
    prod_result = engine.analyze(data)
    assert prod_result.risk_score <= 15
    assert prod_result.risk_level.lower() == "low"
    assert prod_result.review_recommendation == "Ignore"


def test_name_similarity_alone_does_not_produce_critical_score():
    """Exact brand name in candidate without malicious indicators must not score critical (>=80)."""
    adapter = InternalDetectionAdapter()
    data = DetectionInput(
        brand_name="Acme",
        source_type="social",
        candidate_name="Acme Corp Updates",
        username="@acme_updates",
        description="General updates and news about Acme products and releases.",
    )
    result = adapter.analyze(data)

    # Without phishing keywords ("support", "verify", "giveaway", etc.), score must not reach 80+
    assert result.risk_score < 75
    assert result.risk_level.lower() != "critical"


def test_fan_pages_do_not_classify_as_malicious():
    """Fan pages or community clubs without phishing indicators must be scored Low (<30)."""
    adapter = InternalDetectionAdapter()
    data = DetectionInput(
        brand_name="Spotify",
        source_type="social",
        candidate_name="Spotify Global Fans",
        username="@spotify_fans",
        source_url="https://x.com/spotify_fans",
        description="Independent fan community and discussion club for Spotify users. Unofficial & community run.",
    )
    result = adapter.analyze(data)

    assert result.risk_score < 30
    assert result.risk_level.lower() == "low"
    assert result.review_recommendation == "Ignore"

    # Test SOC360DetectionEngine on fan page
    engine = SOC360DetectionEngine()
    prod_res = engine.analyze(data)
    assert prod_res.risk_score < 30
    assert prod_res.risk_level.lower() == "low"


def test_suspicious_phishing_candidate_scores_high_or_critical():
    """A candidate with impersonation and phishing keywords must score high or critical."""
    adapter = InternalDetectionAdapter()
    data = DetectionInput(
        brand_name="Spotify",
        source_type="social",
        candidate_name="Spotify Support & Helpdesk",
        username="@spotify_support_desk",
        source_url="https://x.com/spotify_support_desk",
        description="Official verified support and recovery service for Spotify. DM us for login helpdesk verify.",
    )
    result = adapter.analyze(data)

    assert result.risk_score >= 60
    assert result.risk_level.lower() in ["high", "critical"]
    assert result.review_recommendation == "Escalate"


def test_missing_evidence_does_not_artificially_increase_risk():
    """Missing logos, descriptions, or developer info must remain unknown, not treated as suspicious."""
    adapter = InternalDetectionAdapter()
    data_with_missing = DetectionInput(
        brand_name="RandomBrand",
        source_type="social",
        candidate_name="Some Other Name",
        username=None,
        description=None,
        image_url=None,
    )
    result = adapter.analyze(data_with_missing)

    assert result.risk_score == 0
    assert result.risk_level.lower() == "low"


def test_candidate_counts_match_returned_results():
    """The returned candidate count must accurately equal the number of findings analyzed."""
    req = GuestScanRequest(name="Spotify", is_demo=False)
    res = ScanService.execute_guest_scan(req)

    assert res["candidates_analyzed"] == len(res["findings"])
    assert res["findings_generated"] == len(res["findings"])
    assert res["social_analyzed"] + res["apps_analyzed"] == res["candidates_analyzed"]


def test_demo_data_is_clearly_labelled():
    """Demo data is explicitly marked with is_demo=True and never mixed without identification."""
    req = GuestScanRequest(name="TargetBrand", is_demo=True)
    res = ScanService.execute_guest_scan(req)

    assert res["is_demo"] is True
    for f in res["findings"]:
        assert f["is_demo"] is True
        assert f["isDemo"] is True
