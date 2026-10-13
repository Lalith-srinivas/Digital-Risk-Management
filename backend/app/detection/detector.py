"""Unified Detection Engine interface for SOC 360.

Provides standard public entrypoints:
- analyze_social_candidate(brand, candidate, config=None)
- analyze_app_candidate(brand, candidate, config=None)

Consumes records from backend models, user-submitted URLs, connector feeds,
or synthetic demo fixtures. Operates offline without external scraping or paid APIs.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Union

from .explanations import build_explanation
from .logo_matcher import compare_images
from .name_matcher import compare_candidate_names
from .risk_scoring import RiskAssessment, RiskScorer, RiskScoringConfig
from .text_matcher import (
    check_official_url_exclusion,
    compare_descriptions,
    compare_developers,
)


def _get_field(obj: Any, *keys: str, default: Any = None) -> Any:
    """Safely extract field from dict, pydantic model, or generic class object."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        for k in keys:
            if k in obj and obj[k] is not None:
                return obj[k]
        return default
    # Attribute lookup
    for k in keys:
        if hasattr(obj, k):
            val = getattr(obj, k)
            if val is not None:
                return val
    return default


def _extract_brand_data(brand: Any) -> Dict[str, Any]:
    """Normalize brand input into standard internal structure."""
    brand_name = _get_field(brand, "name", "brand_name", default="")
    aliases = _get_field(brand, "aliases", "known_aliases", default=[]) or []
    if isinstance(aliases, str):
        aliases = [a.strip() for a in aliases.split(",") if a.strip()]

    all_names = [brand_name] + [a for a in aliases if a]

    official_urls = _get_field(brand, "official_urls", "urls", default=[]) or []
    if isinstance(official_urls, str):
        official_urls = [u.strip() for u in official_urls.split(",") if u.strip()]

    official_domains = _get_field(brand, "official_domains", "domains", default=[]) or []
    if isinstance(official_domains, str):
        official_domains = [d.strip() for d in official_domains.split(",") if d.strip()]

    official_developers = _get_field(brand, "official_developers", "developers", default=[]) or []
    if isinstance(official_developers, str):
        official_developers = [dev.strip() for dev in official_developers.split(",") if dev.strip()]

    products = _get_field(brand, "products", "product_names", default=[]) or []
    if isinstance(products, str):
        products = [p.strip() for p in products.split(",") if p.strip()]

    logo_path = _get_field(brand, "logo_path", "logo", "icon", "image", default=None)
    description = _get_field(brand, "description", "bio", default=None)

    return {
        "name": brand_name,
        "aliases": aliases,
        "all_names": all_names,
        "official_urls": official_urls,
        "official_domains": official_domains,
        "official_developers": official_developers,
        "products": products,
        "logo_path": logo_path,
        "description": description,
    }


def analyze_social_candidate(
    brand: Any,
    candidate: Any,
    config: Optional[RiskScoringConfig] = None,
) -> Dict[str, Any]:
    """Analyze a candidate social media profile against registered brand data.

    Args:
        brand: Brand information (dict or model) containing name, aliases, official URLs, etc.
        candidate: Candidate social profile (dict or model) containing display_name,
                   username/handle, url, avatar/image, bio/description.
        config: Optional custom RiskScoringConfig for tuning weights/thresholds.

    Returns:
        JSON-compatible dictionary matching the SOC 360 detection schema.
    """
    b_data = _extract_brand_data(brand)

    display_name = _get_field(candidate, "display_name", "name", default=None)
    username = _get_field(candidate, "username", "handle", default=None)
    candidate_url = _get_field(candidate, "url", "profile_url", default=None)
    candidate_image = _get_field(candidate, "avatar_path", "image_path", "logo_path", "avatar", "image", default=None)
    candidate_bio = _get_field(candidate, "bio", "description", default=None)

    # 1. Official URL exclusion check
    url_signal = check_official_url_exclusion(
        candidate_url=candidate_url,
        official_urls=b_data["official_urls"],
        official_domains=b_data["official_domains"],
    )

    # 2. Name similarity comparison
    name_fields = [
        ("display_name", display_name),
        ("username", username),
    ]
    name_res = compare_candidate_names(b_data["all_names"], name_fields)
    name_signal = {
        "similarity_score": name_res["similarity_score"],
        "match_type": name_res["match_type"],
        "field": name_res["highest_match"]["field"] if name_res["highest_match"] else "none",
        "brand_term": name_res["highest_match"]["brand_term"] if name_res["highest_match"] else b_data["name"],
        "candidate_name": name_res["highest_match"]["candidate_name"] if name_res["highest_match"] else "",
        "has_character_substitution": name_res["highest_match"]["has_character_substitution"] if name_res["highest_match"] else False,
        "has_reordered_words": name_res["highest_match"]["has_reordered_words"] if name_res["highest_match"] else False,
        "has_affix_variant": name_res["highest_match"]["has_affix_variant"] if name_res["highest_match"] else False,
        "explanation": name_res["explanation"],
        "field_matches": name_res["field_matches"],
    }

    # 3. Logo/Image comparison
    image_signal = compare_images(b_data["logo_path"], candidate_image)

    # 4. Description/Bio comparison
    desc_signal = compare_descriptions(
        brand_description=b_data["description"],
        candidate_description=candidate_bio,
        brand_names=b_data["all_names"],
        product_names=b_data["products"],
    )

    # 4b. Evaluate high-risk triggers vs benign fan/community signals
    text_corpus = f"{display_name or ''} {username or ''} {candidate_bio or ''}".lower()
    suspicious_phishing_words = [
        "support", "helpdesk", "verify", "verification", "recovery", "login",
        "signin", "auth", "billing", "giveaway", "reward", "crypto", "tokens",
        "airdrop", "unlocked", "credentials", "claim"
    ]
    community_fan_words = [
        "fan", "fans", "fanpage", "fanclub", "community", "unofficial",
        "parody", "club", "enthusiast", "enthusiasts", "tribute"
    ]
    has_suspicious_keywords = any(
        re.search(r"\b" + re.escape(w) + r"\b", text_corpus)
        for w in suspicious_phishing_words
    )
    has_fan_keywords = any(
        re.search(r"\b" + re.escape(w) + r"\b", text_corpus)
        for w in community_fan_words
    )
    is_fan_page = has_fan_keywords and not has_suspicious_keywords

    # 5. Risk scoring
    scorer = RiskScorer(config)
    assessment: RiskAssessment = scorer.calculate_risk(
        name_signal=name_signal,
        image_signal=image_signal,
        description_signal=desc_signal,
        developer_signal=None,  # Not applicable for social profiles
        official_url_signal=url_signal,
        has_suspicious_keywords=has_suspicious_keywords,
        is_fan_page=is_fan_page,
    )

    # 6. Build final explanation
    explanation = build_explanation(
        name_signal=name_signal,
        image_signal=image_signal,
        description_signal=desc_signal,
        developer_signal=None,
        official_url_signal=url_signal,
        risk_level=assessment.risk_level,
        is_official_match=assessment.is_official_match,
        exclusion_reason=assessment.exclusion_reason,
    )

    return {
        "risk_score": assessment.risk_score,
        "risk_level": assessment.risk_level,
        "review_priority": assessment.review_priority,
        "is_official_match": assessment.is_official_match,
        "exclusion_reason": assessment.exclusion_reason,
        "evidence": assessment.available_evidence,
        "missing_evidence": assessment.missing_evidence,
        "explanation": explanation,
        "signals": {
            "name_similarity": name_signal,
            "image_similarity": image_signal,
            "description_similarity": desc_signal,
            "official_url_check": url_signal,
        },
    }


def analyze_app_candidate(
    brand: Any,
    candidate: Any,
    config: Optional[RiskScoringConfig] = None,
) -> Dict[str, Any]:
    """Analyze a candidate mobile/desktop app against registered brand data.

    Args:
        brand: Brand information containing name, aliases, official developers, etc.
        candidate: Candidate app containing app_name/title, developer/publisher,
                   url/store_url, icon/image, description.
        config: Optional custom RiskScoringConfig.

    Returns:
        JSON-compatible dictionary matching the SOC 360 detection schema.
    """
    b_data = _extract_brand_data(brand)

    app_name = _get_field(candidate, "app_name", "title", "name", default=None)
    developer = _get_field(candidate, "developer", "publisher", "author", default=None)
    candidate_url = _get_field(candidate, "url", "store_url", default=None)
    candidate_image = _get_field(candidate, "icon_path", "image_path", "icon", "logo", "image", default=None)
    candidate_desc = _get_field(candidate, "description", default=None)

    # 1. Official URL exclusion check
    url_signal = check_official_url_exclusion(
        candidate_url=candidate_url,
        official_urls=b_data["official_urls"],
        official_domains=b_data["official_domains"],
    )

    # 2. App Name similarity comparison
    name_fields = [
        ("app_name", app_name),
    ]
    name_res = compare_candidate_names(b_data["all_names"], name_fields)
    name_signal = {
        "similarity_score": name_res["similarity_score"],
        "match_type": name_res["match_type"],
        "field": name_res["highest_match"]["field"] if name_res["highest_match"] else "app_name",
        "brand_term": name_res["highest_match"]["brand_term"] if name_res["highest_match"] else b_data["name"],
        "candidate_name": name_res["highest_match"]["candidate_name"] if name_res["highest_match"] else "",
        "has_character_substitution": name_res["highest_match"]["has_character_substitution"] if name_res["highest_match"] else False,
        "has_reordered_words": name_res["highest_match"]["has_reordered_words"] if name_res["highest_match"] else False,
        "has_affix_variant": name_res["highest_match"]["has_affix_variant"] if name_res["highest_match"] else False,
        "explanation": name_res["explanation"],
        "field_matches": name_res["field_matches"],
    }

    # 3. Developer / Publisher comparison
    dev_signal = compare_developers(developer, b_data["official_developers"])

    # 4. Icon / Image comparison
    image_signal = compare_images(b_data["logo_path"], candidate_image)

    # 5. App description comparison
    desc_signal = compare_descriptions(
        brand_description=b_data["description"],
        candidate_description=candidate_desc,
        brand_names=b_data["all_names"],
        product_names=b_data["products"],
    )

    # 5b. Evaluate high-risk triggers vs benign utility/companion signals
    app_text = f"{app_name or ''} {developer or ''} {candidate_desc or ''}".lower()
    suspicious_app_words = [
        "unlocked", "mod", "hack", "crack", "free coins", "reward",
        "direct gateway", "credentials", "stealer", "bypass"
    ]
    community_app_words = [
        "fan", "fans", "guide", "companion", "unofficial", "community",
        "tips", "tribute", "enthusiast"
    ]
    has_suspicious_keywords = any(
        re.search(r"\b" + re.escape(w) + r"\b", app_text)
        for w in suspicious_app_words
    )
    has_fan_keywords = any(
        re.search(r"\b" + re.escape(w) + r"\b", app_text)
        for w in community_app_words
    )
    is_fan_page = has_fan_keywords and not has_suspicious_keywords

    # 6. Risk scoring
    scorer = RiskScorer(config)
    assessment: RiskAssessment = scorer.calculate_risk(
        name_signal=name_signal,
        image_signal=image_signal,
        description_signal=desc_signal,
        developer_signal=dev_signal,
        official_url_signal=url_signal,
        has_suspicious_keywords=has_suspicious_keywords,
        is_fan_page=is_fan_page,
    )

    # 7. Explanation
    explanation = build_explanation(
        name_signal=name_signal,
        image_signal=image_signal,
        description_signal=desc_signal,
        developer_signal=dev_signal,
        official_url_signal=url_signal,
        risk_level=assessment.risk_level,
        is_official_match=assessment.is_official_match,
        exclusion_reason=assessment.exclusion_reason,
    )

    return {
        "risk_score": assessment.risk_score,
        "risk_level": assessment.risk_level,
        "review_priority": assessment.review_priority,
        "is_official_match": assessment.is_official_match,
        "exclusion_reason": assessment.exclusion_reason,
        "evidence": assessment.available_evidence,
        "missing_evidence": assessment.missing_evidence,
        "explanation": explanation,
        "signals": {
            "name_similarity": name_signal,
            "image_similarity": image_signal,
            "description_similarity": desc_signal,
            "developer_comparison": dev_signal,
            "official_url_check": url_signal,
        },
    }
