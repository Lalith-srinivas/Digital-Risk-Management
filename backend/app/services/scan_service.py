import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
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

        if not request.candidates:
            raise ValueError("Candidate list cannot be empty for scan")

        # 1. Create Scan record in 'running' status
        scan = Scan(
            brand_id=brand.id,
            source_type="social",
            status="running",
            started_at=utc_now(),
            candidates_checked=0,
            findings_created=0,
            is_demo=bool(request.is_demo),
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)

        detector = get_detection_engine()
        findings: List[Finding] = []

        try:
            for item in request.candidates:
                # 2. Save candidate
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
                    is_demo=bool(item.is_demo or request.is_demo),
                    created_at=utc_now(),
                )
                db.add(cand)
                db.flush()  # populate cand.id

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
                    is_demo=bool(item.is_demo or request.is_demo),
                )
                det_result = detector.analyze(det_input)

                # 4. Save structured finding
                finding = Finding(
                    brand_id=brand.id,
                    candidate_id=cand.id,
                    scan_id=scan.id,
                    source_type="social",
                    risk_score=det_result.risk_score,
                    risk_level=det_result.risk_level,
                    evidence=det_result.evidence,
                    explanation=det_result.explanation,
                    review_status="New",
                    is_demo=bool(item.is_demo or request.is_demo),
                    created_at=utc_now(),
                    updated_at=utc_now(),
                )
                db.add(finding)
                findings.append(finding)

            # 5. Update scan status upon success
            scan.status = "completed"
            scan.completed_at = utc_now()
            scan.candidates_checked = len(request.candidates)
            scan.findings_created = len(findings)
            db.commit()
            db.refresh(scan)
            for f in findings:
                db.refresh(f)

            return scan, findings

        except Exception as e:
            db.rollback()
            # Mark scan as failed
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

        if not request.candidates:
            raise ValueError("Candidate list cannot be empty for scan")

        # 1. Create Scan record in 'running' status
        scan = Scan(
            brand_id=brand.id,
            source_type="app",
            status="running",
            started_at=utc_now(),
            candidates_checked=0,
            findings_created=0,
            is_demo=bool(request.is_demo),
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)

        detector = get_detection_engine()
        findings: List[Finding] = []

        try:
            for item in request.candidates:
                # 2. Save candidate
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
                    is_demo=bool(item.is_demo or request.is_demo),
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
                    is_demo=bool(item.is_demo or request.is_demo),
                )
                det_result = detector.analyze(det_input)

                # 4. Save structured finding
                finding = Finding(
                    brand_id=brand.id,
                    candidate_id=cand.id,
                    scan_id=scan.id,
                    source_type="app",
                    risk_score=det_result.risk_score,
                    risk_level=det_result.risk_level,
                    evidence=det_result.evidence,
                    explanation=det_result.explanation,
                    review_status="New",
                    is_demo=bool(item.is_demo or request.is_demo),
                    created_at=utc_now(),
                    updated_at=utc_now(),
                )
                db.add(finding)
                findings.append(finding)

            # 5. Update scan status upon success
            scan.status = "completed"
            scan.completed_at = utc_now()
            scan.candidates_checked = len(request.candidates)
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
