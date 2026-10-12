"""Factual, evidence-based explanation generation for SOC 360.

Produces concise, objective explanations detailing observed signals and missing
data without making conclusive fraud or scam allegations.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def build_explanation(
    name_signal: Dict[str, Any],
    image_signal: Dict[str, Any],
    description_signal: Dict[str, Any],
    developer_signal: Optional[Dict[str, Any]] = None,
    official_url_signal: Optional[Dict[str, Any]] = None,
    risk_level: str = "Low",
    is_official_match: bool = False,
    exclusion_reason: Optional[str] = None,
) -> str:
    """Generate a coherent, objective summary explanation based strictly on observed signals."""
    # 1. Official match exclusion case
    if is_official_match:
        reason = exclusion_reason or "registered official brand asset"
        return f"This account/application is excluded from risk alerts: {reason}."

    sentences: List[str] = []

    # 2. Name similarity explanation
    name_sim = name_signal.get("similarity_score", 0.0) or 0.0
    match_type = name_signal.get("match_type", "none")
    field_name = name_signal.get("field", "display name")
    brand_term = name_signal.get("brand_term", "the brand")

    if match_type == "exact":
        sentences.append(f"The candidate {field_name} exactly matches the registered brand name '{brand_term}'.")
    elif match_type == "exact_normalized":
        sentences.append(
            f"The candidate {field_name} matches '{brand_term}' with minor case, spacing, or punctuation variations."
        )
    elif match_type == "character_substitution":
        sentences.append(
            f"The candidate {field_name} matches '{brand_term}' using look-alike character or homoglyph substitutions."
        )
    elif match_type == "minor_misspelling":
        sentences.append(
            f"The candidate {field_name} is a minor misspelling or slight edit distance from '{brand_term}'."
        )
    elif match_type == "reordered_words":
        sentences.append(
            f"The candidate {field_name} uses reordered words from '{brand_term}'."
        )
    elif match_type == "suspicious_affix":
        sentences.append(
            f"The candidate {field_name} incorporates '{brand_term}' alongside high-risk keywords (e.g., support or login)."
        )
    elif match_type == "added_words":
        sentences.append(
            f"The candidate {field_name} incorporates '{brand_term}' along with additional words."
        )
    elif name_sim >= 70.0:
        sentences.append(
            f"The candidate {field_name} shows high similarity ({name_sim:.1f}%) to the brand name '{brand_term}'."
        )
    elif name_sim >= 40.0:
        sentences.append(
            f"The candidate {field_name} has moderate textual similarity ({name_sim:.1f}%) to '{brand_term}'."
        )
    else:
        sentences.append(
            f"The candidate {field_name} has low similarity to registered brand names."
        )

    # 3. Developer / publisher comparison
    if developer_signal:
        dev_status = developer_signal.get("status")
        cand_dev = developer_signal.get("candidate_developer")
        if dev_status == "match":
            sentences.append(f"The application developer '{cand_dev}' matches the registered official developer.")
        elif dev_status == "mismatch":
            sentences.append(
                f"The candidate developer '{cand_dev}' differs from registered official developers."
            )
        elif dev_status == "missing":
            sentences.append("Application developer information was not available.")

    # 4. Logo / Icon image similarity
    img_status = image_signal.get("status")
    if img_status == "completed":
        dist = image_signal.get("hash_distance")
        img_sim = image_signal.get("similarity_score", 0.0)
        if dist is not None and dist <= 5:
            sentences.append(
                f"The candidate icon is visually near-identical to the registered brand logo (distance {dist}, {img_sim:.1f}% similarity)."
            )
        elif dist is not None and dist <= 12:
            sentences.append(
                f"The candidate icon has high visual similarity to the brand logo (distance {dist}, {img_sim:.1f}% similarity)."
            )
        elif dist is not None and dist <= 20:
            sentences.append(
                f"The candidate icon shows moderate visual overlap (distance {dist}, {img_sim:.1f}% similarity)."
            )
        else:
            sentences.append("The candidate icon is visually distinct from the registered logo.")
    elif img_status == "invalid_image":
        sentences.append("The supplied candidate icon could not be processed due to an unreadable or invalid image file.")
    else:
        sentences.append("The candidate icon could not be compared because no image was supplied.")

    # 5. Description comparison
    if description_signal.get("available"):
        brand_terms = description_signal.get("brand_terms_found", [])
        desc_sim = description_signal.get("similarity_score", 0.0)
        if brand_terms:
            sentences.append(
                f"The candidate description explicitly references brand/product terms ({', '.join(brand_terms[:3])})."
            )
        elif desc_sim and desc_sim >= 40.0:
            sentences.append(
                f"The description shares distinct keyword phrases with the registered brand profile ({desc_sim:.1f}% overlap)."
            )

    return " ".join(sentences)
