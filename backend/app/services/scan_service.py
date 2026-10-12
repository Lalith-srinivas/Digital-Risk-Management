import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.brand import Brand
from app.models.candidate import Candidate
from app.models.scan import Scan
from app.models.finding import Finding
from app.schemas.candidate import SocialCandidateInput, AppCandidateInput
from app.schemas.scan import SocialScanRequest, AppScanRequest
from app.detection_adapter import (
    DetectionInput,
    get_detection_engine,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def sanitize_slug(name: str) -> str:
    slug = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
    return slug or "brand"


def discover_social_candidates(brand: Brand) -> List[SocialCandidateInput]:
    """
    Generate realistic candidate profiles for digital risk monitoring when automated
    crawling / connectors are unconfigured or in demonstration mode.
    """
    slug = sanitize_slug(brand.name)
    candidates: List[SocialCandidateInput] = []

    # 1. High-risk Impersonator claiming official support
    candidates.append(
        SocialCandidateInput(
            display_name=f"{brand.name} Support & Helpdesk",
            username=f"@{slug}_support_desk",
            profile_url=f"https://x.com/{slug}_support_desk",
            platform="Twitter/X",
            bio=f"Official verified support and recovery service for {brand.name}. DM us for urgent account assistance.",
            image_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&auto=format&fit=crop&q=80",
            is_demo=True,
        )
    )

    # 2. Telegram / Crypto / Giveaway scam
    candidates.append(
        SocialCandidateInput(
            display_name=f"{brand.name} Bonus & Community Rewards",
            username=f"@{slug}_rewards_bot",
            profile_url=f"https://t.me/{slug}_rewards_bot",
            platform="Telegram",
            bio=f"Claim your exclusive {brand.name} verification reward and membership tokens now. Limited registration.",
            image_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&auto=format&fit=crop&q=80",
            is_demo=True,
        )
    )

    # 3. Typosquat / Homoglyph variant on Instagram
    typo_slug = slug[:3] + "o" + slug[3:] if len(slug) > 3 else slug + "x"
    candidates.append(
        SocialCandidateInput(
            display_name=f"{brand.name} Official Deals",
            username=f"@{typo_slug}",
            profile_url=f"https://instagram.com/{typo_slug}",
            platform="Instagram",
            bio=f"Unofficial portal sharing daily discounts, promo codes and updates for {brand.name} users.",
            image_url="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=96&auto=format&fit=crop&q=80",
            is_demo=True,
        )
    )

    # 4. Benign Community Fan Group (lower risk priority)
    candidates.append(
        SocialCandidateInput(
            display_name=f"{brand.name} Global Fans",
            username=f"@{slug}_fans",
            profile_url=f"https://x.com/{slug}_fans",
            platform="Twitter/X",
            bio=f"Independent fan community and discussion club for {brand.name}. Unofficial & community run.",
            image_url="https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=96&auto=format&fit=crop&q=80",
            is_demo=True,
        )
    )

    # 5. Official / Authorized reference account (to demonstrate zero/low risk baseline)
    official_url = (
        brand.official_social_urls[0]
        if (brand.official_social_urls and len(brand.official_social_urls) > 0)
        else f"https://x.com/{slug}"
    )
    candidates.append(
        SocialCandidateInput(
            display_name=brand.name,
            username=f"@{slug}",
            profile_url=official_url,
            platform="Twitter/X",
            bio=f"The verified official account of {brand.name}.",
            image_url=getattr(brand, "logo_url", None) or "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=96&auto=format&fit=crop&q=80",
            is_demo=True,
        )
    )

    return candidates


def discover_app_candidates(brand: Brand) -> List[AppCandidateInput]:
    """
    Generate realistic candidate mobile applications across app stores and APK mirrors.
    """
    slug = sanitize_slug(brand.name)
    candidates: List[AppCandidateInput] = []

    # 1. High-risk Rogue APK Mirror Mod
    candidates.append(
        AppCandidateInput(
            app_name=f"{brand.name} Mobile Pro (Unlocked)",
            package_identifier=f"com.unauthorized.{slug}.mod",
            developer_name=f"{brand.name} Global Direct",
            store_url=f"https://apk-mirrors.net/download/{slug}-pro-v2",
            store_type="APK Mirror / Third-party",
            description=f"Full premium edition of {brand.name} with unlocked capabilities and direct credentials gateway.",
            icon_url="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96&auto=format&fit=crop&q=80",
            is_demo=True,
        )
    )

    # 2. Suspicious Helper / Utility App
    candidates.append(
        AppCandidateInput(
            app_name=f"{brand.name} Account Assistant & Tool",
            package_identifier=f"org.tools.{slug}helper",
            developer_name="FastUtility Global LLC",
            store_url=f"https://thirdparty-market.com/apps/{slug}-tool",
            store_type="Third-party Store",
            description=f"Companion application for {brand.name} customers to organize settings, notifications and alerts.",
            icon_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&auto=format&fit=crop&q=80",
            is_demo=True,
        )
    )

    # 3. Baseline Official Application
    official_dev = (
        brand.official_developers[0]
        if (brand.official_developers and len(brand.official_developers) > 0)
        else f"{brand.name} Inc."
    )
    official_pkg = (
        brand.official_apps[0]
        if (brand.official_apps and len(brand.official_apps) > 0)
        else f"com.{slug}.official"
    )
    candidates.append(
        AppCandidateInput(
            app_name=brand.name,
            package_identifier=official_pkg,
            developer_name=official_dev,
            store_url=f"https://play.google.com/store/apps/details?id={official_pkg}",
            store_type="Google Play Store",
            description=f"The verified official mobile application from {brand.name}.",
            icon_url=getattr(brand, "logo_url", None) or "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=96&auto=format&fit=crop&q=80",
            is_demo=True,
        )
    )

    return candidates


class ScanService:
    @staticmethod
    def get_by_id(db: Session, scan_id: uuid.UUID) -> Optional[Scan]:
        return db.query(Scan).filter(Scan.id == scan_id).first()

    @staticmethod
    def list_scans(
        db: Session,
        brand_id: Optional[uuid.UUID] = None,
        source_type: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Scan], int]:
        query = db.query(Scan)
        if brand_id:
            query = query.filter(Scan.brand_id == brand_id)
        if source_type:
            query = query.filter(Scan.source_type == source_type)
        if status:
            query = query.filter(Scan.status == status)

        total = query.count()
        scans = query.order_by(Scan.started_at.desc()).offset(skip).limit(limit).all()
        return scans, total

    @staticmethod
    def execute_social_scan(db: Session, request: SocialScanRequest) -> Tuple[Scan, List[Finding]]:
        brand = db.query(Brand).filter(Brand.id == request.brand_id).first()
        if not brand:
            raise ValueError(f"Brand with ID '{request.brand_id}' not found")

        # Candidate discovery fallback if no candidates provided
        candidate_items = request.candidates
        if not candidate_items:
            candidate_items = discover_social_candidates(brand)

        is_demo_run = bool(request.is_demo or any(c.is_demo for c in candidate_items))

        # 1. Create Scan record in 'running' status
        scan = Scan(
            brand_id=brand.id,
            source_type="social",
            status="running",
            started_at=utc_now(),
            candidates_checked=0,
            findings_created=0,
            is_demo=is_demo_run,
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)

        detector = get_detection_engine()
        findings: List[Finding] = []

        try:
            for item in candidate_items:
                # 2. Candidate Deduplication / Upsert
                cand = None
                if item.profile_url:
                    cand = (
                        db.query(Candidate)
                        .filter(
                            Candidate.brand_id == brand.id,
                            Candidate.source_type == "social",
                            Candidate.source_url == item.profile_url,
                        )
                        .first()
                    )
                if not cand and item.username:
                    cand = (
                        db.query(Candidate)
                        .filter(
                            Candidate.brand_id == brand.id,
                            Candidate.source_type == "social",
                            Candidate.username == item.username,
                        )
                        .first()
                    )

                if cand:
                    # Update existing candidate
                    cand.candidate_name = item.display_name
                    cand.username = item.username
                    cand.source_url = item.profile_url
                    cand.description = item.bio
                    cand.image_url = item.image_url
                    cand.is_demo = bool(item.is_demo or is_demo_run)
                else:
                    cand = Candidate(
                        brand_id=brand.id,
                        source_type="social",
                        candidate_name=item.display_name,
                        username=item.username,
                        source_url=item.profile_url,
                        developer_name=None,
                        description=item.bio,
                        image_url=item.image_url,
                        package_identifier=None,
                        is_demo=bool(item.is_demo or is_demo_run),
                        created_at=utc_now(),
                    )
                    db.add(cand)

                db.flush()

                # 3. Call detection adapter
                det_input = DetectionInput(
                    brand_name=brand.name,
                    brand_website=brand.website,
                    official_social_urls=brand.official_social_urls or [],
                    official_apps=brand.official_apps or [],
                    official_developers=brand.official_developers or [],
                    aliases=brand.aliases or [],
                    source_type="social",
                    candidate_name=item.display_name,
                    username=item.username,
                    source_url=item.profile_url,
                    developer_name=None,
                    description=item.bio,
                    image_url=item.image_url,
                    package_identifier=None,
                    is_demo=bool(item.is_demo or is_demo_run),
                )
                det_result = detector.analyze(det_input)

                # 4. Finding Deduplication / Upsert
                existing_finding = (
                    db.query(Finding)
                    .filter(
                        Finding.brand_id == brand.id,
                        Finding.candidate_id == cand.id,
                    )
                    .first()
                )

                if existing_finding:
                    existing_finding.scan_id = scan.id
                    existing_finding.risk_score = det_result.risk_score
                    existing_finding.risk_level = det_result.risk_level
                    existing_finding.evidence = det_result.evidence
                    existing_finding.explanation = det_result.explanation
                    existing_finding.is_demo = bool(item.is_demo or is_demo_run)
                    existing_finding.updated_at = utc_now()
                    findings.append(existing_finding)
                else:
                    new_finding = Finding(
                        brand_id=brand.id,
                        candidate_id=cand.id,
                        scan_id=scan.id,
                        source_type="social",
                        risk_score=det_result.risk_score,
                        risk_level=det_result.risk_level,
                        evidence=det_result.evidence,
                        explanation=det_result.explanation,
                        review_status="New",
                        is_demo=bool(item.is_demo or is_demo_run),
                        created_at=utc_now(),
                        updated_at=utc_now(),
                    )
                    db.add(new_finding)
                    findings.append(new_finding)

            # 5. Complete Scan
            scan.status = "completed"
            scan.completed_at = utc_now()
            scan.candidates_checked = len(candidate_items)
            scan.findings_created = len(findings)
            db.commit()
            db.refresh(scan)
            for f in findings:
                db.refresh(f)

            return scan, findings

        except Exception as e:
            db.rollback()
            failed_scan = db.query(Scan).filter(Scan.id == scan.id).first()
            if failed_scan:
                failed_scan.status = "failed"
                failed_scan.completed_at = utc_now()
                failed_scan.error_message = str(e)
                db.commit()
                db.refresh(failed_scan)
                scan = failed_scan
            raise RuntimeError(f"Scan failed during execution: {str(e)}") from e

    @staticmethod
    def execute_app_scan(db: Session, request: AppScanRequest) -> Tuple[Scan, List[Finding]]:
        brand = db.query(Brand).filter(Brand.id == request.brand_id).first()
        if not brand:
            raise ValueError(f"Brand with ID '{request.brand_id}' not found")

        # Candidate discovery fallback if no candidates provided
        candidate_items = request.candidates
        if not candidate_items:
            candidate_items = discover_app_candidates(brand)

        is_demo_run = bool(request.is_demo or any(c.is_demo for c in candidate_items))

        # 1. Create Scan record in 'running' status
        scan = Scan(
            brand_id=brand.id,
            source_type="app",
            status="running",
            started_at=utc_now(),
            candidates_checked=0,
            findings_created=0,
            is_demo=is_demo_run,
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)

        detector = get_detection_engine()
        findings: List[Finding] = []

        try:
            for item in candidate_items:
                # 2. Candidate Deduplication / Upsert
                cand = None
                if item.package_identifier:
                    cand = (
                        db.query(Candidate)
                        .filter(
                            Candidate.brand_id == brand.id,
                            Candidate.source_type == "app",
                            Candidate.package_identifier == item.package_identifier,
                        )
                        .first()
                    )
                if not cand and item.store_url:
                    cand = (
                        db.query(Candidate)
                        .filter(
                            Candidate.brand_id == brand.id,
                            Candidate.source_type == "app",
                            Candidate.source_url == item.store_url,
                        )
                        .first()
                    )

                if cand:
                    cand.candidate_name = item.app_name
                    cand.developer_name = item.developer_name
                    cand.description = item.description
                    cand.image_url = item.icon_url
                    cand.package_identifier = item.package_identifier
                    cand.is_demo = bool(item.is_demo or is_demo_run)
                else:
                    cand = Candidate(
                        brand_id=brand.id,
                        source_type="app",
                        candidate_name=item.app_name,
                        username=None,
                        source_url=item.store_url,
                        developer_name=item.developer_name,
                        description=item.description,
                        image_url=item.icon_url,
                        package_identifier=item.package_identifier,
                        is_demo=bool(item.is_demo or is_demo_run),
                        created_at=utc_now(),
                    )
                    db.add(cand)

                db.flush()

                # 3. Call detection adapter
                det_input = DetectionInput(
                    brand_name=brand.name,
                    brand_website=brand.website,
                    official_social_urls=brand.official_social_urls or [],
                    official_apps=brand.official_apps or [],
                    official_developers=brand.official_developers or [],
                    aliases=brand.aliases or [],
                    source_type="app",
                    candidate_name=item.app_name,
                    username=None,
                    source_url=item.store_url,
                    developer_name=item.developer_name,
                    description=item.description,
                    image_url=item.icon_url,
                    package_identifier=item.package_identifier,
                    is_demo=bool(item.is_demo or is_demo_run),
                )
                det_result = detector.analyze(det_input)

                # 4. Finding Deduplication / Upsert
                existing_finding = (
                    db.query(Finding)
                    .filter(
                        Finding.brand_id == brand.id,
                        Finding.candidate_id == cand.id,
                    )
                    .first()
                )

                if existing_finding:
                    existing_finding.scan_id = scan.id
                    existing_finding.risk_score = det_result.risk_score
                    existing_finding.risk_level = det_result.risk_level
                    existing_finding.evidence = det_result.evidence
                    existing_finding.explanation = det_result.explanation
                    existing_finding.is_demo = bool(item.is_demo or is_demo_run)
                    existing_finding.updated_at = utc_now()
                    findings.append(existing_finding)
                else:
                    new_finding = Finding(
                        brand_id=brand.id,
                        candidate_id=cand.id,
                        scan_id=scan.id,
                        source_type="app",
                        risk_score=det_result.risk_score,
                        risk_level=det_result.risk_level,
                        evidence=det_result.evidence,
                        explanation=det_result.explanation,
                        review_status="New",
                        is_demo=bool(item.is_demo or is_demo_run),
                        created_at=utc_now(),
                        updated_at=utc_now(),
                    )
                    db.add(new_finding)
                    findings.append(new_finding)

            # 5. Complete Scan
            scan.status = "completed"
            scan.completed_at = utc_now()
            scan.candidates_checked = len(candidate_items)
            scan.findings_created = len(findings)
            db.commit()
            db.refresh(scan)
            for f in findings:
                db.refresh(f)

            return scan, findings

        except Exception as e:
            db.rollback()
            failed_scan = db.query(Scan).filter(Scan.id == scan.id).first()
            if failed_scan:
                failed_scan.status = "failed"
                failed_scan.completed_at = utc_now()
                failed_scan.error_message = str(e)
                db.commit()
                db.refresh(failed_scan)
                scan = failed_scan
            raise RuntimeError(f"Scan failed during execution: {str(e)}") from e

    @staticmethod
    def execute_brand_scan(
        db: Session,
        brand_id: uuid.UUID,
        is_demo: bool = True,
    ) -> Dict[str, Any]:
        """
        Coordinated monitoring workflow for a brand:
        Executes social media surveillance and mobile application store discovery.
        """
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            raise ValueError(f"Brand '{brand_id}' not found")

        social_req = SocialScanRequest(brand_id=brand_id, candidates=None, is_demo=is_demo)
        social_scan, social_findings = ScanService.execute_social_scan(db, social_req)

        app_req = AppScanRequest(brand_id=brand_id, candidates=None, is_demo=is_demo)
        app_scan, app_findings = ScanService.execute_app_scan(db, app_req)

        all_findings = list(social_findings) + list(app_findings)
        total_candidates = social_scan.candidates_checked + app_scan.candidates_checked

        return {
            "brand_id": brand.id,
            "brand_name": brand.name,
            "status": "completed",
            "candidates_analyzed": total_candidates,
            "findings_generated": len(all_findings),
            "scans": [social_scan, app_scan],
            "findings": all_findings,
            "is_demo": is_demo,
        }
