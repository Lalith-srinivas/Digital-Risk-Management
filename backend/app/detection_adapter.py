import re
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DetectionInput(BaseModel):
    """Normalized payload sent to the detection engine."""
    brand_name: str
    brand_website: Optional[str] = None
    official_social_urls: List[str] = Field(default_factory=list)
    official_apps: List[Any] = Field(default_factory=list)
    official_developers: List[str] = Field(default_factory=list)
    aliases: List[str] = Field(default_factory=list)
    source_type: str  # 'social' or 'app'

    # Candidate profile/app details
    candidate_name: str
    username: Optional[str] = None
    source_url: Optional[str] = None
    developer_name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    package_identifier: Optional[str] = None
    is_demo: bool = False


class DetectionResult(BaseModel):
    """Stable structured result expected from the detection engine."""
    risk_score: int = Field(..., ge=0, le=100, description="Calculated risk score 0-100")
    risk_level: str = Field(..., description="'low', 'medium', 'high', or 'critical'")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Structured signals and flags")
    explanation: str = Field(..., description="Human-readable risk assessment rationale")
    review_recommendation: str = Field(..., description="'Review', 'Escalate', or 'Ignore'")
    is_temporary_adapter: bool = True
    engine_name: str = "soc360_internal_adapter_v1"


def calculate_risk_level(score: int) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 30:
        return "medium"
    return "low"


class BaseDetectionEngine(ABC):
    @abstractmethod
    def analyze(self, data: DetectionInput) -> DetectionResult:
        """Run brand impersonation/risk detection on candidate."""
        pass


class InternalDetectionAdapter(BaseDetectionEngine):
    """
    Temporary baseline adapter adhering to the stable detection contract.
    Coordinates with feature/detection branch. Markedly flags outputs as adapter results.
    """

    def analyze(self, data: DetectionInput) -> DetectionResult:
        brand_terms = [data.brand_name.lower().strip()] + [
            a.lower().strip() for a in data.aliases if a and a.strip()
        ]

        candidate_name_lower = (data.candidate_name or "").lower().strip()
        candidate_user_lower = (data.username or "").lower().strip()
        candidate_desc_lower = (data.description or "").lower().strip()
        candidate_url_lower = (data.source_url or "").lower().strip()
        candidate_dev_lower = (data.developer_name or "").lower().strip()
        candidate_pkg_lower = (data.package_identifier or "").lower().strip()

        # Check if explicitly registered as official
        if data.source_type == "social":
            for official_url in data.official_social_urls:
                if official_url and official_url.lower().rstrip("/") in candidate_url_lower.rstrip("/"):
                    return DetectionResult(
                        risk_score=5,
                        risk_level="low",
                        evidence={
                            "matched_official_url": official_url,
                            "verified_official": True,
                            "adapter_note": "Candidate matches a registered official social profile.",
                            "is_temporary_adapter": True,
                        },
                        explanation="Verified official brand account. Matches registered official social URL.",
                        review_recommendation="Ignore",
                        is_temporary_adapter=True,
                    )

        if data.source_type == "app":
            for official_app in data.official_apps:
                app_str = str(official_app).lower()
                if candidate_pkg_lower and candidate_pkg_lower in app_str:
                    return DetectionResult(
                        risk_score=10,
                        risk_level="low",
                        evidence={
                            "matched_official_app": official_app,
                            "verified_official": True,
                            "adapter_note": "Candidate package matches official app record.",
                            "is_temporary_adapter": True,
                        },
                        explanation="Verified official application matching registered brand app records.",
                        review_recommendation="Ignore",
                        is_temporary_adapter=True,
                    )
            for official_dev in data.official_developers:
                if candidate_dev_lower and candidate_dev_lower == official_dev.lower().strip():
                    return DetectionResult(
                        risk_score=15,
                        risk_level="low",
                        evidence={
                            "matched_official_developer": official_dev,
                            "verified_official": True,
                            "adapter_note": "Developer name matches registered official developer.",
                            "is_temporary_adapter": True,
                        },
                        explanation="Application published by verified official brand developer.",
                        review_recommendation="Ignore",
                        is_temporary_adapter=True,
                    )

        # Heuristic / Rule-based detection
        score = 0
        signals: Dict[str, Any] = {
            "name_impersonation": False,
            "handle_impersonation": False,
            "description_brand_mention": False,
            "unauthorized_developer": False,
            "suspicious_keywords": [],
            "adapter_note": "Score generated by backend temporary adapter pending detection engine release.",
            "is_temporary_adapter": True,
        }

        # Check name likeness
        matched_terms = [t for t in brand_terms if t in candidate_name_lower]
        if matched_terms:
            signals["name_impersonation"] = True
            signals["matched_terms"] = matched_terms
            score += 45

        # Check username / handle likeness
        if candidate_user_lower and any(t in candidate_user_lower for t in brand_terms):
            signals["handle_impersonation"] = True
            score += 35

        # Check description/bio
        if candidate_desc_lower and any(t in candidate_desc_lower for t in brand_terms):
            signals["description_brand_mention"] = True
            score += 15

        # High-risk trigger words (phishing/scam indicators)
        suspicious_words = ["support", "helpdesk", "verify", "official", "login", "auth", "free", "giveaway", "reward", "crypto", "secure"]
        found_words = [w for w in suspicious_words if w in candidate_name_lower or w in candidate_user_lower or w in candidate_desc_lower]
        if found_words:
            signals["suspicious_keywords"] = found_words
            score += 20

        # For apps: unauthorized developer warning
        if data.source_type == "app":
            if candidate_dev_lower and data.official_developers:
                if not any(d.lower().strip() == candidate_dev_lower for d in data.official_developers):
                    signals["unauthorized_developer"] = True
                    score += 25

        # Cap score at 100 and floor at 10 if there was any name match
        score = min(score, 100)
        if score == 0 and (candidate_name_lower or candidate_user_lower):
            score = 15  # baseline unverified score

        risk_level = calculate_risk_level(score)
        
        if score >= 75:
            recommendation = "Escalate"
            explanation = f"Critical risk detected: High-confidence brand impersonation targeting '{data.brand_name}'. Potential phishing or rogue profile."
        elif score >= 50:
            recommendation = "Review"
            explanation = f"Moderate-to-high risk detected: Candidate uses brand identity markers of '{data.brand_name}' without verified authorization."
        else:
            recommendation = "Review" if score >= 30 else "Ignore"
            explanation = f"Low risk: Limited identity overlap with '{data.brand_name}'."

        return DetectionResult(
            risk_score=score,
            risk_level=risk_level,
            evidence=signals,
            explanation=explanation,
            review_recommendation=recommendation,
            is_temporary_adapter=True,
        )


# Global detection engine instance
_engine: BaseDetectionEngine = InternalDetectionAdapter()


def get_detection_engine() -> BaseDetectionEngine:
    return _engine


def set_detection_engine(engine: BaseDetectionEngine) -> None:
    """Allows runtime substitution or testing of detection engine."""
    global _engine
    _engine = engine
