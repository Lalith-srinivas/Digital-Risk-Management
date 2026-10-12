"""End-to-end integration tests for the unified detector module."""

import io
from PIL import Image, ImageDraw
import pytest

from backend.app.detection.detector import (
    analyze_app_candidate,
    analyze_social_candidate,
)


@pytest.fixture
def brand_assets():
    """Create brand fixtures with in-memory logo."""
    img = Image.new("RGBA", (100, 100), color=(10, 50, 200, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([20, 20, 80, 80], fill=(255, 255, 255, 255))

    bio = io.BytesIO()
    img.save(bio, format="PNG")
    logo_bytes = bio.getvalue()

    return {
        "name": "Nova Pay",
        "aliases": ["NovaPay", "Nova Payments"],
        "official_urls": [
            "https://twitter.com/NovaPayOfficial",
            "https://novapay.com",
            "https://play.google.com/store/apps/details?id=com.novapay.wallet",
        ],
        "official_domains": ["novapay.com"],
        "official_developers": ["NovaPay Global Ltd."],
        "products": ["Nova Wallet", "Nova Card"],
        "logo_path": logo_bytes,
        "description": "Nova Pay is the next-generation global cross-border payments wallet.",
    }


def test_social_candidate_suspicious_impersonator(brand_assets):
    """Test suspicious social candidate with homoglyph name, affix, and missing logo."""
    candidate = {
        "display_name": "Nov@ Pay Support",
        "username": "@novapay_helpdesk",
        "url": "https://twitter.com/novapay_helpdesk",
        "avatar_path": None,
        "bio": "Get 24/7 emergency customer care for your Nova Wallet account.",
    }

    result = analyze_social_candidate(brand_assets, candidate)

    assert result["is_official_match"] is False
    assert result["risk_score"] >= 40.0
    assert result["risk_level"] in ("Medium", "High")
    assert "evidence" in result and len(result["evidence"]) > 0
    assert "signals" in result
    assert "name_similarity" in result["signals"]
    assert result["signals"]["name_similarity"]["has_character_substitution"] is True
    assert result["signals"]["image_similarity"]["status"] == "unavailable"


def test_social_candidate_official_account(brand_assets):
    """Official account should be excluded and receive score 0."""
    candidate = {
        "display_name": "Nova Pay",
        "username": "@NovaPayOfficial",
        "url": "https://twitter.com/NovaPayOfficial?s=20",
        "avatar_path": brand_assets["logo_path"],
        "bio": "Official account of Nova Pay.",
    }

    result = analyze_social_candidate(brand_assets, candidate)

    assert result["is_official_match"] is True
    assert result["risk_score"] == 0.0
    assert result["risk_level"] == "Low"
    assert "excluded from risk alerts" in result["explanation"]


def test_app_candidate_suspicious_clone(brand_assets):
    """App candidate with high name similarity, developer mismatch, and matching icon."""
    candidate = {
        "app_name": "Nova Pay: Digital Wallet",
        "developer": "Unknown Rogue Publisher",
        "url": "https://play.google.com/store/apps/details?id=com.fake.novapay",
        "icon_path": brand_assets["logo_path"],  # Copying brand logo!
        "description": "Download Nova Wallet for instant transfers.",
    }

    result = analyze_app_candidate(brand_assets, candidate)

    assert result["is_official_match"] is False
    assert result["risk_score"] >= 60.0
    assert result["risk_level"] == "High"
    assert result["review_priority"] == "High"
    assert result["signals"]["developer_comparison"]["is_mismatch"] is True
    assert result["signals"]["image_similarity"]["is_visual_match"] is True


def test_app_candidate_official(brand_assets):
    """Official app matched by Store package ID."""
    candidate = {
        "app_name": "Nova Pay",
        "developer": "NovaPay Global Ltd.",
        "url": "https://play.google.com/store/apps/details?id=com.novapay.wallet",
        "icon_path": brand_assets["logo_path"],
        "description": "Nova Pay mobile wallet.",
    }

    result = analyze_app_candidate(brand_assets, candidate)

    assert result["is_official_match"] is True
    assert result["risk_score"] == 0.0
    assert result["risk_level"] == "Low"


def test_object_input_support(brand_assets):
    """Should support class objects / dataclasses in addition to dicts."""
    class BrandObj:
        name = "Nova Pay"
        aliases = ["NovaPay"]
        official_urls = ["https://novapay.com"]
        official_domains = ["novapay.com"]
        official_developers = ["NovaPay Global Ltd."]
        products = ["Nova Card"]
        logo_path = None
        description = "Official Nova Pay"

    class CandidateObj:
        display_name = "Unrelated Weather App"
        username = "weather_today"
        url = "https://weather.com"
        avatar_path = None
        bio = "Local daily forecasts"

    result = analyze_social_candidate(BrandObj(), CandidateObj())
    assert result["risk_level"] == "Low"
    assert result["risk_score"] < 25.0
