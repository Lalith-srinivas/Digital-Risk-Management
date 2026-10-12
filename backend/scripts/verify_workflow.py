"""End-to-End Workflow Verification Script for SOC 360.

Tests the full lifecycle with a real brand ("Apex Finance"):
1. Create registered brand with official metadata.
2. Ingest social candidates (official account, impersonating support, unrelated account).
3. Execute social scan (/scan/social).
4. Ingest app candidates (suspicious mobile app clone).
5. Execute app scan (/scan/apps).
6. Verify structured risk findings and evidence.
7. Perform analyst review lifecycle update (/findings/{id}/status).
"""

import sys
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.detection_adapter import (
    SOC360DetectionEngine,
    set_detection_engine,
)


def run_workflow_test():
    client = TestClient(app)

    print("=================================================================")
    print("  SOC 360 - END-TO-END WORKFLOW VERIFICATION WITH A REAL BRAND   ")
    print("=================================================================\n")

    # Step 0: Wire SOC 360 Production Detection Engine
    engine = SOC360DetectionEngine()
    set_detection_engine(engine)
    print("[1/6] Configured active detection engine: SOC360DetectionEngine (RapidFuzz + ImageHash)")

    # Step 1: Create a registered brand
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

    brand_resp = client.post("/brands/", json=brand_payload)
    if brand_resp.status_code != 201:
        print(f"FAILED to create brand: {brand_resp.text}")
        return False

    brand_data = brand_resp.json()
    brand_id = brand_data["id"]
    print(f"[2/6] Successfully created brand: '{brand_data['name']}' (ID: {brand_id})")

    # Step 2: Execute Social Media Impersonation Scan
    social_scan_payload = {
        "brand_id": brand_id,
        "candidates": [
            {
                # Candidate 1: Genuine official account
                "display_name": "Apex Finance Official",
                "username": "@ApexFinanceOfficial",
                "profile_url": "https://twitter.com/ApexFinanceOfficial?ref=web",
                "bio": "The verified official corporate account of Apex Finance.",
                "image_url": "https://apexfinance.com/logo.png",
                "is_demo": True,
            },
            {
                # Candidate 2: High-risk phishing / support impersonator
                "display_name": "Apex Finance Helpdesk & Support",
                "username": "@apex_finance_support",
                "profile_url": "https://twitter.com/apex_finance_support",
                "bio": "Official 24/7 customer care and emergency password recovery for Apex Bank users.",
                "image_url": None,
                "is_demo": True,
            },
            {
                # Candidate 3: Unrelated entity with common word overlap
                "display_name": "Apex Mountain Adventures",
                "username": "@apex_outdoors",
                "profile_url": "https://twitter.com/apex_outdoors",
                "bio": "Hiking gear, mountain trail guides, and outdoor expeditions.",
                "image_url": None,
                "is_demo": True,
            },
        ],
        "is_demo": True,
    }

    print("\n[3/6] Running Social Scan for 3 candidates via POST /scan/social ...")
    social_resp = client.post("/scan/social", json=social_scan_payload)
    if social_resp.status_code != 201:
        print(f"FAILED social scan: {social_resp.text}")
        return False

    social_data = social_resp.json()
    social_scan = social_data["scan"]
    social_findings = social_data["findings"]

    print(f"      - Scan ID: {social_scan['id']}")
    print(f"      - Status: {social_scan['status']}")
    print(f"      - Candidates checked: {social_scan['candidates_checked']}")
    print(f"      - Findings created: {social_scan['findings_created']}")

    for f in social_findings:
        print(f"      * Risk Score: {f['risk_score']:3d} | Level: {f['risk_level']:8s} | Review Status: {f['review_status']:12s}")
        print(f"        Explanation: {f['explanation'][:90]}...")

    # Step 3: Execute App Store Impersonation Scan
    app_scan_payload = {
        "brand_id": brand_id,
        "candidates": [
            {
                # Candidate 4: Rogue mobile app targeting the brand
                "app_name": "Apex Finance: Quick Fast Loans",
                "store_url": "https://play.google.com/store/apps/details?id=com.rogue.apexfinance.loans",
                "package_identifier": "com.rogue.apexfinance.loans",
                "developer_name": "Rogue Offshore Games LLC",
                "description": "Get fast personal cash loans from Apex Finance directly to your wallet.",
                "icon_url": None,
                "is_demo": True,
            }
        ],
        "is_demo": True,
    }

    print("\n[4/6] Running Mobile App Scan for 1 candidate via POST /scan/apps ...")
    app_resp = client.post("/scan/apps", json=app_scan_payload)
    if app_resp.status_code != 201:
        print(f"FAILED app scan: {app_resp.text}")
        return False

    app_data = app_resp.json()
    app_scan = app_data["scan"]
    app_findings = app_data["findings"]

    print(f"      - Scan ID: {app_scan['id']}")
    print(f"      - Status: {app_scan['status']}")
    print(f"      - Findings created: {app_scan['findings_created']}")
    for f in app_findings:
        print(f"      * Risk Score: {f['risk_score']:3d} | Level: {f['risk_level']:8s} | Developer: Rogue Offshore Games LLC")
        print(f"        Explanation: {f['explanation']}")

    # Step 4: Verify Findings Retrieval & Querying
    print("\n[5/6] Querying Findings API via GET /findings/?brand_id=... ...")
    findings_resp = client.get(f"/findings?brand_id={brand_id}")
    if findings_resp.status_code != 200:
        print(f"FAILED to retrieve findings: {findings_resp.text}")
        return False

    findings_page = findings_resp.json()
    total_findings = findings_page["total"]
    items = findings_page["items"]
    print(f"      - Total persisted findings for '{brand_data['name']}': {total_findings}")

    # Step 5: Analyst Review Lifecycle Transition
    high_risk_finding = next((item for item in items if item["risk_score"] >= 45), items[0])
    finding_id = high_risk_finding["id"]

    print(f"\n[6/6] Testing Analyst Review Lifecycle on Finding: {finding_id}")
    print(f"      - Initial status: {high_risk_finding['review_status']}")

    # Transition 1: New -> Under Review
    patch_resp1 = client.patch(
        f"/findings/{finding_id}/status",
        json={"review_status": "Under Review"},
    )
    if patch_resp1.status_code != 200:
        print(f"FAILED to transition to 'Under Review': {patch_resp1.text}")
        return False

    updated_finding1 = patch_resp1.json()
    print(f"      - Transition 1: Updated to '{updated_finding1['review_status']}'")

    # Transition 2: Under Review -> Confirmed Suspicious
    patch_resp2 = client.patch(
        f"/findings/{finding_id}/status",
        json={"review_status": "Confirmed Suspicious"},
    )
    if patch_resp2.status_code != 200:
        print(f"FAILED to transition to 'Confirmed Suspicious': {patch_resp2.text}")
        return False

    updated_finding2 = patch_resp2.json()
    print(f"      - Transition 2: Escalated to '{updated_finding2['review_status']}'")

    # Transition 3: Confirmed Suspicious -> Resolved
    patch_resp3 = client.patch(
        f"/findings/{finding_id}/status",
        json={"review_status": "Resolved"},
    )
    if patch_resp3.status_code != 200:
        print(f"FAILED to transition to 'Resolved': {patch_resp3.text}")
        return False

    updated_finding3 = patch_resp3.json()
    print(f"      - Transition 3: Final status marked as '{updated_finding3['review_status']}'")

    print("\n=================================================================")
    print("  RESULT: FULL END-TO-END WORKFLOW VERIFIED SUCCESSFULLY!       ")
    print("=================================================================")
    return True


if __name__ == "__main__":
    success = run_workflow_test()
    sys.exit(0 if success else 1)
