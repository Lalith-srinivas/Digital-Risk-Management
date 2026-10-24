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
from app.connectors import get_connector_manager
from app.services.brand_validator import BrandValidator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def sanitize_slug(name: str) -> str:
    slug = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
    return slug or "brand"


def discover_social_candidates(brand: Any, is_demo: bool = False) -> List[SocialCandidateInput]:
    """
    Candidate discovery for social channels.
    When is_demo is True, generates explicitly marked demonstration candidates.
    When is_demo is False (normal scan), queries live data source connectors.
    Never invents profiles in production live scanning.
    """
    mgr = get_connector_manager()
    brand_info = {
        "official_social_urls": getattr(brand, "official_social_urls", []) or [],
        "logo_url": getattr(brand, "logo_url", None),
    }

    if is_demo:
        return mgr.generate_demo_social_candidates(brand.name, brand_info)

    # Live connector discovery
    live_candidates, _ = mgr.discover_live_social_candidates(brand.name, brand_info)
    return live_candidates


def discover_app_candidates(brand: Any, is_demo: bool = False) -> List[AppCandidateInput]:
    """
    Candidate discovery for mobile application marketplaces.
    When is_demo is True, generates explicitly marked demonstration applications.
    When is_demo is False (normal scan), queries live data source connectors (e.g. Apple App Store).
    Never invents mobile apps in production live scanning.
    """
    mgr = get_connector_manager()
    brand_info = {
        "official_developers": getattr(brand, "official_developers", []) or [],
        "official_apps": getattr(brand, "official_apps", []) or [],
        "logo_url": getattr(brand, "logo_url", None),
    }

    if is_demo:
        return mgr.generate_demo_app_candidates(brand.name, brand_info)

    # Live connector discovery
    live_candidates, _ = mgr.discover_live_app_candidates(brand.name, brand_info)
    return live_candidates


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

        is_demo_run = bool(request.is_demo)

        # Candidate discovery: only query connectors or use explicitly supplied candidates
        candidate_items = request.candidates
        if candidate_items is None:
            candidate_items = discover_social_candidates(brand, is_demo=is_demo_run)

        # Check if any candidate has demo flag
        if any(c.is_demo for c in candidate_items):
            is_demo_run = True

        # 1. Create Scan record in 'running' status
        scan = Scan(
            brand_id=brand.id,
            source_type="social",
            status="running",
            started_at=utc_now(),
            candidates_checked=0,
            findings_created=0,
            is_demo=is_demo_run,
            user_id=getattr(brand, "user_id", None),
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
                    existing_finding.user_id = getattr(brand, "user_id", None)
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
                        user_id=getattr(brand, "user_id", None),
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

        is_demo_run = bool(request.is_demo)

        # Candidate discovery: only query connectors or use explicitly supplied candidates
        candidate_items = request.candidates
        if candidate_items is None:
            candidate_items = discover_app_candidates(brand, is_demo=is_demo_run)

        if any(c.is_demo for c in candidate_items):
            is_demo_run = True

        # 1. Create Scan record in 'running' status
        scan = Scan(
            brand_id=brand.id,
            source_type="app",
            status="running",
            started_at=utc_now(),
            candidates_checked=0,
            findings_created=0,
            is_demo=is_demo_run,
            user_id=getattr(brand, "user_id", None),
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
                    existing_finding.user_id = getattr(brand, "user_id", None)
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
                        user_id=getattr(brand, "user_id", None),
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
        is_demo: bool = False,
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

    @staticmethod
    def execute_guest_scan(request: Any) -> Dict[str, Any]:
        """
        Process a brand scan in-memory for guest users with ZERO database writes.
        Executes real candidate discovery via working data-source connectors.
        Never fabricates results unless explicit demo mode is requested.
        """
        from app.schemas.scan import GuestScanRequest
        if isinstance(request, dict):
            req = GuestScanRequest.from_flexible_dict(request)
        elif isinstance(request, GuestScanRequest):
            req = request
        else:
            req = GuestScanRequest.from_flexible_dict(dict(request))

        class InMemoryBrand:
            def __init__(
                self,
                name: str,
                website: Optional[str] = None,
                logo_url: Optional[str] = None,
                official_social_urls: Optional[List[str]] = None,
                official_apps: Optional[List[str]] = None,
                official_developers: Optional[List[str]] = None,
                aliases: Optional[List[str]] = None,
            ):
                self.id = uuid.uuid4()
                self.name = name
                self.website = website
                self.logo_url = logo_url
                self.official_social_urls = official_social_urls or []
                self.official_apps = official_apps or []
                self.official_developers = official_developers or []
                self.aliases = aliases or []

        brand = InMemoryBrand(
            name=req.name,
            website=req.website,
            logo_url=req.logo_url,
            official_social_urls=req.official_social_urls,
            official_apps=req.official_apps,
            official_developers=req.official_developers,
            aliases=req.aliases,
        )

        # 1. Brand Identity Validation
        brand_val = BrandValidator.validate_brand(
            name=brand.name,
            website=brand.website,
            official_social_urls=brand.official_social_urls,
            official_apps=brand.official_apps,
        )

        detector = get_detection_engine()
        connector_mgr = get_connector_manager()
        brand_info = {
            "official_social_urls": brand.official_social_urls,
            "official_apps": brand.official_apps,
            "official_developers": brand.official_developers,
            "logo_url": brand.logo_url,
        }

        # 2. Candidate Discovery (Live vs Demo Mode)
        is_demo_mode = bool(req.is_demo)
        sources_status_dict: Dict[str, Any] = {}

        if is_demo_mode:
            social_items = connector_mgr.generate_demo_social_candidates(brand.name, brand_info)
            app_items = connector_mgr.generate_demo_app_candidates(brand.name, brand_info)
            sources_status_dict = connector_mgr.get_sources_status()
        else:
            # Query live connectors
            social_items, social_statuses = connector_mgr.discover_live_social_candidates(brand.name, brand_info)
            app_items, app_statuses = connector_mgr.discover_live_app_candidates(brand.name, brand_info)
            sources_status_dict = {
                "social": social_statuses,
                "apps": app_statuses,
                "summary": connector_mgr.get_sources_status(),
            }

        findings: List[Dict[str, Any]] = []

        # 3. Analyze social candidates in memory
        for item in social_items:
            det_input = DetectionInput(
                brand_name=brand.name,
                brand_website=brand.website,
                official_social_urls=brand.official_social_urls,
                official_apps=brand.official_apps,
                official_developers=brand.official_developers,
                aliases=brand.aliases,
                source_type="social",
                candidate_name=item.display_name,
                username=item.username,
                source_url=item.profile_url,
                developer_name=None,
                description=item.bio,
                image_url=item.image_url,
                package_identifier=None,
                is_demo=bool(item.is_demo or is_demo_mode),
            )
            res = detector.analyze(det_input)
            findings.append({
                "id": str(uuid.uuid4()),
                "brand_id": str(brand.id),
                "brandName": brand.name,
                "candidate_name": item.display_name,
                "candidateName": item.display_name,
                "candidateHandle": item.username,
                "username": item.username,
                "candidateUrl": item.profile_url,
                "source_url": item.profile_url,
                "source_type": "social",
                "sourceType": "social",
                "platform": item.platform or "Twitter/X",
                "risk_score": res.risk_score,
                "riskScore": res.risk_score,
                "risk_level": res.risk_level,
                "riskLevel": res.risk_level,
                "evidence": res.evidence,
                "explanation": res.explanation,
                "review_status": "New",
                "reviewStatus": "New",
                "is_demo": bool(item.is_demo or is_demo_mode),
                "isDemo": bool(item.is_demo or is_demo_mode),
                "is_guest": True,
                "created_at": utc_now().isoformat(),
                "detectionDate": utc_now().isoformat(),
                "avatarUrl": item.image_url or "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96",
            })

        # 4. Analyze app candidates in memory
        for item in app_items:
            det_input = DetectionInput(
                brand_name=brand.name,
                brand_website=brand.website,
                official_social_urls=brand.official_social_urls,
                official_apps=brand.official_apps,
                official_developers=brand.official_developers,
                aliases=brand.aliases,
                source_type="app",
                candidate_name=item.app_name,
                username=None,
                source_url=item.store_url,
                developer_name=item.developer_name,
                description=item.description,
                image_url=item.icon_url,
                package_identifier=item.package_identifier,
                is_demo=bool(item.is_demo or is_demo_mode),
            )
            res = detector.analyze(det_input)
            findings.append({
                "id": str(uuid.uuid4()),
                "brand_id": str(brand.id),
                "brandName": brand.name,
                "candidate_name": item.app_name,
                "candidateName": item.app_name,
                "candidateHandle": item.package_identifier or "",
                "packageId": item.package_identifier or "",
                "package_identifier": item.package_identifier or "",
                "developer": item.developer_name or "",
                "developer_name": item.developer_name or "",
                "candidateUrl": item.store_url,
                "source_url": item.store_url,
                "source_type": "app",
                "sourceType": "app",
                "platform": item.store_type or "App Marketplace",
                "risk_score": res.risk_score,
                "riskScore": res.risk_score,
                "risk_level": res.risk_level,
                "riskLevel": res.risk_level,
                "evidence": res.evidence,
                "explanation": res.explanation,
                "review_status": "New",
                "reviewStatus": "New",
                "is_demo": bool(item.is_demo or is_demo_mode),
                "isDemo": bool(item.is_demo or is_demo_mode),
                "is_guest": True,
                "created_at": utc_now().isoformat(),
                "detectionDate": utc_now().isoformat(),
                "avatarUrl": item.icon_url or "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96",
            })

        total_candidates = len(social_items) + len(app_items)

        # 5. Risk Summary & Honest Status Message
        risk_summary = {
            "Critical": len([f for f in findings if (f.get("risk_level") or "").lower() == "critical" or f.get("risk_score", 0) >= 80]),
            "High": len([f for f in findings if (f.get("risk_level") or "").lower() == "high" or (60 <= f.get("risk_score", 0) < 80)]),
            "Medium": len([f for f in findings if (f.get("risk_level") or "").lower() == "medium" or (30 <= f.get("risk_score", 0) < 60)]),
            "Low": len([f for f in findings if (f.get("risk_level") or "").lower() == "low" or f.get("risk_score", 0) < 30]),
        }

        # Determine clear evidence-based scan summary message
        high_severity = risk_summary["Critical"] + risk_summary["High"]
        if is_demo_mode:
            scan_msg = f"Demonstration Scan Mode: Generated {total_candidates} simulated candidates across social & app vectors."
        elif not brand_val.get("verified") and len(findings) == 0:
            scan_msg = (
                f"No suspicious candidates found on monitored channels. "
                f"Notice: Brand identity for '{brand.name}' could not be verified from available registries."
            )
        elif brand_val.get("verified") and high_severity == 0:
            dom = brand_val.get("domain") or "official profile"
            scan_msg = f"Brand verified ({dom}). No threats discovered across monitored channels."
        elif len(findings) == 0:
            scan_msg = f"No matching candidates retrieved from active connectors for '{brand.name}'."
        else:
            scan_msg = (
                f"Completed surveillance scan: Retrieved {total_candidates} candidates. "
                f"Identified {high_severity} high/critical risk items."
            )

        sources_checked_list = ["Apple App Store", "Google Play Store", "GitHub", "Twitter/X", "Telegram"]

        return {
            "brand_name": brand.name,
            "status": "completed",
            "candidates_analyzed": total_candidates,
            "findings_generated": len(findings),
            "social_analyzed": len(social_items),
            "apps_analyzed": len(app_items),
            "sources_checked": sources_checked_list,
            "findings": findings,
            "is_demo": is_demo_mode,
            "is_guest": True,
            "sources_status": sources_status_dict,
            "brand_verification": brand_val,
            "scan_message": scan_msg,
            "risk_summary": risk_summary,
            "privacy_notice": (
                "GUEST DATA PRIVACY: This scan was processed entirely in memory. "
                "No brand details, scans, or findings were persisted in the database."
            ),
        }
