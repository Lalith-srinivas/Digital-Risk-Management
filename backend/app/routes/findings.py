import uuid
import math
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_optional_user
from app.schemas.common import (
    SourceTypeEnum,
    RiskLevelEnum,
    ReviewStatusEnum,
    PaginatedResponse,
)
from app.schemas.finding import FindingResponse, FindingStatusUpdate
from app.services.finding_service import FindingService

router = APIRouter(prefix="/findings", tags=["Findings"])


@router.get("", response_model=PaginatedResponse[FindingResponse], summary="List and Filter Findings")
def list_findings(
    brand_id: Optional[uuid.UUID] = Query(None, description="Filter findings by brand UUID"),
    source_type: Optional[SourceTypeEnum] = Query(None, description="Filter by candidate source type ('social' or 'app')"),
    risk_level: Optional[RiskLevelEnum] = Query(None, description="Filter by risk level ('low', 'medium', 'high', 'critical')"),
    review_status: Optional[ReviewStatusEnum] = Query(None, description="Filter by review status label"),
    is_demo: Optional[bool] = Query(None, description="Filter demo vs live findings"),
    sort_by: str = Query("created_at", pattern="^(created_at|risk_score|updated_at)$", description="Sort field"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$", description="Sort direction"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Retrieve paginated risk findings with multi-attribute filtering and sorting.
    Enforces user isolation when authenticated.
    """
    user_id = user["id"] if user else None
    findings, total = FindingService.list_findings(
        db,
        brand_id=brand_id,
        source_type=source_type.value if source_type else None,
        risk_level=risk_level.value if risk_level else None,
        review_status=review_status.value if review_status else None,
        is_demo=is_demo,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
        user_id=user_id,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return PaginatedResponse(
        items=[FindingResponse.model_validate(f) for f in findings],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{finding_id}", response_model=FindingResponse, summary="Get Finding Details")
def get_finding(
    finding_id: uuid.UUID = Path(..., description="Unique finding UUID"),
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Retrieve full details, evidence breakdown, candidate metadata, and audit trail for a finding.
    """
    user_id = user["id"] if user else None
    finding = FindingService.get_by_id(db, finding_id, user_id=user_id)
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found.",
        )
    return FindingResponse.model_validate(finding)


@router.patch("/{finding_id}/status", response_model=FindingResponse, summary="Update Finding Review Status")
@router.patch("/{finding_id}", response_model=FindingResponse, include_in_schema=False)
def update_finding_status(
    status_update: FindingStatusUpdate,
    finding_id: uuid.UUID = Path(..., description="Unique finding UUID"),
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Update human analyst review label (New, Under Review, Confirmed, False Positive, Closed)
    and append an investigation audit log entry.
    """
    user_id = user["id"] if user else None
    finding = FindingService.get_by_id(db, finding_id, user_id=user_id)
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found.",
        )

    try:
        new_status = status_update.get_status_label()
        notes = status_update.get_notes()
        analyst = status_update.get_analyst_name()
        if user and user.get("email") and (not analyst or analyst == "Security Analyst"):
            analyst = user.get("email").split("@")[0]

        updated = FindingService.update_review_status(
            db, finding_id, new_status, notes=notes, analyst_name=analyst
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Finding '{finding_id}' not found.",
            )
        return FindingResponse.model_validate(updated)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
