import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models.brand import Brand
from app.models.scan import Scan
from app.models.finding import Finding
from app.auth import get_optional_user


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_guest_scan_executes_in_memory_with_zero_db_writes(client, db):
    """
    Verify Phase 5 and Phase 7 requirement:
    Guest scanning processes in memory, returns detection results, and writes ZERO records
    to persistent database tables (brands, scans, findings).
    """
    guest_brand_name = f"GuestCorp_{uuid.uuid4().hex[:6]}"

    initial_brand_count = db.query(Brand).count()
    initial_scan_count = db.query(Scan).count()
    initial_finding_count = db.query(Finding).count()

    payload = {
        "name": guest_brand_name,
        "website": "https://guestcorp.example.com",
        "official_social_urls": [f"https://x.com/{guest_brand_name.lower()}"],
        "official_apps": [f"com.{guest_brand_name.lower()}.app"],
        "is_demo": True,
    }

    response = client.post("/scan/guest", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert data["brand_name"] == guest_brand_name
    assert data["status"] == "completed"
    assert data["candidates_analyzed"] > 0
    assert data["findings_generated"] > 0
    assert data["is_guest"] is True
    assert "GUEST DATA PRIVACY" in data["privacy_notice"]
    assert len(data["findings"]) > 0

    # Ensure each finding has calculated scores and explanations
    for f in data["findings"]:
        assert 0 <= f["risk_score"] <= 100
        assert f["risk_level"] in ["low", "medium", "high", "critical", "Low", "Medium", "High", "Critical"]
        assert "evidence" in f

    # CRITICAL VERIFICATION: Zero rows added to database!
    after_brand_count = db.query(Brand).count()
    after_scan_count = db.query(Scan).count()
    after_finding_count = db.query(Finding).count()

    assert after_brand_count == initial_brand_count
    assert after_scan_count == initial_scan_count
    assert after_finding_count == initial_finding_count

    # Double-check specific name query
    assert db.query(Brand).filter(Brand.name == guest_brand_name).first() is None


def test_multi_user_brand_and_stats_isolation(client, db):
    """
    Verify Phase 14 and Phase 15 requirement:
    Multi-user database isolation ensures User A cannot access User B's brands or metrics.
    """
    user_a_id = uuid.uuid4()
    user_b_id = uuid.uuid4()

    # Mock user A dependency
    app.dependency_overrides[get_optional_user] = lambda: {"id": user_a_id, "email": "usera@example.com"}

    brand_a_name = f"UserABrand_{uuid.uuid4().hex[:6]}"
    res_a = client.post("/brands", json={"name": brand_a_name, "website": "https://brand-a.com"})
    assert res_a.status_code == 201
    brand_a_id = res_a.json()["id"]

    # Verify User A sees brand A
    res_list_a = client.get("/brands")
    assert res_list_a.status_code == 200
    names_a = [b["name"] for b in res_list_a.json()]
    assert brand_a_name in names_a

    # Switch to User B
    app.dependency_overrides[get_optional_user] = lambda: {"id": user_b_id, "email": "userb@example.com"}

    # User B lists brands: should NOT see User A's brand
    res_list_b = client.get("/brands")
    assert res_list_b.status_code == 200
    names_b = [b["name"] for b in res_list_b.json()]
    assert brand_a_name not in names_b

    # User B attempts to access User A's brand by ID: should be 404 Not Found
    res_get_a_by_b = client.get(f"/brands/{brand_a_id}")
    assert res_get_a_by_b.status_code == 404

    # Check stats for User B who has 0 brands: should return onboarding clean state
    res_stats_b = client.get("/stats")
    assert res_stats_b.status_code == 200
    stats_b = res_stats_b.json()
    assert stats_b["totalBrands"] == 0
    assert stats_b["socialScanned"] == 0
    assert stats_b["appsScanned"] == 0
    assert stats_b["suspiciousFindings"] == 0

    # Cleanup dependency override
    app.dependency_overrides.pop(get_optional_user, None)

    # Cleanup created test brand
    b_obj = db.query(Brand).filter(Brand.id == uuid.UUID(brand_a_id)).first()
    if b_obj:
        db.delete(b_obj)
        db.commit()
