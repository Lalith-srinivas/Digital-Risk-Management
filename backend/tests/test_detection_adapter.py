from app.detection_adapter import (
    InternalDetectionAdapter,
    DetectionInput,
    calculate_risk_level,
)


def test_calculate_risk_level():
    assert calculate_risk_level(85) == "critical"
    assert calculate_risk_level(70) == "high"
    assert calculate_risk_level(45) == "medium"
    assert calculate_risk_level(20) == "low"


def test_official_social_profile_low_risk():
    adapter = InternalDetectionAdapter()
    data = DetectionInput(
        brand_name="GlobalBank",
        official_social_urls=["https://twitter.com/globalbank"],
        source_type="social",
        candidate_name="GlobalBank Official",
        source_url="https://twitter.com/globalbank",
    )
    result = adapter.analyze(data)
    assert result.risk_score <= 15
    assert result.risk_level == "low"
    assert result.evidence.get("verified_official") is True
    assert result.is_temporary_adapter is True


def test_impersonation_candidate_high_risk():
    adapter = InternalDetectionAdapter()
    data = DetectionInput(
        brand_name="GlobalBank",
        official_social_urls=["https://twitter.com/globalbank"],
        source_type="social",
        candidate_name="GlobalBank Helpdesk Support",
        username="globalbank_support_verify",
        source_url="https://twitter.com/fake_globalbank",
        description="Official 24/7 GlobalBank customer verification and rewards.",
    )
    result = adapter.analyze(data)
    assert result.risk_score >= 70
    assert result.risk_level in ["high", "critical"]
    assert result.evidence.get("name_impersonation") is True
    assert result.evidence.get("handle_impersonation") is True
    assert len(result.evidence.get("suspicious_keywords", [])) > 0
    assert result.review_recommendation == "Escalate"


def test_app_unauthorized_developer():
    adapter = InternalDetectionAdapter()
    data = DetectionInput(
        brand_name="SuperPay",
        official_apps=["com.superpay.wallet"],
        official_developers=["SuperPay Technologies Inc."],
        source_type="app",
        candidate_name="SuperPay Fast Wallet",
        developer_name="Rogue Dev Team",
        package_identifier="com.superpay.fake",
        description="Quick SuperPay wallet access",
    )
    result = adapter.analyze(data)
    assert result.risk_score >= 60
    assert result.evidence.get("unauthorized_developer") is True


def test_soc360_production_engine_social():
    from app.detection_adapter import SOC360DetectionEngine

    engine = SOC360DetectionEngine()
    data = DetectionInput(
        brand_name="GlobalBank",
        official_social_urls=["https://twitter.com/globalbank"],
        source_type="social",
        candidate_name="GlobalBank Helpdesk Support",
        username="globalbank_support_verify",
        source_url="https://twitter.com/fake_globalbank",
        description="Official 24/7 GlobalBank customer verification and rewards.",
    )
    result = engine.analyze(data)
    assert result.risk_score >= 40
    assert result.is_temporary_adapter is False
    assert result.engine_name == "soc360_similarity_detection_v2"
    assert "evidence_list" in result.evidence


def test_soc360_production_engine_app():
    from app.detection_adapter import SOC360DetectionEngine

    engine = SOC360DetectionEngine()
    data = DetectionInput(
        brand_name="SuperPay",
        official_apps=["com.superpay.wallet"],
        official_developers=["SuperPay Technologies Inc."],
        source_type="app",
        candidate_name="SuperPay Fast Wallet",
        developer_name="Rogue Dev Team",
        package_identifier="com.superpay.fake",
        description="Quick SuperPay wallet access",
    )
    result = engine.analyze(data)
    assert result.risk_score >= 40
    assert result.is_temporary_adapter is False
    assert result.engine_name == "soc360_similarity_detection_v2"

