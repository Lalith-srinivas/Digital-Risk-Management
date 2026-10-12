"""SOC 360 Digital Risk Detection Package.

Provides similarity detection, official account exclusion, and risk scoring
for impersonating social profiles and suspicious applications.
"""

from .detector import analyze_app_candidate, analyze_social_candidate
from .explanations import build_explanation
from .logo_matcher import compare_images, compute_perceptual_hashes
from .name_matcher import compare_candidate_names, compare_name_pair, normalize_text
from .risk_scoring import RiskAssessment, RiskScorer, RiskScoringConfig, SignalScores
from .text_matcher import (
    check_official_url_exclusion,
    compare_descriptions,
    compare_developers,
    normalize_url,
)

__all__ = [
    "analyze_social_candidate",
    "analyze_app_candidate",
    "compare_candidate_names",
    "compare_name_pair",
    "normalize_text",
    "compare_images",
    "compute_perceptual_hashes",
    "compare_descriptions",
    "compare_developers",
    "check_official_url_exclusion",
    "normalize_url",
    "RiskScorer",
    "RiskScoringConfig",
    "RiskAssessment",
    "SignalScores",
    "build_explanation",
]
