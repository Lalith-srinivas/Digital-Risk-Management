import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from app.models.finding import Finding
from app.models.candidate import Candidate


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


ALLOWED_REVIEW_STATUSES = {
    "New",
    "Under Review",
    "Confirmed Suspicious",
    "False Positive",
    "Resolved",
}


class FindingService:
    @staticmethod
    def get_by_id(db: Session, finding_id: uuid.UUID) -> Optional[Finding]:
        return (
            db.query(Finding)
            .options(joinedload(Finding.candidate))
            .filter(Finding.id == finding_id)
            .first()
        )

    @staticmethod
    def list_findings(
        db: Session,
        brand_id: Optional[uuid.UUID] = None,
        source_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        review_status: Optional[str] = None,
        is_demo: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Finding], int]:
        query = db.query(Finding).options(joinedload(Finding.candidate))

        if brand_id:
            query = query.filter(Finding.brand_id == brand_id)
        if source_type:
            query = query.filter(Finding.source_type == source_type)
        if risk_level:
            query = query.filter(Finding.risk_level == risk_level)
        if review_status:
            query = query.filter(Finding.review_status == review_status)
        if is_demo is not None:
            query = query.filter(Finding.is_demo == is_demo)

        total = query.count()

        # Sorting logic
        sort_column = Finding.created_at
        if sort_by == "risk_score":
            sort_column = Finding.risk_score
        elif sort_by == "updated_at":
            sort_column = Finding.updated_at

        if sort_dir.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        # Pagination logic
        skip = (max(1, page) - 1) * page_size
        findings = query.offset(skip).limit(page_size).all()

        return findings, total

    @staticmethod
    def update_review_status(db: Session, finding_id: uuid.UUID, new_status: str) -> Optional[Finding]:
        if new_status not in ALLOWED_REVIEW_STATUSES:
            raise ValueError(f"Invalid review status: '{new_status}'. Allowed values: {sorted(ALLOWED_REVIEW_STATUSES)}")

        finding = db.query(Finding).options(joinedload(Finding.candidate)).filter(Finding.id == finding_id).first()
        if not finding:
            return None

        finding.review_status = new_status
        finding.updated_at = utc_now()
        db.commit()
        db.refresh(finding)
        return finding
