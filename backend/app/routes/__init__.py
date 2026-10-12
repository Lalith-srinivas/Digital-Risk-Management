from app.routes.health import router as health_router
from app.routes.brands import router as brands_router
from app.routes.scans import router as scans_router
from app.routes.findings import router as findings_router

__all__ = ["health_router", "brands_router", "scans_router", "findings_router"]
