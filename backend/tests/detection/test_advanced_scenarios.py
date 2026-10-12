"""Advanced edge case, determinism, and borderline scenario tests."""

import io
from PIL import Image, ImageDraw
import pytest

from backend.app.detection.detector import (
    analyze_app_candidate,
    analyze_social_candidate,
)
from backend.app.detection.name_matcher import compare_name_pair
from backend.app.detection.risk_scoring import RiskScorer, RiskScoringConfig


def test_determinism_across_multiple_runs():
    """Outputs must be 100% deterministic across repeated invocations."""
    brand = {
        "name": "Alpha Corp",
        "official_developers": ["Alpha Corp International"],
        "official_urls": ["https://alphacorp.io"],
    }
    candidate = {
        "app_name": "Alpha Corp - Fast Mobile",
        "developer": "Unknown Developer Ltd.",
        "url": "https://suspicious-store.com/app",
    }

    res1 = analyze_app_candidate(brand, candidate)
    res2 = analyze_app_candidate(brand, candidate)

    assert res1["risk_score"] == res2["risk_score"]
    assert res1["risk_level"] == res2["risk_level"]
    assert res1["explanation"] == res2["explanation"]
    assert res1["evidence"] == res2["evidence"]


def test_needs_review_classification():
    """When evidence is ambiguous or critical signals are incomplete, review_priority should be 'Needs Review'."""
    brand = {
        "name": "Apex Wealth",
        "official_urls": ["https://apexwealth.com"],
    }
    # Name has moderate-to-high similarity (e.g. 75%), but no image and no description
    candidate = {
        "display_name": "Apex Wealth Advisory",
        "username": "@apex_wealth_adv",
        "url": "https://twitter.com/apex_wealth_adv",
        "avatar_path": None,
        "bio": None,
    }

    result = analyze_social_candidate(brand, candidate)
    # The score should be medium/needs review, not definitively low or high
    assert result["review_priority"] in ("Needs Review", "Medium")
    assert any("unavailable" in item.lower() for item in result["missing_evidence"])


def test_no_double_counting_evidence():
    """Risk scorer should avoid double-counting the same signal."""
    scorer = RiskScorer()
    # Name with homoglyph already scored in name_pts and other_pts
    name_sig = {
        "similarity_score": 90.0,
        "match_type": "character_substitution",
        "has_character_substitution": True,
        "has_affix_variant": False,
    }
    assessment = scorer.calculate_risk(
        name_signal=name_sig,
        image_signal={"status": "unavailable"},
        description_signal={"available": False},
        has_suspicious_keywords=False,
    )
    # Total score should not exceed maximum allowable for name (35) + other (10) = 45
    assert assessment.risk_score <= 45.0


def test_look_alike_unicode_confusables():
    """Various Unicode look-alikes should normalize and match."""
    # Cyrillic small 'o', 'e', 'a', 'p'
    cyrillic_cand = "G\u043e\u043egl\u0435"  # G + cyrillic o + o + g + l + cyrillic e
    res = compare_name_pair("Google", cyrillic_cand)
    assert res["similarity_score"] >= 85.0
