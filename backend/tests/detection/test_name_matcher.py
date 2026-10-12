"""Tests for name similarity matching engine."""

import pytest
from backend.app.detection.name_matcher import (
    compare_candidate_names,
    compare_name_pair,
    normalize_text,
)


def test_exact_brand_name():
    """Exact brand name matches should score 100%."""
    res = compare_name_pair("Acme Bank", "Acme Bank")
    assert res["similarity_score"] == 100.0
    assert res["is_exact"] is True
    assert res["match_type"] == "exact"


def test_case_and_whitespace_and_punctuation():
    """Minor case, spaces, and punctuation variations should score >= 95%."""
    variations = [
        "acme bank",
        "  Acme   Bank  ",
        "Acme-Bank",
        "Acme_Bank",
        "Acme.Bank",
    ]
    for candidate in variations:
        res = compare_name_pair("Acme Bank", candidate)
        assert res["similarity_score"] >= 95.0
        assert res["match_type"] in ("exact", "exact_normalized")


def test_minor_misspellings():
    """Typo squatted or slightly misspelled names should score high."""
    typos = [
        "Acmee Bank",
        "Acm Bank",
        "Akme Bank",
        "Acme Bnak",
    ]
    for candidate in typos:
        res = compare_name_pair("Acme Bank", candidate)
        assert res["similarity_score"] >= 80.0
        assert res["match_type"] in ("minor_misspelling", "high_similarity")


def test_character_substitutions_homoglyphs():
    """Homoglyphs and leetspeak (0 for o, @ for a, 3 for e, 1 for l) should be detected."""
    substitutions = [
        ("Google", "G00gle"),
        ("Apple", "@pple"),
        ("PayPal", "PayP@l"),
        ("Tesla", "T3sla"),
        ("Delta", "De1ta"),
        ("Apex", "\u0410pex"),  # Cyrillic capital A
    ]
    for brand, candidate in substitutions:
        res = compare_name_pair(brand, candidate)
        assert res["similarity_score"] >= 85.0
        assert res["has_character_substitution"] is True or res["details"].get("ratio", 0) >= 80.0


def test_added_and_removed_words():
    """Extra words like 'Official' or 'Support' should trigger suspicious affix or added words."""
    res_affix = compare_name_pair("Apex Bank", "Apex Bank Support")
    assert res_affix["similarity_score"] >= 75.0
    assert res_affix["has_affix_variant"] is True

    res_generic = compare_name_pair("Apex Bank", "Apex Bank Global Services")
    assert res_generic["similarity_score"] >= 60.0
    assert res_generic["match_type"] in ("added_words", "partial_match", "high_similarity")


def test_reordered_words():
    """Permuted word orders should be recognized as reordered."""
    res = compare_name_pair("Global Secure Payments", "Secure Payments Global")
    assert res["has_reordered_words"] is True
    assert res["similarity_score"] >= 80.0


def test_unrelated_names_false_positive_reduction():
    """Unrelated names and common generic words should not produce false alarms."""
    unrelated_pairs = [
        ("Apple", "Microsoft Corporation"),
        ("Target", "Starbucks Coffee"),
        ("Bank of America", "General Motors"),
        ("Fox", "Silver Fox Fur Coats"),  # Short brand safeguard
        ("Ace", "Space Station Alpha"),
        ("Nike", "Weather Forecast Daily"),
    ]
    for brand, candidate in unrelated_pairs:
        res = compare_name_pair(brand, candidate)
        assert res["similarity_score"] < 50.0, f"Unrelated pair {brand} vs {candidate} scored too high: {res['similarity_score']}"
        assert res["match_type"] in ("unrelated", "low_similarity")


def test_known_aliases_evaluation():
    """Candidate should match against known aliases when available."""
    brand_names = ["Barclays", "Barclays Bank", "Barclaycard"]
    candidate_fields = [
        ("display_name", "Barclaycard Official Support"),
        ("username", "@barclaycard_care"),
    ]
    res = compare_candidate_names(brand_names, candidate_fields)
    assert res["similarity_score"] >= 75.0
    assert res["highest_match"]["brand_term"] == "Barclaycard"
    assert "Barclaycard" in res["highest_match"]["brand_term"]


def test_username_leading_at_stripped():
    """Usernames with leading @ should compare cleanly."""
    res = compare_candidate_names(["Netflix"], [("username", "@netflix_promo")])
    assert res["similarity_score"] >= 70.0
