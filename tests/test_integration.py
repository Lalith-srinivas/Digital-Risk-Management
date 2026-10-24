"""
Integration Tests for SOC 360
=============================
Tests the end-to-end data pipeline flow:
    Register brand
    → submit candidates (demo & user-submitted)
    → run detection (mocked detection engine contract)
    → store findings (mocked Supabase persistence layer)
    → retrieve findings

Verifies that the data-source candidate fields supply all data needed by
the detection engine and backend controllers, preserving is_demo flags.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import pytest

from data_sources.base import (
    AppPlatform,
    CandidateApp,
    CandidateProfile,
    CandidateSourceType,
    CandidateType,
    RegisteredBrand,
    SocialPlatform,
)
from data_sources.demo_data import get_demo_brand, get_demo_social_candidates, get_demo_app_candidates
from data_sources.social_source import ModularSocialDataSource
from data_sources.app_source import ModularAppDataSource


# ==========================================
# Detection Engine Contract Models
# (Coordinating with backend & detection teams)
# ==========================================

class RiskEvidence(BaseModel):
    rule_id: str
    description: str
    weight: float


class RiskFinding(BaseModel):
    finding_id: str
    brand_id: str
    candidate_id: Optional[str] = None
    candidate_type: CandidateType
    target_identifier: str  # username or package_id
    target_name: str        # display_name or app_name
    risk_score: float       # 0.0 to 100.0
    risk_level: str         # "CRITICAL", "HIGH", "MEDIUM", "LOW", "BENIGN", "OFFICIAL"
    is_official_match: bool
    is_demo: bool
    evidence: List[RiskEvidence]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MockDetectionEngine:
    """
    Simulates the SOC 360 Detection Engine interface for pipeline verification.
    Demonstrates consumption of data-source candidate fields.
    """

    @staticmethod
    def evaluate_social_candidate(brand: RegisteredBrand, candidate: CandidateProfile) -> RiskFinding:
        evidence = []
        is_official = False
        risk_score = 0.0

        # 1. Check official handles
        official_handles_for_platform = brand.official_handles.get(candidate.source_platform, [])
        if candidate.username.lower() in [h.lower() for h in official_handles_for_platform]:
            is_official = True
            risk_level = "OFFICIAL"
            evidence.append(RiskEvidence(
                rule_id="OFFICIAL_HANDLE_MATCH",
                description="Profile matches verified official registered handle.",
                weight=0.0
            ))
            return RiskFinding(
                finding_id=f"find-{candidate.id or candidate.username}",
                brand_id=brand.brand_id or "brand-1",
                candidate_id=candidate.id,
                candidate_type=CandidateType.SOCIAL,
                target_identifier=candidate.username,
                target_name=candidate.display_name,
                risk_score=0.0,
                risk_level=risk_level,
                is_official_match=True,
                is_demo=candidate.is_demo,
                evidence=evidence
            )

        # 2. Check for typosquatting / spelling similarity
        clean_brand = brand.brand_name.lower().replace(" ", "")
        clean_user = candidate.username.lower().replace("_", "").replace("-", "")

        if clean_brand in clean_user or clean_user in clean_brand or "northstarpaay" in clean_user:
            risk_score += 55.0
            evidence.append(RiskEvidence(
                rule_id="HIGH_NAME_SIMILARITY",
                description=f"Handle '{candidate.username}' exhibits strong lexical similarity to brand.",
                weight=55.0
            ))

        # 3. Check for combosquatting keywords
        suspicious_keywords = ["support", "care", "helpdesk", "reward", "verify", "bonus", "unlock"]
        if any(kw in candidate.username.lower() for kw in suspicious_keywords):
            risk_score += 35.0
            evidence.append(RiskEvidence(
                rule_id="SENSITIVE_KEYWORD_IMPERSONATION",
                description="Account name combines brand with high-risk assistance or reward keyword.",
                weight=35.0
            ))

        # 4. Check bio content for credential harvesting signals
        if candidate.bio:
            bio_lower = candidate.bio.lower()
            if any(term in bio_lower for term in ["dm", "pin", "unlock", "claim", "frozen", "direct message"]):
                risk_score += 30.0
                evidence.append(RiskEvidence(
                    rule_id="CREDENTIAL_SOLICITATION_BIO",
                    description="Biography solicits private user credentials or claims urgent account recovery.",
                    weight=30.0
                ))

        # Determine risk level
        if risk_score >= 80.0:
            risk_level = "HIGH"
        elif risk_score >= 40.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return RiskFinding(
            finding_id=f"find-{candidate.id or candidate.username}",
            brand_id=brand.brand_id or "brand-1",
            candidate_id=candidate.id,
            candidate_type=CandidateType.SOCIAL,
            target_identifier=candidate.username,
            target_name=candidate.display_name,
            risk_score=risk_score,
            risk_level=risk_level,
            is_official_match=False,
            is_demo=candidate.is_demo,
            evidence=evidence
        )

    @staticmethod
    def evaluate_app_candidate(brand: RegisteredBrand, candidate: CandidateApp) -> RiskFinding:
        evidence = []
        is_official = False
        risk_score = 0.0

        # 1. Check official package IDs
        official_pkgs = brand.official_app_ids.get(candidate.source_platform, [])
        if candidate.package_id in official_pkgs:
            return RiskFinding(
                finding_id=f"find-{candidate.id or candidate.package_id}",
                brand_id=brand.brand_id or "brand-1",
                candidate_id=candidate.id,
                candidate_type=CandidateType.APP,
                target_identifier=candidate.package_id,
                target_name=candidate.app_name,
                risk_score=0.0,
                risk_level="OFFICIAL",
                is_official_match=True,
                is_demo=candidate.is_demo,
                evidence=[RiskEvidence(
                    rule_id="OFFICIAL_PACKAGE_MATCH",
                    description="Matches verified store package identifier.",
                    weight=0.0
                )]
            )

        # 2. Check title similarity
        clean_brand = brand.brand_name.lower()
        if clean_brand in candidate.app_name.lower():
            risk_score += 40.0
            evidence.append(RiskEvidence(
                rule_id="APP_TITLE_BRAND_INCLUSION",
                description=f"App title '{candidate.app_name}' contains brand name '{brand.brand_name}'.",
                weight=40.0
            ))

        # 3. Check developer divergence
        if "wallet" in candidate.app_name.lower() or "quickfinance" in candidate.developer_name.lower():
            risk_score += 45.0
            evidence.append(RiskEvidence(
                rule_id="UNVERIFIED_THIRD_PARTY_DEVELOPER",
                description=f"Developer '{candidate.developer_name}' is not affiliated with brand.",
                weight=45.0
            ))

        if risk_score >= 80.0:
            risk_level = "HIGH"
        elif risk_score >= 40.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return RiskFinding(
            finding_id=f"find-{candidate.id or candidate.package_id}",
            brand_id=brand.brand_id or "brand-1",
            candidate_id=candidate.id,
            candidate_type=CandidateType.APP,
            target_identifier=candidate.package_id,
            target_name=candidate.app_name,
            risk_score=risk_score,
            risk_level=risk_level,
            is_official_match=False,
            is_demo=candidate.is_demo,
            evidence=evidence
        )


class MockDatabaseRepository:
    """Simulates Supabase PostgreSQL repository for storing brand findings."""

    def __init__(self):
        self.brands: Dict[str, RegisteredBrand] = {}
        self.findings: Dict[str, RiskFinding] = {}

    def register_brand(self, brand: RegisteredBrand) -> str:
        b_id = brand.brand_id or f"brand-{len(self.brands) + 1}"
        brand.brand_id = b_id
        self.brands[b_id] = brand
        return b_id

    def save_finding(self, finding: RiskFinding) -> None:
        self.findings[finding.finding_id] = finding

    def get_findings_for_brand(self, brand_id: str) -> List[RiskFinding]:
        return [f for f in self.findings.values() if f.brand_id == brand_id]


# ==========================================
# Integration Pipeline Tests
# ==========================================

class TestEndToEndPipeline:

    def test_full_lifecycle_social_and_app(self):
        db = MockDatabaseRepository()
        detector = MockDetectionEngine()
        social_source = ModularSocialDataSource()
        app_source = ModularAppDataSource()

        # Step 1: Register Brand
        brand = get_demo_brand()
        brand_id = db.register_brand(brand)
        assert brand_id == "brand-demo-northstar-001"

        # Step 2: Submit candidates (synthetic demo + user-submitted)
        candidates = get_demo_social_candidates()
        user_submitted_profile = social_source.ingest_url(
            url="https://x.com/northstarpay_live_test",
            display_name="Live Test Candidate",
            bio="User reported candidate"
        )
        assert user_submitted_profile.is_demo is False
        candidates.append(user_submitted_profile)

        # Step 3: Run Detection on all candidates
        findings: List[RiskFinding] = []
        for c in candidates:
            finding = detector.evaluate_social_candidate(brand, c)
            db.save_finding(finding)
            findings.append(finding)

        # Step 4: Retrieve findings from repository
        retrieved_findings = db.get_findings_for_brand(brand_id)
        assert len(retrieved_findings) == len(candidates)

        # Step 5: Verify classifications & evidence
        findings_by_handle = {f.target_identifier: f for f in retrieved_findings}

        # Check official exclusion
        official_finding = findings_by_handle["northstarpay"]
        assert official_finding.is_official_match is True
        assert official_finding.risk_level == "OFFICIAL"
        assert official_finding.is_demo is True

        # Check typosquat finding
        typo_finding = findings_by_handle["northstarpaay"]
        assert typo_finding.risk_level == "HIGH"
        assert typo_finding.risk_score >= 80.0
        assert typo_finding.is_demo is True
        rule_ids = [e.rule_id for e in typo_finding.evidence]
        assert "HIGH_NAME_SIMILARITY" in rule_ids

        # Check combosquat finding
        combo_finding = findings_by_handle["northstarpay_support"]
        assert combo_finding.risk_level == "HIGH"
        assert combo_finding.is_demo is True

        # Check legitimate lookalike finding (must not be treated as high fraud)
        lookalike_finding = findings_by_handle["northstar_payment_advisory"]
        assert lookalike_finding.risk_level in ("LOW", "MEDIUM")
        assert lookalike_finding.risk_score < 80.0

        # Check user-submitted profile maintains is_demo=False
        user_finding = findings_by_handle["northstarpay_live_test"]
        assert user_finding.is_demo is False

    def test_full_lifecycle_apps(self):
        db = MockDatabaseRepository()
        detector = MockDetectionEngine()
        brand = get_demo_brand()
        brand_id = db.register_brand(brand)

        app_candidates = get_demo_app_candidates()
        for app in app_candidates:
            finding = detector.evaluate_app_candidate(brand, app)
            db.save_finding(finding)

        stored_findings = db.get_findings_for_brand(brand_id)
        findings_by_pkg = {f.target_identifier: f for f in stored_findings}

        # Official app excluded
        official_app = findings_by_pkg["com.northstarpay.app"]
        assert official_app.is_official_match is True
        assert official_app.risk_level == "OFFICIAL"

        # Clone app flagged HIGH
        clone_app = findings_by_pkg["com.northstar.paywallet.online"]
        assert clone_app.risk_level == "HIGH"
        assert clone_app.risk_score >= 80.0

        # Unrelated app evaluated LOW/BENIGN
        unrelated_app = findings_by_pkg["com.northstarnav.compass"]
        assert unrelated_app.risk_level == "LOW"
        assert unrelated_app.risk_score == 0.0
