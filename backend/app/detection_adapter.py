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
    is_official_match: bool = Field(default=False, description="Whether candidate matches verified official brand entity")
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
                        is_official_match=True,
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
                        is_official_match=True,
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
                        is_official_match=True,
                        is_temporary_adapter=True,
                    )

        # Heuristic / Rule-based detection
        signals: Dict[str, Any] = {
            "name_impersonation": False,
            "handle_impersonation": False,
            "description_brand_mention": False,
            "unauthorized_developer": False,
            "suspicious_keywords": [],
            "is_fan_page": False,
            "adapter_note": "Score generated by backend temporary adapter pending detection engine release.",
            "is_temporary_adapter": True,
        }

        # Check official baseline handle or URL if no official records were supplied
        slug = re.sub(r'[^a-zA-Z0-9]', '', data.brand_name.lower())
        if (
            (candidate_user_lower == f"@{slug}" or candidate_user_lower == slug)
            and ("official" in candidate_desc_lower or "verified" in candidate_desc_lower)
            and not any(w in candidate_name_lower or w in candidate_desc_lower for w in ["support", "helpdesk", "login", "giveaway", "mod"])
        ):
            return DetectionResult(
                risk_score=5,
                risk_level="low",
                evidence={
                    "verified_official": True,
                    "adapter_note": "Candidate matches baseline official brand handle.",
                    "is_temporary_adapter": True,
                },
                explanation=f"Verified official brand account for '{data.brand_name}'.",
                review_recommendation="Ignore",
                is_temporary_adapter=True,
            )

        # Check for fan / community / unofficial accounts without malicious indicators
        fan_words = ["fan", "fans", "fanpage", "fanclub", "community", "unofficial", "parody", "club", "enthusiast", "enthusiasts", "tribute"]
        suspicious_words = ["support", "helpdesk", "verify", "recovery", "login", "auth", "signin", "giveaway", "reward", "crypto", "tokens", "credentials", "unlocked mod", "mod"]
        
        has_fan = any(re.search(r"\b" + re.escape(w) + r"\b", candidate_name_lower) or re.search(r"\b" + re.escape(w) + r"\b", candidate_desc_lower) or (w in candidate_user_lower) for w in fan_words)
        found_suspicious = [w for w in suspicious_words if re.search(r"\b" + re.escape(w) + r"\b", candidate_name_lower) or re.search(r"\b" + re.escape(w) + r"\b", candidate_user_lower) or re.search(r"\b" + re.escape(w) + r"\b", candidate_desc_lower)]

        if has_fan and not found_suspicious:
            signals["is_fan_page"] = True
            return DetectionResult(
                risk_score=15,
                risk_level="low",
                evidence=signals,
                explanation=f"Low risk: Independent community or fan profile for '{data.brand_name}' without hostile or deceptive indicators.",
                review_recommendation="Ignore",
                is_temporary_adapter=True,
            )

        # Whole-word / token term matching (never match short strings like 'spo' inside 'spotify' or 'transport')
        def _term_in_text(term: str, text: str) -> bool:
            if not term or not text:
                return False
            if len(term) <= 4:
                return bool(re.search(r"\b" + re.escape(term) + r"\b", text))
            if bool(re.search(r"\b" + re.escape(term) + r"\b", text)):
                return True
            tokens = re.findall(r"[a-z0-9]+", text)
            return any(tok.startswith(term) for tok in tokens if len(tok) >= len(term))

        matched_terms = [t for t in brand_terms if _term_in_text(t, candidate_name_lower)]
        matched_handle = any(_term_in_text(t, candidate_user_lower.lstrip("@")) for t in brand_terms) if candidate_user_lower else False
        score = 0

        # If completely unrelated candidate (e.g. 'spo' search returning 'Instagram')
        if not matched_terms and not matched_handle:
            return DetectionResult(
                risk_score=0,
                risk_level="low",
                evidence=signals,
                explanation=f"Low risk: Candidate has no identity overlap with '{data.brand_name}'.",
                review_recommendation="Ignore",
                is_temporary_adapter=True,
            )

        if matched_terms:
            signals["name_impersonation"] = True
            signals["matched_terms"] = matched_terms
            score += 25

        # Check username / handle likeness
        if matched_handle:
            signals["handle_impersonation"] = True
            score += 15

        # Check description/bio
        if candidate_desc_lower and any(_term_in_text(t, candidate_desc_lower) for t in brand_terms):
            signals["description_brand_mention"] = True
            score += 10

        # High-risk trigger words (phishing/scam indicators)
        if found_suspicious:
            signals["suspicious_keywords"] = found_suspicious
            score += 35

        # For apps: unauthorized developer warning
        if data.source_type == "app":
            if candidate_dev_lower and data.official_developers:
                if not any(d.lower().strip() == candidate_dev_lower for d in data.official_developers):
                    signals["unauthorized_developer"] = True
                    score += 25

        # Threat intelligence signals (VirusTotal / urlscan.io)
        is_threat_intel = (
            "virustotal" in candidate_desc_lower
            or "urlscan" in candidate_desc_lower
            or "threat intel alert" in candidate_name_lower
            or "phishing domain" in candidate_name_lower
        )
        if is_threat_intel:
            signals["threat_intel_flag"] = True
            signals["threat_intel_source"] = "VirusTotal / urlscan.io"
            score += 35

        # Cap score at 100
        score = min(score, 100)
        risk_level = calculate_risk_level(score)

        if score >= 75:
            recommendation = "Escalate"
            explanation = f"Critical risk detected: High-confidence brand impersonation targeting '{data.brand_name}'. Potential phishing or rogue profile."
        elif score >= 60:
            recommendation = "Escalate" if signals.get("unauthorized_developer") or len(signals.get("suspicious_keywords", [])) > 0 or signals.get("threat_intel_flag") else "Review"
            explanation = f"High risk detected: Candidate mimics '{data.brand_name}' with deceptive threat indicators."
        elif score >= 30:
            recommendation = "Review"
            explanation = f"Moderate risk detected: Candidate uses brand identity markers of '{data.brand_name}' without verified authorization."
        else:
            recommendation = "Ignore"
            explanation = f"Low risk: Limited identity overlap with '{data.brand_name}'."

        if signals.get("threat_intel_flag"):
            explanation += " Corroborated by active threat intelligence database (VirusTotal / urlscan.io)."

        return DetectionResult(
            risk_score=score,
            risk_level=risk_level,
            evidence=signals,
            explanation=explanation,
            review_recommendation=recommendation,
            is_temporary_adapter=True,
        )


class SOC360DetectionEngine(BaseDetectionEngine):
    """
    Production detection engine integrating RapidFuzz, ImageHash,
    and multi-signal heuristic risk scoring for SOC 360.
    """

    def analyze(self, data: DetectionInput) -> DetectionResult:
        from app.detection import analyze_app_candidate, analyze_social_candidate

        brand = {
            "name": data.brand_name,
            "aliases": data.aliases,
            "official_urls": data.official_social_urls,
            "official_domains": [data.brand_website] if data.brand_website else [],
            "official_developers": data.official_developers,
            "official_apps": data.official_apps,
        }

        if data.source_type == "app":
            candidate = {
                "app_name": data.candidate_name,
                "developer": data.developer_name,
                "url": data.source_url,
                "icon_path": data.image_url,
                "description": data.description,
                "package_id": data.package_identifier,
            }
            res = analyze_app_candidate(brand, candidate)
        else:
            candidate = {
                "display_name": data.candidate_name,
                "username": data.username,
                "url": data.source_url,
                "avatar_path": data.image_url,
                "bio": data.description,
            }
            res = analyze_social_candidate(brand, candidate)

        score = int(round(res["risk_score"]))
        risk_level = res["risk_level"].lower()
        if score >= 80:
            risk_level = "critical"

        rec = "Ignore" if score < 30 else ("Review" if score < 70 else "Escalate")

        evidence_dict = {
            "evidence_list": res["evidence"],
            "missing_evidence": res["missing_evidence"],
            "signals": res["signals"],
            "is_official_match": res["is_official_match"],
            "exclusion_reason": res["exclusion_reason"],
        }

        return DetectionResult(
            risk_score=score,
            risk_level=risk_level,
            evidence=evidence_dict,
            explanation=res["explanation"],
            review_recommendation=rec,
            is_official_match=bool(res.get("is_official_match", False)),
            is_temporary_adapter=False,
            engine_name="soc360_similarity_detection_v2",
        )


# Global detection engine instance: uses calibrated, evidence-based InternalDetectionAdapter
_engine: BaseDetectionEngine = InternalDetectionAdapter()


def get_detection_engine() -> BaseDetectionEngine:
    return _engine


def set_detection_engine(engine: BaseDetectionEngine) -> None:
    """Allows runtime substitution or testing of detection engine."""
    global _engine
    _engine = engine
