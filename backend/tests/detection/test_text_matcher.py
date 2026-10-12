"""Tests for description similarity, developer matching, and URL exclusions."""

from backend.app.detection.text_matcher import (
    check_official_url_exclusion,
    compare_descriptions,
    compare_developers,
    normalize_url,
)


def test_missing_descriptions():
    """Missing descriptions should be marked unavailable rather than dissimilar."""
    res = compare_descriptions(brand_description="Official brand bio", candidate_description=None)
    assert res["available"] is False
    assert res["status"] == "unavailable"
    assert res["similarity_score"] is None

    res_empty = compare_descriptions(brand_description="", candidate_description="")
    assert res_empty["available"] is False
    assert res_empty["status"] == "unavailable"


def test_generic_words_safeguard():
    """Generic words alone (official, support, app, shop) should not inflate similarity."""
    brand_desc = "Apex Financial provides institutional investment banking and wealth advisory."
    candidate_desc = "Official support shop app for customer service and help online."

    res = compare_descriptions(
        brand_description=brand_desc,
        candidate_description=candidate_desc,
        brand_names=["Apex Financial"],
    )
    assert res["similarity_score"] == 0.0 or res["similarity_score"] < 20.0
    assert "Apex Financial" not in res["brand_terms_found"]


def test_brand_term_in_description():
    """Presence of registered brand or product names in candidate description should be captured."""
    brand_desc = "Apex Financial provides institutional investment banking."
    candidate_desc = "Get fast access to Apex Financial accounts and emergency loan transfers."

    res = compare_descriptions(
        brand_description=brand_desc,
        candidate_description=candidate_desc,
        brand_names=["Apex Financial"],
        product_names=["Apex Loans"],
    )
    assert res["available"] is True
    assert "apex financial" in res["brand_terms_found"]
    assert res["similarity_score"] >= 60.0


def test_developer_comparison_scenarios():
    """Developer matches, mismatches, and missing data."""
    official_devs = ["Apex Interactive Ltd.", "Apex Studios"]

    # Match
    m1 = compare_developers("Apex Interactive", official_devs)
    assert m1["status"] == "match"
    assert m1["is_match"] is True

    # Mismatch
    m2 = compare_developers("Shady Mobile Games LLC", official_devs)
    assert m2["status"] == "mismatch"
    assert m2["is_mismatch"] is True
    assert "does not confirm fraud" in m2["explanation"]

    # Missing
    m3 = compare_developers(None, official_devs)
    assert m3["status"] == "missing"
    assert m3["is_match"] is False
    assert m3["is_mismatch"] is False


def test_official_url_normalization_and_exclusion():
    """Official URLs should match despite variations in scheme, tracking params, and casing."""
    official_urls = [
        "https://twitter.com/ApexCorp",
        "https://apexcorp.com",
        "https://play.google.com/store/apps/details?id=com.apex.app",
    ]
    official_domains = ["apexcorp.com"]

    # Exact match with trailing slash and uppercase
    c1 = check_official_url_exclusion("https://TWITTER.com/ApexCorp/", official_urls)
    assert c1["is_official"] is True
    assert "ApexCorp" in c1["matched_official_url"]

    # Tracking parameters removed
    c2 = check_official_url_exclusion("https://apexcorp.com?utm_source=twitter&ref=bio", official_urls)
    assert c2["is_official"] is True

    # Social platform domain equivalence (x.com == twitter.com)
    c3 = check_official_url_exclusion("https://x.com/ApexCorp", official_urls)
    assert c3["is_official"] is True

    # Play Store ID match
    c4 = check_official_url_exclusion("https://play.google.com/store/apps/details?id=com.apex.app&hl=en", official_urls)
    assert c4["is_official"] is True

    # Genuine subdomain
    c5 = check_official_url_exclusion("https://login.apexcorp.com", official_urls, official_domains)
    assert c5["is_official"] is True

    # Non-official domain that merely contains the brand name
    c6 = check_official_url_exclusion("https://apexcorp-update.malicious.com", official_urls, official_domains)
    assert c6["is_official"] is False
