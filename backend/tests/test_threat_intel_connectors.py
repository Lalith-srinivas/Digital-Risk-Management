import os
import pytest
from app.connectors.security_intel import VirusTotalConnector, URLScanConnector
from app.connectors.manager import get_connector_manager
from app.detection_adapter import InternalDetectionAdapter, DetectionInput


def test_threat_intel_connectors_configured_with_keys(monkeypatch):
    """Test connectors report active status when API keys are configured."""
    monkeypatch.setenv("VIRUSTOTAL_API_KEY", "test_vt_key_12345")
    monkeypatch.setenv("URLSCAN_API_KEY", "test_urlscan_key_67890")

    vt = VirusTotalConnector()
    assert vt.is_configured() is True
    vt_status = vt.get_status()
    assert vt_status["status"] == "active"
    assert vt_status["is_configured"] is True
    assert "VIRUSTOTAL_API_KEY" in vt_status["required_keys"]

    us = URLScanConnector()
    assert us.is_configured() is True
    us_status = us.get_status()
    assert us_status["status"] == "active"
    assert us_status["is_configured"] is True
    assert "URLSCAN_API_KEY" in us_status["required_keys"]


def test_threat_intel_connectors_unconfigured_when_empty(monkeypatch):
    """Test connectors report unconfigured status gracefully without crashing when keys are missing."""
    monkeypatch.setenv("VIRUSTOTAL_API_KEY", "")
    monkeypatch.setenv("URLSCAN_API_KEY", "")

    vt = VirusTotalConnector()
    assert vt.is_configured() is False
    vt_res = vt.search("paypal")
    assert vt_res.status == "unconfigured"
    assert vt_res.candidates == []
    assert vt_res.total_found == 0

    us = URLScanConnector()
    assert us.is_configured() is False
    us_res = us.search("paypal")
    assert us_res.status == "unconfigured"
    assert us_res.candidates == []
    assert us_res.total_found == 0


def test_connector_manager_includes_threat_intel():
    """Verify threat intelligence connectors are registered in ConnectorManager."""
    mgr = get_connector_manager()
    status = mgr.get_sources_status()

    assert "threat_intel_sources" in status
    assert status["total_intel_connectors"] == 2
    names = [s["name"] for s in status["threat_intel_sources"]]
    assert any("VirusTotal" in n for n in names)
    assert any("urlscan.io" in n for n in names)


def test_threat_intel_candidate_scoring_escalates():
    """Verify candidates identified via threat intelligence receive elevated risk scoring and evidence flag."""
    adapter = InternalDetectionAdapter()
    data = DetectionInput(
        brand_name="Paypal",
        source_type="social",
        candidate_name="paypal-security-alert.com [Threat Intel Alert]",
        username="@paypal-security-alert.com",
        source_url="https://paypal-security-alert.com",
        description="Flagged by VirusTotal: 12 security engines marked malicious. Phishing site detected.",
    )

    result = adapter.analyze(data)
    assert result.risk_score >= 60
    assert result.risk_level.lower() in ["high", "critical"]
    assert result.evidence.get("threat_intel_flag") is True
    assert "VirusTotal / urlscan.io" in result.evidence.get("threat_intel_source", "")
    assert "threat intelligence" in result.explanation.lower()
