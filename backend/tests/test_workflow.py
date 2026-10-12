"""End-to-End full workflow test with a registered brand."""

from app.detection_adapter import SOC360DetectionEngine, set_detection_engine


def test_complete_brand_detection_and_review_workflow(client):
    """
    Test the full SOC 360 workflow with a real brand name ('Apex Finance'):
    1. Register brand
    2. Ingest social candidates & run scan
    3. Ingest app candidates & run scan
    4. Query findings
    5. Update analyst review status
    """
    # 0. Set active engine to SOC360DetectionEngine
    engine = SOC360DetectionEngine()
    set_detection_engine(engine)

    # 1. Create brand
    brand_payload = {
        "name": "Apex Finance",
        "industry": "Financial Services",
        "website": "https://apexfinance.com",
        "aliases": ["ApexFin", "Apex Bank"],
        "official_social_urls": [
            "https://twitter.com/ApexFinanceOfficial",
            "https://instagram.com/ApexFinanceOfficial",
        ],
        "official_apps": ["com.apexfinance.mobile"],
        "official_developers": ["Apex Finance Global Ltd."],
        "description": "Apex Finance is a premier wealth management and digital banking institution.",
        "logo_url": "https://apexfinance.com/logo.png",
    }
    b_resp = client.post("/brands/", json=brand_payload)
    assert b_resp.status_code == 201
    brand = b_resp.json()
    brand_id = brand["id"]

    # 2. Social scan with 3 candidate profiles
    social_payload = {
        "brand_id": brand_id,
        "candidates": [
            {
                # Official verified account
                "display_name": "Apex Finance Official",
                "username": "@ApexFinanceOfficial",
                "profile_url": "https://twitter.com/ApexFinanceOfficial?ref=web",
                "bio": "Official corporate account of Apex Finance.",
                "image_url": "https://apexfinance.com/logo.png",
            },
            {
                # Phishing support impersonator
                "display_name": "Apex Finance Helpdesk & Support",
                "username": "@apex_finance_support",
                "profile_url": "https://twitter.com/apex_finance_support",
                "bio": "Official 24/7 customer care and password reset for Apex Bank users.",
            },
            {
                # Unrelated profile
                "display_name": "Apex Mountain Outdoors",
                "username": "@apex_outdoors",
                "profile_url": "https://twitter.com/apex_outdoors",
                "bio": "Mountain hiking guides and gear.",
            },
        ],
    }
    s_resp = client.post("/scan/social", json=social_payload)
    assert s_resp.status_code == 201
    s_data = s_resp.json()
    assert s_data["scan"]["candidates_checked"] == 3
    assert s_data["scan"]["findings_created"] == 3

    # Check official profile scored 0
    findings = s_data["findings"]
    official_f = next(f for f in findings if f["risk_score"] == 0)
    assert official_f["risk_level"] == "low"
    assert "excluded from risk alerts" in official_f["explanation"].lower()

    # Check impersonator profile scored elevated
    impersonator_f = next(f for f in findings if f["risk_score"] >= 40)
    assert "support" in impersonator_f["explanation"].lower() or "helpdesk" in impersonator_f["explanation"].lower()

    # 3. App scan
    app_payload = {
        "brand_id": brand_id,
        "candidates": [
            {
                "app_name": "Apex Finance: Fast Loan Wallet",
                "store_url": "https://play.google.com/store/apps/details?id=com.fake.apexfinance",
                "package_identifier": "com.fake.apexfinance",
                "developer_name": "Rogue Developer Team",
                "description": "Instant loans from Apex Finance directly to wallet.",
            }
        ],
    }
    a_resp = client.post("/scan/apps", json=app_payload)
    assert a_resp.status_code == 201
    a_data = a_resp.json()
    assert a_data["scan"]["findings_created"] == 1
    app_finding = a_data["findings"][0]
    assert app_finding["risk_score"] >= 40

    # 4. Query findings
    f_resp = client.get(f"/findings?brand_id={brand_id}")
    assert f_resp.status_code == 200
    all_findings = f_resp.json()
    assert all_findings["total"] == 4

    # 5. Analyst review lifecycle
    finding_id = impersonator_f["id"]
    patch_resp = client.patch(
        f"/findings/{finding_id}/status",
        json={"review_status": "Confirmed Suspicious"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["review_status"] == "Confirmed Suspicious"
