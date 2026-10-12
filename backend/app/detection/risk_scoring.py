"""Configurable risk scoring engine for SOC 360.

Calculates a deterministic heuristic review priority score (0-100) based on
transparent weights and rules.
Missing data is treated as unknown rather than negative evidence.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class RiskScoringConfig:
    """Configurable scoring weights and category thresholds."""

    # Maximum score contributions (total sum = 100)
    weight_name_similarity: float = 35.0
    weight_developer_mismatch: float = 20.0
    weight_logo_similarity: float = 20.0
    weight_description_similarity: float = 15.0
    weight_other_evidence: float = 10.0

    # Risk category boundaries
    threshold_low_max: float = 29.0
    threshold_medium_max: float = 59.0
    # 60.0 to 100.0 is High

    # Minimum name similarity (0-100 scale) required before developer mismatch adds risk
    min_name_sim_for_dev_mismatch: float = 40.0

    # Threshold above which name match is considered high
    high_name_similarity_threshold: float = 75.0

    # Threshold for logo match
    high_logo_similarity_threshold: float = 75.0


@dataclass
class SignalScores:
    """Breakdown of calculated points per signal."""

    name_score: float = 0.0
    developer_score: float = 0.0
    logo_score: float = 0.0
    description_score: float = 0.0
    other_evidence_score: float = 0.0
    total_score: float = 0.0

    def to_dict(self) -> Dict[str, float]:
        return asdict(self)


@dataclass
class RiskAssessment:
    """Final risk assessment evaluation."""

    risk_score: float
    risk_level: str  # "Low", "Medium", "High"
    review_priority: str  # "Low", "Medium", "High", "Needs Review"
    is_official_match: bool
    exclusion_reason: Optional[str]
    signal_scores: SignalScores
    available_evidence: List[str] = field(default_factory=list)
    missing_evidence: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "review_priority": self.review_priority,
            "is_official_match": self.is_official_match,
            "exclusion_reason": self.exclusion_reason,
            "signal_scores": self.signal_scores.to_dict(),
            "available_evidence": self.available_evidence,
            "missing_evidence": self.missing_evidence,
        }


class RiskScorer:
    """Deterministic, transparent risk scorer for digital brand protection."""

    def __init__(self, config: Optional[RiskScoringConfig] = None) -> None:
        self.config = config or RiskScoringConfig()

    def calculate_risk(
        self,
        name_signal: Dict[str, Any],
        image_signal: Dict[str, Any],
        description_signal: Dict[str, Any],
        developer_signal: Optional[Dict[str, Any]] = None,
        official_url_signal: Optional[Dict[str, Any]] = None,
        has_suspicious_keywords: bool = False,
    ) -> RiskAssessment:
        """Calculate holistic risk assessment across all evaluated signals."""
        available_evidence: List[str] = []
        missing_evidence: List[str] = []

        # 1. Check official URL exclusion first
        is_official = False
        exclusion_reason: Optional[str] = None
        if official_url_signal and official_url_signal.get("is_official"):
            is_official = True
            exclusion_reason = official_url_signal.get("exclusion_reason")
            available_evidence.append(f"Official brand match: {exclusion_reason}")

            # Official assets bypass risk scoring
            return RiskAssessment(
                risk_score=0.0,
                risk_level="Low",
                review_priority="Low",
                is_official_match=True,
                exclusion_reason=exclusion_reason,
                signal_scores=SignalScores(total_score=0.0),
                available_evidence=available_evidence,
                missing_evidence=missing_evidence,
            )

        # 2. Evaluate Name Similarity Signal (0 to config.weight_name_similarity)
        name_sim_val = name_signal.get("similarity_score", 0.0) or 0.0
        # Scale 0-100 similarity to name weight
        name_pts = (name_sim_val / 100.0) * self.config.weight_name_similarity

        if name_sim_val >= 90.0:
            available_evidence.append(
                f"Candidate name is nearly identical ({name_sim_val:.1f}%) to brand"
            )
        elif name_sim_val >= 60.0:
            available_evidence.append(
                f"Candidate name shows high similarity ({name_sim_val:.1f}%) to brand"
            )
        elif name_sim_val >= 35.0:
            available_evidence.append(
                f"Candidate name shows moderate similarity ({name_sim_val:.1f}%) to brand"
            )
        else:
            # Low or unrelated
            name_pts = 0.0

        # 3. Evaluate Developer / Publisher Signal (0 to config.weight_developer_mismatch)
        # Rule: A developer mismatch alone does NOT indicate fraud.
        # Only relevant if candidate name is at least moderately similar to the brand.
        dev_pts = 0.0
        if developer_signal:
            dev_status = developer_signal.get("status")
            if dev_status == "mismatch":
                if name_sim_val >= self.config.min_name_sim_for_dev_mismatch:
                    # Proportionally scale mismatch penalty with name similarity
                    # e.g., if name is 100% brand match, full mismatch weight. If 50%, half weight.
                    scale = (name_sim_val - self.config.min_name_sim_for_dev_mismatch) / (
                        100.0 - self.config.min_name_sim_for_dev_mismatch
                    )
                    dev_pts = self.config.weight_developer_mismatch * max(0.4, scale)
                    available_evidence.append("Developer name differs from registered official developer")
                else:
                    # Name is unrelated or very weak: dev mismatch is harmless
                    dev_pts = 0.0
            elif dev_status == "match":
                # Verified developer match acts as strong mitigation!
                dev_pts = 0.0
                available_evidence.append("Developer matches registered official brand publisher")
            else:
                missing_evidence.append("Developer/publisher information unavailable")
        else:
            missing_evidence.append("Developer/publisher evaluation not applicable")

        # 4. Evaluate Logo / Image Signal (0 to config.weight_logo_similarity)
        logo_pts = 0.0
        img_status = image_signal.get("status")
        if img_status == "completed" and image_signal.get("similarity_score") is not None:
            img_sim = float(image_signal["similarity_score"])
            dist = image_signal.get("hash_distance", 64)
            if dist <= 5 or img_sim >= 90.0:
                logo_pts = self.config.weight_logo_similarity
                available_evidence.append(
                    f"Candidate icon/logo is visually near-identical to registered brand logo ({img_sim:.1f}%)"
                )
            elif dist <= 12 or img_sim >= 70.0:
                logo_pts = self.config.weight_logo_similarity * 0.75
                available_evidence.append(
                    f"Candidate icon/logo has high visual similarity to brand logo ({img_sim:.1f}%)"
                )
            elif dist <= 20 or img_sim >= 50.0:
                logo_pts = self.config.weight_logo_similarity * 0.35
                available_evidence.append(
                    f"Candidate icon/logo shares moderate visual features with brand logo ({img_sim:.1f}%)"
                )
        elif img_status in ("unavailable", "invalid_image"):
            missing_evidence.append(
                f"Logo comparison unavailable ({image_signal.get('details', {}).get('missing', 'missing image')})"
            )
        else:
            missing_evidence.append("Logo/image comparison not performed")

        # 5. Evaluate Description / Branding Signal (0 to config.weight_description_similarity)
        desc_pts = 0.0
        if description_signal.get("available") and description_signal.get("similarity_score") is not None:
            desc_sim = float(description_signal["similarity_score"])
            if desc_sim >= 40.0:
                desc_pts = (desc_sim / 100.0) * self.config.weight_description_similarity
                terms = description_signal.get("brand_terms_found", [])
                if terms:
                    available_evidence.append(
                        f"Description contains brand/product keywords ({', '.join(terms[:3])})"
                    )
                else:
                    available_evidence.append(f"Description shows textual overlap with brand profile ({desc_sim:.1f}%)")
        else:
            missing_evidence.append("Candidate description unavailable for comparison")

        # 6. Evaluate Other Evidence (0 to config.weight_other_evidence)
        other_pts = 0.0
        if has_suspicious_keywords or name_signal.get("has_affix_variant"):
            other_pts += self.config.weight_other_evidence * 0.6
            available_evidence.append("Candidate name/metadata incorporates high-risk keywords (e.g. support/login)")

        if name_signal.get("has_character_substitution"):
            other_pts += self.config.weight_other_evidence * 0.4
            available_evidence.append("Candidate name uses look-alike characters or homoglyph substitutions")

        other_pts = min(self.config.weight_other_evidence, other_pts)

        # 7. Aggregate Total Score
        raw_total = name_pts + dev_pts + logo_pts + desc_pts + other_pts
        # Strictly clamp between 0.0 and 100.0
        total_score = round(max(0.0, min(100.0, raw_total)), 2)

        # 8. Determine Risk Category and Review Priority
        if total_score <= self.config.threshold_low_max:
            risk_level = "Low"
        elif total_score <= self.config.threshold_medium_max:
            risk_level = "Medium"
        else:
            risk_level = "High"

        # Review priority:
        # Flag "Needs Review" when evidence is ambiguous or critical signals are missing
        review_priority = risk_level
        is_ambiguous = (
            # Moderate-to-high name similarity but logo or developer is missing
            (name_sim_val >= 60.0 and ("logo" in " ".join(missing_evidence).lower()))
            # Borderline score with missing data
            or (25.0 <= total_score <= 45.0 and len(missing_evidence) >= 2)
        )

        if is_ambiguous and risk_level != "High":
            review_priority = "Needs Review"

        scores = SignalScores(
            name_score=round(name_pts, 2),
            developer_score=round(dev_pts, 2),
            logo_score=round(logo_pts, 2),
            description_score=round(desc_pts, 2),
            other_evidence_score=round(other_pts, 2),
            total_score=total_score,
        )

        return RiskAssessment(
            risk_score=total_score,
            risk_level=risk_level,
            review_priority=review_priority,
            is_official_match=False,
            exclusion_reason=None,
            signal_scores=scores,
            available_evidence=available_evidence,
            missing_evidence=missing_evidence,
        )
