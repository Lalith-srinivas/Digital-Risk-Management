"""Tests for transparent risk scoring engine."""

from backend.app.detection.risk_scoring import RiskScorer, RiskScoringConfig


def test_score_boundaries_strictly_0_to_100():
    """Calculated scores must never exceed 100 or drop below 0."""
    scorer = RiskScorer()

    # Extreme high signals
    name_high = {
        "similarity_score": 100.0,
        "match_type": "exact",
        "has_character_substitution": True,
        "has_affix_variant": True,
    }
    img_high = {"status": "completed", "similarity_score": 100.0, "hash_distance": 0}
    desc_high = {"available": True, "similarity_score": 100.0, "brand_terms_found": ["Apex"]}
    dev_mismatch = {"status": "mismatch"}

    assessment = scorer.calculate_risk(
        name_signal=name_high,
        image_signal=img_high,
        description_signal=desc_high,
        developer_signal=dev_mismatch,
        has_suspicious_keywords=True,
    )

    assert 0.0 <= assessment.risk_score <= 100.0
    assert assessment.risk_level == "High"


def test_missing_data_is_unknown_not_punitive():
    """Missing signals should be recorded in missing_evidence and not artificially inflate risk."""
    scorer = RiskScorer()

    # Name is low/unrelated, everything else missing
    name_low = {"similarity_score": 10.0, "match_type": "unrelated"}
    img_missing = {"status": "unavailable", "similarity_score": None}
    desc_missing = {"available": False, "similarity_score": None}

    assessment = scorer.calculate_risk(
        name_signal=name_low,
        image_signal=img_missing,
        description_signal=desc_missing,
    )

    assert assessment.risk_score == 0.0
    assert assessment.risk_level == "Low"
    assert len(assessment.missing_evidence) >= 2


def test_developer_mismatch_alone_not_conclusive():
    """Developer mismatch on unrelated name must not create a high-risk finding."""
    scorer = RiskScorer()

    name_unrelated = {"similarity_score": 15.0, "match_type": "unrelated"}
    img_missing = {"status": "unavailable"}
    desc_missing = {"available": False}
    dev_mismatch = {"status": "mismatch"}

    assessment = scorer.calculate_risk(
        name_signal=name_unrelated,
        image_signal=img_missing,
        description_signal=desc_missing,
        developer_signal=dev_mismatch,
    )

    # Risk must remain low because candidate name is completely unrelated
    assert assessment.risk_score < 30.0
    assert assessment.risk_level == "Low"


def test_official_url_exclusion_zeroes_score():
    """Official match must immediately result in score 0 and is_official_match True."""
    scorer = RiskScorer()

    name_high = {"similarity_score": 100.0, "match_type": "exact"}
    img_high = {"status": "completed", "similarity_score": 100.0, "hash_distance": 0}
    desc_high = {"available": True, "similarity_score": 100.0}
    official_signal = {"is_official": True, "exclusion_reason": "Verified official website"}

    assessment = scorer.calculate_risk(
        name_signal=name_high,
        image_signal=img_high,
        description_signal=desc_high,
        official_url_signal=official_signal,
    )

    assert assessment.risk_score == 0.0
    assert assessment.is_official_match is True
    assert assessment.risk_level == "Low"


def test_custom_configurable_weights():
    """Custom scoring weights should be strictly respected."""
    custom_cfg = RiskScoringConfig(
        weight_name_similarity=50.0,
        weight_developer_mismatch=10.0,
        weight_logo_similarity=20.0,
        weight_description_similarity=10.0,
        weight_other_evidence=10.0,
        threshold_low_max=20.0,
        threshold_medium_max=50.0,
    )
    scorer = RiskScorer(config=custom_cfg)

    name_signal = {"similarity_score": 100.0, "match_type": "exact"}
    assessment = scorer.calculate_risk(
        name_signal=name_signal,
        image_signal={"status": "unavailable"},
        description_signal={"available": False},
    )

    assert assessment.signal_scores.name_score == 50.0
    assert assessment.risk_score == 50.0
    assert assessment.risk_level == "Medium"
