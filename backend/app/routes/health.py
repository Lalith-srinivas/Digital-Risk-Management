from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health", status_code=status.HTTP_200_OK, summary="Service Health Check")
def get_health(db: Session = Depends(get_db)):
    """
    Check API service availability and database connectivity.
    """
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "service": "soc360-backend",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
