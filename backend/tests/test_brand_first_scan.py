import uuid
import pytest
from fastapi.testclient import TestClient


def test_brand_first_scan_orchestration(client: TestClient, sample_brand):
    """
    Test POST /brands/{brand_id}/scan:
    Executes automated combined social + app candidate discovery, analyzes them with the
    detection engine, saves findings, and returns structured results without requiring manual inputs.
    """
    response = client.post(f"/brands/{sample_brand.id}/scan?is_demo=true")
    assert response.status_code == 201
    data = response.json()

    assert data["brand_id"] == str(sample_brand.id)
    assert data["brand_name"] == sample_brand.name
    assert data["status"] == "completed"
    assert data["candidates_analyzed"] > 0
    assert data["findings_generated"] > 0
    assert len(data["scans"]) == 2
    assert len(data["findings"]) > 0

    # Verify findings contain calibrated risk scores
    for finding in data["findings"]:
        assert 0 <= finding["risk_score"] <= 100
        assert finding["risk_level"] in ["low", "medium", "high", "critical", "Low", "Medium", "High", "Critical"]
        assert "evidence" in finding


def test_brand_scan_deduplication(client: TestClient, sample_brand):
    """
    Test that re-running monitoring on the same brand updates existing records
    rather than duplicating findings.
    """
    res1 = client.post(f"/brands/{sample_brand.id}/scan?is_demo=true")
    assert res1.status_code == 201
    findings_count_1 = res1.json()["findings_generated"]

    # Re-run scan
    res2 = client.post(f"/brands/{sample_brand.id}/scan?is_demo=true")
    assert res2.status_code == 201
    findings_count_2 = res2.json()["findings_generated"]

    # Counts should match due to candidate & finding deduplication
    assert findings_count_1 == findings_count_2


def test_get_dashboard_stats(client: TestClient, sample_brand):
    """
    Test GET /stats returns real aggregated database telemetry.
    """
    response = client.get("/stats")
    assert response.status_code == 200
    stats = response.json()

    assert "totalBrands" in stats
    assert stats["totalBrands"] >= 1
    assert "socialScanned" in stats
    assert "appsScanned" in stats
    assert "suspiciousFindings" in stats
    assert "riskCounts" in stats
    assert "sourceCounts" in stats
    assert "recentFindings" in stats
    assert "recentScans" in stats


def test_social_scan_auto_discovery(client: TestClient, sample_brand):
    """
    Test POST /scan/social without candidates triggers automated discovery.
    """
    payload = {"brand_id": str(sample_brand.id), "is_demo": True}
    response = client.post("/scan/social", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["scan"]["candidates_checked"] > 0
    assert len(data["findings"]) > 0


def test_app_scan_auto_discovery(client: TestClient, sample_brand):
    """
    Test POST /scan/apps without candidates triggers automated discovery.
    """
    payload = {"brand_id": str(sample_brand.id), "is_demo": True}
    response = client.post("/scan/apps", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["scan"]["candidates_checked"] > 0
    assert len(data["findings"]) > 0
