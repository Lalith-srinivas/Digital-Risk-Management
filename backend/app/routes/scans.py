import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.scan import (
    SocialScanRequest,
    AppScanRequest,
    ScanResponse,
    ScanResultResponse,
)
from app.schemas.finding import FindingResponse
from app.services.scan_service import ScanService

router = APIRouter(tags=["Scans"])


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
    Submit social profile candidates to detect unauthorized brand impersonation, rogue handles, or phishing.
    """
    if not request.candidates:
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
    Submit candidate mobile applications to detect rogue store listings, trojanized packages, or imitation apps.
    """
    if not request.candidates:
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
