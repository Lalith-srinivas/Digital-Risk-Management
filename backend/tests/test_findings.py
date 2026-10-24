import uuid
import pytest


@pytest.fixture
def seeded_findings(client, sample_brand):
    """Seed findings for testing filtering, pagination, and sorting."""
    payload = {
        "brand_id": str(sample_brand.id),
        "candidates": [
            {
                "display_name": "Acme Phish 1",
                "username": "acme_login_fake",
                "bio": "Secure login for Acme Corp users",
                "is_demo": False,
            },
            {
                "display_name": "Acme Random User",
                "username": "random_user_123",
                "bio": "Fan of tech",
                "is_demo": False,
            },
            {
                "display_name": "Acme Giveaway",
                "username": "acme_giveaway",
                "bio": "Free reward coins for Acme customers",
                "is_demo": True,
            },
        ],
    }
    scan_res = client.post("/scan/social", json=payload)
    assert scan_res.status_code == 201

    app_payload = {
        "brand_id": str(sample_brand.id),
        "candidates": [
            {
                "app_name": "Acme Rogue Mobile",
                "store_url": "https://fake-store.example.com/app",
                "package_identifier": "com.rogue.acme",
                "developer_name": "Unverified dev",
                "description": "Fake application mimicking Acme Corp",
                "is_demo": False,
            }
        ],
    }
    app_res = client.post("/scan/apps", json=app_payload)
    assert app_res.status_code == 201

    return sample_brand


def test_list_findings_pagination(client, seeded_findings):
    response = client.get("/findings?page=1&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total"] == 4
    assert data["total_pages"] == 2
    assert len(data["items"]) == 2


def test_filter_findings_by_brand(client, seeded_findings):
    response = client.get(f"/findings?brand_id={seeded_findings.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4
    for item in data["items"]:
        assert item["brand_id"] == str(seeded_findings.id)


def test_filter_findings_by_source_type(client, seeded_findings):
    # App findings
    app_res = client.get("/findings?source_type=app")
    assert app_res.status_code == 200
    app_data = app_res.json()
    assert app_data["total"] == 1
    assert app_data["items"][0]["source_type"] == "app"

    # Social findings
    soc_res = client.get("/findings?source_type=social")
    assert soc_res.status_code == 200
    soc_data = soc_res.json()
    assert soc_data["total"] == 3
    for item in soc_data["items"]:
        assert item["source_type"] == "social"


def test_filter_findings_by_risk_level(client, seeded_findings):
    res = client.get("/findings?risk_level=critical")
    assert res.status_code == 200
    data = res.json()
    for item in data["items"]:
        assert item["risk_level"] == "critical"


def test_sorting_findings(client, seeded_findings):
    # Sort by risk_score desc
    res_desc = client.get("/findings?sort_by=risk_score&sort_dir=desc")
    assert res_desc.status_code == 200
    items_desc = res_desc.json()["items"]
    scores_desc = [item["risk_score"] for item in items_desc]
    assert scores_desc == sorted(scores_desc, reverse=True)

    # Sort by risk_score asc
    res_asc = client.get("/findings?sort_by=risk_score&sort_dir=asc")
    assert res_asc.status_code == 200
    items_asc = res_asc.json()["items"]
    scores_asc = [item["risk_score"] for item in items_asc]
    assert scores_asc == sorted(scores_asc)


def test_update_review_status_lifecycle(client, seeded_findings):
    # Get a finding
    list_res = client.get("/findings")
    finding_id = list_res.json()["items"][0]["id"]

    # Allowed statuses: 'New', 'Under Review', 'Confirmed Suspicious', 'False Positive', 'Resolved'
    statuses = ["Under Review", "Confirmed Suspicious", "Resolved", "False Positive"]
    for new_status in statuses:
        patch_res = client.patch(
            f"/findings/{finding_id}/status",
            json={"review_status": new_status},
        )
        assert patch_res.status_code == 200
        data = patch_res.json()
        assert data["review_status"] == new_status

    # Filter by the updated review status
    filtered_res = client.get("/findings?review_status=False Positive")
    assert filtered_res.status_code == 200
    assert any(item["id"] == finding_id for item in filtered_res.json()["items"])


def test_update_review_status_invalid(client, seeded_findings):
    list_res = client.get("/findings")
    finding_id = list_res.json()["items"][0]["id"]

    patch_res = client.patch(
        f"/findings/{finding_id}/status",
        json={"review_status": "DefinitelyGuilty"},
    )
    assert patch_res.status_code in [400, 422]


def test_get_finding_by_id(client, seeded_findings):
    list_res = client.get("/findings")
    finding_id = list_res.json()["items"][0]["id"]

    res = client.get(f"/findings/{finding_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == finding_id
    assert "evidence" in data
    assert "candidate" in data
    assert "investigation_history" in data
    assert len(data["investigation_history"]) >= 1


def test_investigation_audit_trail_logging(client, seeded_findings):
    list_res = client.get("/findings")
    finding_id = list_res.json()["items"][0]["id"]

    # Initial finding should have base history entry
    get_res = client.get(f"/findings/{finding_id}")
    initial_history = get_res.json().get("investigation_history", [])
    assert len(initial_history) >= 1

    # Update to Under Review with notes
    patch1 = client.patch(
        f"/findings/{finding_id}/status",
        json={
            "review_status": "Under Review",
            "notes": "Analyst verified suspicious WHOIS creation date",
            "analyst_name": "Senior Investigator Alex",
        },
    )
    assert patch1.status_code == 200
    history1 = patch1.json()["investigation_history"]
    assert len(history1) >= 2
    latest1 = history1[-1]
    assert latest1["new_status"] == "Under Review"
    assert latest1["analyst_name"] == "Senior Investigator Alex"
    assert "WHOIS" in latest1["notes"]

    # Update to Confirmed Impersonation
    patch2 = client.patch(
        f"/findings/{finding_id}/status",
        json={
            "review_status": "Confirmed",
            "notes": "Confirmed malicious phishing clone, preparing takedown dossier",
            "analyst_name": "Senior Investigator Alex",
        },
    )
    assert patch2.status_code == 200
    history2 = patch2.json()["investigation_history"]
    assert len(history2) >= 3
    latest2 = history2[-1]
    assert latest2["new_status"] in ["Confirmed", "Confirmed Impersonation", "Confirmed Suspicious"]
    assert "takedown dossier" in latest2["notes"]


def test_get_unknown_finding_id(client):
    random_id = str(uuid.uuid4())
    res = client.get(f"/findings/{random_id}")
    assert res.status_code == 404
