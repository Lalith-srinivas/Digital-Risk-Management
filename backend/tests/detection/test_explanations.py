"""Tests for factual evidence-based explanation generation."""

from backend.app.detection.explanations import build_explanation


def test_no_unsupported_fraud_claims():
    """Explanations must never claim fraud, scam, or illegal acts conclusively."""
    name_sig = {
        "similarity_score": 98.0,
        "match_type": "exact_normalized",
        "field": "display_name",
        "brand_term": "PayPal",
    }
    img_sig = {"status": "unavailable"}
    desc_sig = {"available": False}
    dev_sig = {"status": "mismatch", "candidate_developer": "Faker Dev"}

    explanation = build_explanation(
        name_signal=name_sig,
        image_signal=img_sig,
        description_signal=desc_sig,
        developer_signal=dev_sig,
        risk_level="High",
    )

    forbidden_words = ["scam", "definitely fraudulent", "criminal", "phisher", "guilty", "fake account confirmed"]
    for word in forbidden_words:
        assert word not in explanation.lower()

    # Must accurately state observed facts
    assert "PayPal" in explanation
    assert "Faker Dev" in explanation
    assert "could not be compared because no image was supplied" in explanation


def test_official_exclusion_explanation():
    """Official assets should receive a clear, positive exclusion explanation."""
    explanation = build_explanation(
        name_signal={},
        image_signal={},
        description_signal={},
        is_official_match=True,
        exclusion_reason="Verified official Twitter handle",
    )
    assert "excluded from risk alerts" in explanation
    assert "Verified official Twitter handle" in explanation
