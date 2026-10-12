import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_optional_user
from app.schemas.brand import BrandCreate, BrandUpdate, BrandResponse
from app.services.brand_service import BrandService

router = APIRouter(prefix="/brands", tags=["Brands"])


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED, summary="Register a new Brand")
def create_brand(
    brand_in: BrandCreate,
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Register a brand profile with official domains, logos, social URLs, app IDs, and aliases.
    Associates the record with the authenticated user ID when logged in.
    """
    if not brand_in.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brand name cannot be blank.",
        )
    user_id = user["id"] if user else None
    return BrandService.create_brand(db, brand_in, user_id=user_id)


@router.get("", response_model=List[BrandResponse], summary="List all registered Brands")
def list_brands(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Retrieve all registered brands ordered by creation time.
    Filters by the authenticated user when a session is active.
    """
    user_id = user["id"] if user else None
    return BrandService.list_brands(db, skip=skip, limit=limit, user_id=user_id)


@router.get("/{brand_id}", response_model=BrandResponse, summary="Get Brand by ID")
def get_brand(
    brand_id: uuid.UUID = Path(..., description="The unique brand UUID"),
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Retrieve details for a specific registered brand.
    Enforces user isolation if an authenticated session exists.
    """
    user_id = user["id"] if user else None
    brand = BrandService.get_by_id(db, brand_id, user_id=user_id)
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand '{brand_id}' not found.",
        )
    return brand


@router.put("/{brand_id}", response_model=BrandResponse, summary="Update Brand details")
def update_brand(
    brand_in: BrandUpdate,
    brand_id: uuid.UUID = Path(..., description="The unique brand UUID"),
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Update existing brand details such as domains, aliases, official handles, or developers.
    """
    if brand_in.name is not None and not brand_in.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brand name cannot be updated to an empty string.",
        )

    user_id = user["id"] if user else None
    updated_brand = BrandService.update_brand(db, brand_id, brand_in, user_id=user_id)
    if not updated_brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand '{brand_id}' not found.",
        )
    return updated_brand


@router.delete("/{brand_id}", status_code=status.HTTP_200_OK, summary="Delete a Brand")
def delete_brand(
    brand_id: uuid.UUID = Path(..., description="The unique brand UUID"),
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Delete a brand profile and cascade deletion of its associated scans, candidates, and findings.
    """
    user_id = user["id"] if user else None
    deleted = BrandService.delete_brand(db, brand_id, user_id=user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand '{brand_id}' not found.",
        )
    return {"detail": "Brand deleted successfully", "id": str(brand_id)}


@router.post(
    "/{brand_id}/scan",
    status_code=status.HTTP_201_CREATED,
    summary="Execute Complete Brand Monitoring Scan",
)
def scan_brand_workflow(
    brand_id: uuid.UUID = Path(..., description="The unique brand UUID"),
    is_demo: bool = True,
    db: Session = Depends(get_db),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Primary Brand-First monitoring workflow:
    Loads the registered brand profile, coordinates candidate discovery across social
    channels and mobile app stores, executes similarity scoring & evidence extraction,
    deduplicates against existing findings, and persists results.
    """
    from app.services.scan_service import ScanService
    from app.schemas.scan import BrandScanResponse, ScanResponse
    from app.schemas.finding import FindingResponse

    user_id = user["id"] if user else None
    brand = BrandService.get_by_id(db, brand_id, user_id=user_id)
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand '{brand_id}' not found.",
        )

    try:
        result = ScanService.execute_brand_scan(db, brand_id=brand_id, is_demo=is_demo)
        return BrandScanResponse(
            brand_id=result["brand_id"],
            brand_name=result["brand_name"],
            status=result["status"],
            candidates_analyzed=result["candidates_analyzed"],
            findings_generated=result["findings_generated"],
            scans=[ScanResponse.model_validate(s) for s in result["scans"]],
            findings=[FindingResponse.model_validate(f) for f in result["findings"]],
            is_demo=result["is_demo"],
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(re))
