"""
SOC 360 - Synthetic Demo Dataset
================================
Provides realistic synthetic demo records for demonstrating the SOC 360
Digital Risk Protection platform without relying on unauthorized web scraping
or unstable live external APIs.

Fictional Protected Brand:
    Name: Northstar Pay
    Domain: northstarpay.example.com
    Category: Digital Payments & Neobank

CRITICAL COMPLIANCE NOTICE:
- All synthetic records are explicitly tagged with `is_demo = True`.
- All candidate URLs use RFC 2606 / RFC 6761 reserved example domains (*.example.com, *.example.org).
- Synthetic demo data must NEVER be represented as live internet scan findings.
- This dataset demonstrates:
    1. Official account exclusion.
    2. Typosquatting / spelling variation detection.
    3. Combosquatting / "support" impersonation targeting customer credentials.
    4. Legitimate look-alikes that should NOT be automatically treated as fraud.
    5. Suspicious mobile application clones vs. unrelated applications.
"""

from typing import List, Optional, Union

from .base import (
    AppPlatform,
    CandidateApp,
    CandidateProfile,
    CandidateSourceType,
    CandidateType,
    DataSourceResponse,
    DataSourceStatus,
    RegisteredBrand,
    SocialPlatform,
)


DEMO_BRAND = RegisteredBrand(
    brand_id="brand-demo-northstar-001",
    brand_name="Northstar Pay",
    registered_domains=[
        "northstarpay.example.com",
        "northstarpay.example.org"
    ],
    official_handles={
        SocialPlatform.TWITTER.value: ["northstarpay"],
        SocialPlatform.INSTAGRAM.value: ["northstarpay_official"],
        SocialPlatform.LINKEDIN.value: ["northstar-pay"]
    },
    official_app_ids={
        AppPlatform.GOOGLE_PLAY.value: ["com.northstarpay.app"],
        AppPlatform.APPLE_APP_STORE.value: ["id9876543210"]
    },
    keywords=["payments", "wallet", "transfers", "fintech", "money", "neobank"],
    description="Northstar Pay is a premier digital payments platform providing instant peer-to-peer transfers, virtual debit cards, and automated savings."
)


DEMO_SOCIAL_PROFILES: List[CandidateProfile] = [
    CandidateProfile(
        id="demo-soc-01-official",
        candidate_type=CandidateType.SOCIAL,
        display_name="Northstar Pay Official",
        username="northstarpay",
        profile_url="https://x.example.com/northstarpay",
        bio="Official account for Northstar Pay. Instant digital payments, virtual cards, and smart savings. Customer care: @northstarpay_care.",
        image_url="https://assets.example.com/brands/northstar_official_avatar.png",
        source_platform=SocialPlatform.TWITTER.value,
        is_demo=True,
        source_type=CandidateSourceType.DEMO,
        query_matched="Northstar Pay",
        raw_metadata={
            "scenario": "official_profile",
            "expected_classification": "official_match",
            "detection_objective": "Should match registered official handles and be marked as excluded or verified official."
        }
    ),
    CandidateProfile(
        id="demo-soc-02-typosquat",
        candidate_type=CandidateType.SOCIAL,
        display_name="Northstar Pay",
        username="northstarpaay",
        profile_url="https://x.example.com/northstarpaay",
        bio="Northstar Pay verification desk. Direct message us immediately for frozen wallet unlocking and identity verification PIN.",
        image_url="https://assets.example.com/brands/northstar_copied_avatar.png",
        source_platform=SocialPlatform.TWITTER.value,
        is_demo=True,
        source_type=CandidateSourceType.DEMO,
        query_matched="Northstar Pay",
        raw_metadata={
            "scenario": "spelling_variation_typosquatting",
            "expected_classification": "high_risk_impersonator",
            "detection_objective": "High Levenshtein/Jaro-Winkler similarity (northstarpaay vs northstarpay) + credential phishing bio."
        }
    ),
    CandidateProfile(
        id="demo-soc-03-combosquat",
        candidate_type=CandidateType.SOCIAL,
        display_name="Northstar Pay Helpdesk",
        username="northstarpay_support",
        profile_url="https://instagram.example.com/northstarpay_support",
        bio="24/7 Northstar Pay Resolution Support. Send a DM with your registered email & transaction ID to restore access.",
        image_url="https://assets.example.com/brands/northstar_support_badge.png",
        source_platform=SocialPlatform.INSTAGRAM.value,
        is_demo=True,
        source_type=CandidateSourceType.DEMO,
        query_matched="Northstar Pay",
        raw_metadata={
            "scenario": "added_keyword_combosquatting",
            "expected_classification": "high_risk_impersonator",
            "detection_objective": "Combines brand name with 'support' keyword targeting distressed customers."
        }
    ),
    CandidateProfile(
        id="demo-soc-04-legitimate-lookalike",
        candidate_type=CandidateType.SOCIAL,
        display_name="Northstar Payment Advisory LLC",
        username="northstar_payment_advisory",
        profile_url="https://linkedin.example.com/company/northstar-payment-advisory",
        bio="B2B financial consultancy and merchant PCI-DSS compliance advisory based in Minnesota. Not affiliated with consumer neobank apps.",
        image_url="https://assets.example.com/brands/advisory_logo.png",
        source_platform=SocialPlatform.LINKEDIN.value,
        is_demo=True,
        source_type=CandidateSourceType.DEMO,
        query_matched="Northstar Pay",
        raw_metadata={
            "scenario": "legitimate_lookalike",
            "expected_classification": "low_risk_legitimate_entity",
            "detection_objective": "Shares 'Northstar' and 'Payment' vocabulary but is a distinct B2B consulting firm. Must NOT be automatically treated as fraud."
        }
    ),
    CandidateProfile(
        id="demo-soc-05-giveaway-scam",
        candidate_type=CandidateType.SOCIAL,
        display_name="Northstar Pay Bonus & Rewards",
        username="northstarpay_rewards",
        profile_url="https://tiktok.example.com/@northstarpay_rewards",
        bio="Claim your $500 community bonus today! Click link: https://bonus-northstarpay.example.xyz",
        image_url="https://assets.example.com/brands/gift_box.png",
        source_platform=SocialPlatform.TIKTOK.value,
        is_demo=True,
        source_type=CandidateSourceType.DEMO,
        query_matched="Northstar Pay",
        raw_metadata={
            "scenario": "incentive_giveaway_scam",
            "expected_classification": "high_risk_impersonator",
            "detection_objective": "Brand name + incentive hook lures users into external phishing links."
        }
    )
]


DEMO_APPLICATIONS: List[CandidateApp] = [
    CandidateApp(
        id="demo-app-01-official",
        candidate_type=CandidateType.APP,
        app_name="Northstar Pay: Instant Money",
        store_url="https://play.google.example.com/store/apps/details?id=com.northstarpay.app",
        package_id="com.northstarpay.app",
        developer_name="Northstar Financial Technologies Inc.",
        description="The official Northstar Pay mobile app. Send and receive money instantly, manage virtual debit cards, and budget smarter.",
        icon_url="https://assets.example.com/apps/northstar_official_icon.png",
        source_platform=AppPlatform.GOOGLE_PLAY.value,
        is_demo=True,
        source_type=CandidateSourceType.DEMO,
        query_matched="Northstar Pay",
        version="3.4.1",
        rating=4.8,
        raw_metadata={
            "scenario": "official_application",
            "expected_classification": "official_match",
            "detection_objective": "Matches registered package ID com.northstarpay.app. Excluded from risk findings."
        }
    ),
    CandidateApp(
        id="demo-app-02-suspicious-clone",
        candidate_type=CandidateType.APP,
        app_name="Northstar Pay Mobile Wallet",
        store_url="https://play.google.example.com/store/apps/details?id=com.northstar.paywallet.online",
        package_id="com.northstar.paywallet.online",
        developer_name="QuickFinance Devs LLC",
        description="Log in with your Northstar Pay account to fast-track quick cash withdrawals, debit advances, and card transfers.",
        icon_url="https://assets.example.com/apps/northstar_clone_icon.png",
        source_platform=AppPlatform.GOOGLE_PLAY.value,
        is_demo=True,
        source_type=CandidateSourceType.DEMO,
        query_matched="Northstar Pay",
        version="1.0.2",
        rating=2.1,
        raw_metadata={
            "scenario": "similar_name_different_developer",
            "expected_classification": "high_risk_clone",
            "detection_objective": "Nearly identical app name, unverified third-party developer, requests login credentials."
        }
    ),
    CandidateApp(
        id="demo-app-03-unrelated-app",
        candidate_type=CandidateType.APP,
        app_name="Northstar Compass & Trail GPS",
        store_url="https://apps.apple.example.com/app/northstar-compass/id18928374",
        package_id="com.northstarnav.compass",
        developer_name="Northstar Outdoor Tools",
        description="Off-grid hiking compass, waypoints, and topographic trail maps for backcountry navigation.",
        icon_url="https://assets.example.com/apps/compass_icon.png",
        source_platform=AppPlatform.APPLE_APP_STORE.value,
        is_demo=True,
        source_type=CandidateSourceType.DEMO,
        query_matched="Northstar Pay",
        version="2.1.0",
        rating=4.6,
        raw_metadata={
            "scenario": "unrelated_application",
            "expected_classification": "benign_unrelated",
            "detection_objective": "Shares dictionary word 'Northstar', completely different category (Navigation/Outdoor). Low risk score."
        }
    ),
    CandidateApp(
        id="demo-app-04-unofficial-helper",
        candidate_type=CandidateType.APP,
        app_name="Northstar Pay - Support & Helper",
        store_url="https://play.google.example.com/store/apps/details?id=net.fintechhelp.northstarguide",
        package_id="net.fintechhelp.northstarguide",
        developer_name="Global FinTech Tools",
        description="Utility guide and customer care hotline assistant for Northstar Pay customers. Contains troubleshooting tutorials.",
        icon_url="https://assets.example.com/apps/helper_icon.png",
        source_platform=AppPlatform.GOOGLE_PLAY.value,
        is_demo=True,
        source_type=CandidateSourceType.DEMO,
        query_matched="Northstar Pay",
        version="1.1.0",
        rating=3.2,
        raw_metadata={
            "scenario": "unofficial_guide_adware",
            "expected_classification": "medium_risk_brand_misuse",
            "detection_objective": "Uses trademark without authorization for ad monetization; intermediate risk."
        }
    )
]


def get_demo_brand() -> RegisteredBrand:
    """Return the synthetic reference brand: Northstar Pay."""
    return DEMO_BRAND.model_copy(deep=True)


def get_demo_social_candidates() -> List[CandidateProfile]:
    """Return all synthetic social media candidate records (all marked is_demo=True)."""
    return [p.model_copy(deep=True) for p in DEMO_SOCIAL_PROFILES]


def get_demo_app_candidates() -> List[CandidateApp]:
    """Return all synthetic mobile application candidate records (all marked is_demo=True)."""
    return [a.model_copy(deep=True) for a in DEMO_APPLICATIONS]


def get_all_demo_candidates() -> List[Union[CandidateProfile, CandidateApp]]:
    """Return combined list of synthetic demo records."""
    return get_demo_social_candidates() + get_demo_app_candidates()


def get_demo_social_response() -> DataSourceResponse:
    """Return standardized DataSourceResponse containing synthetic social demo data."""
    records = get_demo_social_candidates()
    return DataSourceResponse(
        source_id="synthetic_demo_social",
        status=DataSourceStatus.DEMO_MODE,
        is_demo=True,
        records=records,
        total_count=len(records),
        metadata={
            "brand": DEMO_BRAND.brand_name,
            "disclaimer": "SYNTHETIC DEMO DATA: These records are fictional examples created for hackathon demonstration."
        }
    )


def get_demo_app_response() -> DataSourceResponse:
    """Return standardized DataSourceResponse containing synthetic application demo data."""
    records = get_demo_app_candidates()
    return DataSourceResponse(
        source_id="synthetic_demo_apps",
        status=DataSourceStatus.DEMO_MODE,
        is_demo=True,
        records=records,
        total_count=len(records),
        metadata={
            "brand": DEMO_BRAND.brand_name,
            "disclaimer": "SYNTHETIC DEMO DATA: These records are fictional examples created for hackathon demonstration."
        }
    )


def get_demo_response_by_type(candidate_type: Union[str, CandidateType]) -> DataSourceResponse:
    """Retrieve demo response matching specified CandidateType ('social' or 'app')."""
    target = candidate_type.value if isinstance(candidate_type, CandidateType) else str(candidate_type).lower()
    if target == CandidateType.SOCIAL.value:
        return get_demo_social_response()
    elif target == CandidateType.APP.value:
        return get_demo_app_response()
    else:
        all_records = get_all_demo_candidates()
        return DataSourceResponse(
            source_id="synthetic_demo_all",
            status=DataSourceStatus.DEMO_MODE,
            is_demo=True,
            records=all_records,
            total_count=len(all_records),
            metadata={"disclaimer": "SYNTHETIC DEMO DATA"}
        )
