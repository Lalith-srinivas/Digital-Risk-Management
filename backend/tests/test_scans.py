import uuid
import pytest
from app.detection_adapter import (
    BaseDetectionEngine,
    DetectionInput,
    DetectionResult,
    get_detection_engine,
    set_detection_engine,
)


def test_social_scan_success(client, sample_brand):
    payload = {
        "brand_id": str(sample_brand.id),
        "candidates": [
            {
                "display_name": "Acme Support Giveaway",
                "username": "acme_giveaway_official",
                "profile_url": "https://twitter.com/acme_giveaway_official",
                "bio": "Free gift cards for Acme Corp users! Verify your account.",
                "image_url": "https://example.com/fake_logo.png",
                "is_demo": True,
            },
            {
                "display_name": "Acme Corp Official",
                "username": "acmecorp",
                "profile_url": "https://twitter.com/acmecorp",
                "bio": "The official twitter account of Acme Corp.",
                "image_url": "https://acme.example.com/logo.png",
                "is_demo": False,
            },
        ],
        "is_demo": True,
    }

    response = client.post("/scan/social", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert "scan" in data
    assert "findings" in data
    scan = data["scan"]
    assert scan["brand_id"] == str(sample_brand.id)
    assert scan["source_type"] == "social"
    assert scan["status"] == "completed"
    assert scan["candidates_checked"] == 2
    assert scan["findings_created"] == 2

    findings = data["findings"]
    assert len(findings) == 2

    # First candidate is fake/phishing -> elevated risk score
    fake_finding = next(f for f in findings if "Giveaway" in f["explanation"] or f["risk_score"] > 50)
    assert fake_finding["risk_score"] >= 60
    assert fake_finding["risk_level"] in ["high", "critical"]

    # Second candidate matches official url -> low risk
    official_finding = next(f for f in findings if f["risk_score"] < 20)
    assert official_finding["risk_level"] == "low"


def test_app_scan_success(client, sample_brand):
    payload = {
        "brand_id": str(sample_brand.id),
        "candidates": [
            {
                "app_name": "Acme Fast Rewards",
                "store_url": "https://apk-mirror.example.com/acme-rewards",
                "package_identifier": "com.rogue.acme.rewards",
                "developer_name": "Rogue Developer",
                "description": "Get free coins for Acme Corp services.",
                "icon_url": "https://example.com/app_icon.png",
                "is_demo": True,
            }
        ],
    }

    response = client.post("/scan/apps", json=payload)
    assert response.status_code == 201
    data = response.json()

    scan = data["scan"]
    assert scan["source_type"] == "app"
    assert scan["status"] == "completed"
    assert scan["candidates_checked"] == 1
    assert scan["findings_created"] == 1

    finding = data["findings"][0]
    assert finding["source_type"] == "app"
    assert finding["risk_score"] >= 60


def test_scan_unknown_brand(client):
    random_id = str(uuid.uuid4())
    payload = {
        "brand_id": random_id,
        "candidates": [
            {"display_name": "Some profile", "username": "someuser"}
        ],
    }
    response = client.post("/scan/social", json=payload)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_scan_empty_candidates_fails(client, sample_brand):
    payload = {
        "brand_id": str(sample_brand.id),
        "candidates": [],
    }
    response = client.post("/scan/social", json=payload)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_scan_detector_failure(client, sample_brand):
    class FailingDetector(BaseDetectionEngine):
        def analyze(self, data: DetectionInput) -> DetectionResult:
            raise RuntimeError("Engine offline / connection timeout")

    original_engine = get_detection_engine()
    try:
        set_detection_engine(FailingDetector())
        payload = {
            "brand_id": str(sample_brand.id),
            "candidates": [{"display_name": "Test Candidate", "username": "test"}],
        }
        response = client.post("/scan/social", json=payload)
        assert response.status_code == 500
        assert "Engine offline" in response.json()["detail"]

        # Verify that scan record in DB is marked as failed, not completed!
        scans_res = client.get(f"/scans?brand_id={sample_brand.id}")
        assert scans_res.status_code == 200
        scans = scans_res.json()
        assert len(scans) > 0
        failed_scan = scans[0]
        assert failed_scan["status"] == "failed"
        assert "Engine offline" in failed_scan["error_message"]
    finally:
        set_detection_engine(original_engine)


def test_list_scans_and_get_scan_by_id(client, sample_brand):
    # Run a quick scan first
    scan_res = client.post(
        "/scan/social",
        json={
            "brand_id": str(sample_brand.id),
            "candidates": [{"display_name": "Test Acme", "username": "acme_test"}],
        },
    )
    scan_id = scan_res.json()["scan"]["id"]

    # List scans
    list_res = client.get(f"/scans?brand_id={sample_brand.id}")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # Get specific scan
    single_res = client.get(f"/scans/{scan_id}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == scan_id


def test_get_unknown_scan_id(client):
    random_id = str(uuid.uuid4())
    res = client.get(f"/scans/{random_id}")
    assert res.status_code == 404
