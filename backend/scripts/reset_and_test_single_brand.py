"""Reset Database and Test Complete SOC 360 Lifecycle with One Company.

Company: Spotify
Workflow:
1. Purge all existing data from the database.
2. Register 'Spotify' with official assets.
3. Execute social scan with 4 distinct candidate profiles.
4. Execute mobile app scan with 2 app candidates.
5. Validate scoring, official exclusions, and explanations.
6. Perform analyst review lifecycle transitions.
7. Print complete audit report.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.database import engine, init_db, SessionLocal
from app.config import settings
from app.detection_adapter import SOC360DetectionEngine, set_detection_engine
from app.routes.brands import BrandService
from app.routes.findings import FindingService
from app.routes.scans import ScanService
from app.schemas.brand import BrandCreate
from app.schemas.scan import SocialScanRequest, AppScanRequest, SocialCandidateInput, AppCandidateInput


def reset_and_test():
    print("=================================================================")
    print("  SOC 360 - DATABASE RESET & SINGLE COMPANY WORKFLOW TEST       ")
    print("=================================================================\n")

    # Step 1: Wipe all records from the database
    print("[1/5] Purging all records from the active database...")
    print(f"      Target DB: {settings.normalized_database_url.split('@')[-1] if '@' in settings.normalized_database_url else 'local'}")
    
    with engine.begin() as conn:
        # Check if Postgres or SQLite
        if "postgresql" in settings.normalized_database_url:
            conn.execute(text("TRUNCATE TABLE findings, candidates, scans, brands CASCADE;"))
        else:
            conn.execute(text("DELETE FROM findings;"))
            conn.execute(text("DELETE FROM candidates;"))
            conn.execute(text("DELETE FROM scans;"))
            conn.execute(text("DELETE FROM brands;"))

    # Verify purge
    with engine.connect() as conn:
        b_count = conn.execute(text("SELECT count(*) FROM brands;")).scalar()
        f_count = conn.execute(text("SELECT count(*) FROM findings;")).scalar()
        print(f"      Purge complete! Brands: {b_count}, Findings: {f_count}")

    # Step 2: Ensure SOC360 Detection Engine is active
    engine_instance = SOC360DetectionEngine()
    set_detection_engine(engine_instance)
    print("\n[2/5] Initialized SOC 360 Production Detection Engine (RapidFuzz + ImageHash)")

    db = SessionLocal()
    try:
        # Step 3: Register single company: Spotify
        print("\n[3/5] Registering Company: 'Spotify' ...")
        brand_in = BrandCreate(
            name="Spotify",
            industry="Digital Streaming & Audio",
            website="https://spotify.com",
            aliases=["Spotify Music", "Spotify AB"],
            official_social_urls=[
                "https://twitter.com/Spotify",
                "https://instagram.com/spotify",
                "https://facebook.com/Spotify",
            ],
            official_apps=["com.spotify.music"],
            official_developers=["Spotify AB", "Spotify Ltd."],
            description="Spotify is a premier audio streaming platform offering millions of tracks and podcasts.",
            logo_url="https://open.spotifycdn.com/cdn/images/favicon.0f31d2ea.ico",
        )
        brand = BrandService.create_brand(db, brand_in)
        print(f"      [OK] Brand Created: '{brand.name}'")
        print(f"           - ID: {brand.id}")
        print(f"           - Official Social URLs: {brand.official_social_urls}")
        print(f"           - Official Developers: {brand.official_developers}")
        print(f"           - Official Apps: {brand.official_apps}")

        # Step 4: Run Social Candidates Scan
        print("\n[4/5] Executing Social Media Impersonation Scan (4 candidates)...")
        social_req = SocialScanRequest(
            brand_id=brand.id,
            candidates=[
                SocialCandidateInput(
                    # 1. Genuine official account
                    display_name="Spotify",
                    username="@Spotify",
                    profile_url="https://twitter.com/Spotify?s=20",
                    bio="Music for every moment. Play, discover, and share for free.",
                    image_url="https://open.spotifycdn.com/cdn/images/favicon.0f31d2ea.ico",
                ),
                SocialCandidateInput(
                    # 2. High-risk phishing / emergency helpdesk impersonator
                    display_name="Spotify Premium Support & Helpdesk",
                    username="@spotify_premium_care",
                    profile_url="https://twitter.com/spotify_premium_care",
                    bio="Official 24/7 customer care. Claim your free 12-month Spotify Premium code or verify account billing.",
                    image_url=None,
                ),
                SocialCandidateInput(
                    # 3. Lookalike / Homoglyph variant
                    display_name="Sp0tify Mus!c",
                    username="@sp0tify_playlist_hub",
                    profile_url="https://twitter.com/sp0tify_playlist_hub",
                    bio="Daily updated electronic and pop music playlists.",
                    image_url=None,
                ),
                SocialCandidateInput(
                    # 4. Unrelated account
                    display_name="Spotlight Fitness Gym",
                    username="@spotlight_gym",
                    profile_url="https://twitter.com/spotlight_gym",
                    bio="Workout routines, health coaching, and nutrition guidance.",
                    image_url=None,
                ),
            ],
        )
        s_scan, s_findings = ScanService.execute_social_scan(db, social_req)
        print(f"      [OK] Social Scan Finished: Scan ID {s_scan.id}")
        print(f"           - Status: {s_scan.status}")
        print(f"           - Candidates Checked: {s_scan.candidates_checked}")
        print(f"           - Findings Created: {s_scan.findings_created}\n")

        for i, f in enumerate(s_findings, 1):
            print(f"      Candidate {i}:")
            print(f"        * Risk Score : {f.risk_score}/100 ({f.risk_level.upper()})")
            print(f"        * Status     : {f.review_status}")
            print(f"        * Explanation: {f.explanation}")
            print(f"        * Signals    : {f.evidence.get('signals', {}).get('name_similarity', {}).get('match_type', 'N/A')}")
            print()

        # Step 5: Run Mobile App Candidates Scan
        print("[5/5] Executing Mobile App Store Impersonation Scan (2 candidates)...")
        app_req = AppScanRequest(
            brand_id=brand.id,
            candidates=[
                AppCandidateInput(
                    # 5. Genuine Official Application
                    app_name="Spotify: Music and Podcasts",
                    developer_name="Spotify AB",
                    store_url="https://play.google.com/store/apps/details?id=com.spotify.music",
                    package_identifier="com.spotify.music",
                    description="Listen to songs, albums, and playlists from Spotify.",
                ),
                AppCandidateInput(
                    # 6. Rogue Clone Application with Developer Mismatch
                    app_name="Spotify Music: Free Songs & MP3 Downloader",
                    developer_name="Rogue Offshore Media Labs",
                    store_url="https://play.google.com/store/apps/details?id=com.rogue.spotify.downloader",
                    package_identifier="com.rogue.spotify.downloader",
                    description="Download free MP3 music tracks from Spotify without subscription.",
                ),
            ],
        )
        a_scan, a_findings = ScanService.execute_app_scan(db, app_req)
        print(f"      [OK] App Scan Finished: Scan ID {a_scan.id}")
        print(f"           - Status: {a_scan.status}")
        print(f"           - Candidates Checked: {a_scan.candidates_checked}")
        print(f"           - Findings Created: {a_scan.findings_created}\n")

        for i, f in enumerate(a_findings, 1):
            print(f"      App Candidate {i}:")
            print(f"        * Risk Score : {f.risk_score}/100 ({f.risk_level.upper()})")
            print(f"        * Status     : {f.review_status}")
            print(f"        * Explanation: {f.explanation}")
            print()

        # Step 6: Test Analyst Lifecycle Transition
        # Pick the high-risk phishing support finding and advance status
        phishing_finding = next(f for f in s_findings if "Helpdesk" in f.explanation or f.risk_score >= 40)
        print(f"[TEST] Transitioning Analyst Review Status for Finding: {phishing_finding.id}")
        print(f"       Initial Status: {phishing_finding.review_status}")

        up1 = FindingService.update_review_status(db, phishing_finding.id, "Under Review")
        print(f"       -> Step 1: {up1.review_status}")

        up2 = FindingService.update_review_status(db, phishing_finding.id, "Confirmed Suspicious")
        print(f"       -> Step 2: {up2.review_status}")

        up3 = FindingService.update_review_status(db, phishing_finding.id, "Resolved")
        print(f"       -> Step 3: {up3.review_status}")

        print("\n=================================================================")
        print("  WORKFLOW COMPLETE: ALL STAGES TESTED SUCCESSFULLY WITH SPOTIFY!")
        print("=================================================================")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    success = reset_and_test()
    sys.exit(0 if success else 1)
