import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.auth import get_optional_user
from app.models.brand import Brand
from app.models.candidate import Candidate
from app.models.finding import Finding
from app.models.scan import Scan
from app.schemas.scan import (
    SocialScanRequest,
    AppScanRequest,
    ScanResponse,
    ScanResultResponse,
    GuestScanRequest,
    GuestScanResponse,
)
from app.schemas.finding import FindingResponse
from app.services.scan_service import ScanService
from app.connectors import get_connector_manager

router = APIRouter(tags=["Scans"])


@router.get(
    "/connectors/status",
    summary="Get Data Source Connectors Status & API Requirements",
)
def get_connectors_status() -> Dict[str, Any]:
    """
    Returns live connectivity status, required API keys, and availability
    of external data-source connectors for social media and application marketplaces.
    """
    return get_connector_manager().get_sources_status()



@router.post(
    "/scan/guest",
    response_model=GuestScanResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Guest Brand Monitoring Scan (In-Memory, Zero Persistence)",
)
def scan_guest(request: GuestScanRequest):
    """
    Guest Mode Monitoring:
    Executes brand threat detection across social and mobile application vectors in-memory.
    Guarantees privacy: No brand information, scans, or findings are persisted to the database.
    """
    if not request.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brand name cannot be blank.",
        )
    try:
        return ScanService.execute_guest_scan(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Guest scan execution error: {str(e)}",
        )


@router.post(
    "/scan/social",
    response_model=ScanResultResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate Social Monitoring Scan",
)
@router.post(
    "/scans/social",
    response_model=ScanResultResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def scan_social(request: SocialScanRequest, db: Session = Depends(get_db)):
    """
    Submit social profile candidates or trigger automated brand profile candidate discovery
    to detect unauthorized brand impersonation, rogue handles, or phishing.
    """
    if request.candidates is not None and len(request.candidates) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidates list cannot be empty.",
        )
    try:
        scan, findings = ScanService.execute_social_scan(db, request)
        return ScanResultResponse(
            scan=ScanResponse.model_validate(scan),
            findings=[FindingResponse.model_validate(f) for f in findings],
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(re),
        )


@router.post(
    "/scan/apps",
    response_model=ScanResultResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate Mobile App Store Scan",
)
@router.post(
    "/scans/apps",
    response_model=ScanResultResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def scan_apps(request: AppScanRequest, db: Session = Depends(get_db)):
    """
    Submit candidate mobile applications or trigger automated app store discovery
    to detect rogue store listings, trojanized packages, or imitation apps.
    """
    if request.candidates is not None and len(request.candidates) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidates list cannot be empty.",
        )
    try:
        scan, findings = ScanService.execute_app_scan(db, request)
        return ScanResultResponse(
            scan=ScanResponse.model_validate(scan),
            findings=[FindingResponse.model_validate(f) for f in findings],
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(re),
        )


@router.get("/scans", response_model=List[ScanResponse], summary="List Scans")
def list_scans(
    brand_id: Optional[uuid.UUID] = Query(None, description="Filter scans by Brand ID"),
    source_type: Optional[str] = Query(None, description="Filter by 'social' or 'app'"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by scan status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Retrieve historical scans with optional filters.
    """
    scans, _ = ScanService.list_scans(
        db,
        brand_id=brand_id,
        source_type=source_type,
        status=status_filter,
        skip=skip,
        limit=limit,
    )
    return scans


@router.get("/scans/{scan_id}", response_model=ScanResponse, summary="Get Scan Details")
def get_scan(scan_id: uuid.UUID = Path(..., description="Unique scan UUID"), db: Session = Depends(get_db)):
    """
    Retrieve metadata and execution counts for a specific scan.
    """
    scan = ScanService.get_by_id(db, scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan '{scan_id}' not found.",
        )
    return scan


@router.get("/stats", summary="Get Dashboard Aggregates with User Isolation")
def get_stats(
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Dict[str, Any]:
    """
    Aggregated threat telemetry and scanning metrics directly computed from backend storage.
    Enforces strict user isolation when authenticated with Supabase session.
    """
    user_id = user["id"] if user else None

    brand_query = db.query(Brand)
    scan_query = db.query(Scan)
    finding_query = db.query(Finding)

    if user_id:
        brand_query = brand_query.filter(Brand.user_id == user_id)
        scan_query = scan_query.filter(Scan.user_id == user_id)
        finding_query = finding_query.filter(Finding.user_id == user_id)

    total_brands = brand_query.count()

    # If user has 0 brands, return clean onboarding state immediately
    if total_brands == 0:
        return {
            "totalBrands": 0,
            "socialScanned": 0,
            "appsScanned": 0,
            "suspiciousFindings": 0,
            "openFindings": 0,
            "riskCounts": {"High": 0, "Medium": 0, "Low": 0},
            "sourceCounts": {"social": 0, "apps": 0, "other": 0},
            "recentFindings": [],
            "recentScans": [],
        }

    # Sum of candidate volumes
    social_checked_q = (
        db.query(func.coalesce(func.sum(Scan.candidates_checked), 0))
        .filter(Scan.source_type == "social")
    )
    app_checked_q = (
        db.query(func.coalesce(func.sum(Scan.candidates_checked), 0))
        .filter(Scan.source_type == "app")
    )
    if user_id:
        social_checked_q = social_checked_q.filter(Scan.user_id == user_id)
        app_checked_q = app_checked_q.filter(Scan.user_id == user_id)

    social_checked = social_checked_q.scalar() or 0
    app_checked = app_checked_q.scalar() or 0

    suspicious_findings = finding_query.filter(Finding.risk_score >= 60).count()
    high_risk = finding_query.filter(Finding.risk_level.in_(["high", "critical", "High", "Critical"])).count()
    med_risk = finding_query.filter(Finding.risk_level.in_(["medium", "Medium"])).count()
    low_risk = finding_query.filter(Finding.risk_level.in_(["low", "Low"])).count()

    social_findings = finding_query.filter(Finding.source_type == "social").count()
    app_findings = finding_query.filter(Finding.source_type == "app").count()
    open_findings = finding_query.filter(~Finding.review_status.in_(["Resolved", "False Positive"])).count()

    # Recent findings with hydrated candidate and brand info
    recent_findings_db = (
        finding_query
        .order_by(Finding.created_at.desc())
        .limit(5)
        .all()
    )

    recent_findings = []
    for f in recent_findings_db:
        cand = f.candidate
        brand = f.brand
        recent_findings.append({
            "id": str(f.id),
            "brandId": str(f.brand_id),
            "brandName": brand.name if brand else "Monitored Brand",
            "candidateName": cand.candidate_name if cand else "Candidate Identity",
            "candidateHandle": (cand.username or cand.package_identifier or cand.source_url) if cand else "",
            "candidateUrl": cand.source_url if cand else "",
            "sourceType": f.source_type,
            "platform": "Twitter/X" if f.source_type == "social" else "App Marketplace",
            "riskScore": f.risk_score,
            "riskLevel": f.risk_level,
            "avatarUrl": (cand.image_url if cand else None) or "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96",
            "detectionDate": f.created_at.isoformat() if f.created_at else None,
            "reviewStatus": f.review_status,
            "isDemo": f.is_demo,
        })

    # Recent scans
    recent_scans_db = (
        scan_query
        .order_by(Scan.started_at.desc())
        .limit(4)
        .all()
    )

    recent_scans = []
    for s in recent_scans_db:
        brand = s.brand
        recent_scans.append({
            "id": str(s.id),
            "brandName": brand.name if brand else "Enterprise Brand",
            "type": "Social Profiles Scan" if s.source_type == "social" else "App Store Discovery",
            "target": "Social Media" if s.source_type == "social" else "Mobile App Marketplaces",
            "timestamp": s.started_at.isoformat() if s.started_at else None,
            "duration": "12s",
            "candidatesAnalyzed": s.candidates_checked,
            "findingsGenerated": s.findings_created,
            "status": "Completed" if s.status == "completed" else s.status.capitalize(),
            "isDemo": s.is_demo,
        })

    return {
        "totalBrands": total_brands,
        "socialScanned": int(social_checked),
        "appsScanned": int(app_checked),
        "suspiciousFindings": suspicious_findings,
        "openFindings": open_findings,
        "riskCounts": {
            "High": high_risk,
            "Medium": med_risk,
            "Low": low_risk,
        },
        "sourceCounts": {
            "social": social_findings,
            "apps": app_findings,
            "other": 0,
        },
        "recentFindings": recent_findings,
        "recentScans": recent_scans,
    }
