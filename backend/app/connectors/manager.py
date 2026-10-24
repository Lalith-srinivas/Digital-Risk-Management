import re
from typing import List, Dict, Any, Tuple, Optional
from app.config import settings
from app.connectors.base import BaseConnector, ConnectorResult
from app.connectors.app_store import AppleAppStoreConnector, GooglePlayStoreConnector
from app.connectors.social import GitHubConnector, TwitterConnector, TelegramConnector, WebSearchConnector
from app.connectors.security_intel import VirusTotalConnector, URLScanConnector
from app.schemas.candidate import SocialCandidateInput, AppCandidateInput


def sanitize_slug(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]", "", name.lower())
    return slug or "brand"


class ConnectorManager:
    """Orchestrates multi-source candidate discovery across app store, social, and security threat intel connectors."""

    def __init__(self):
        self.app_connectors: List[BaseConnector] = [
            AppleAppStoreConnector(),
            GooglePlayStoreConnector(),
        ]
        self.social_connectors: List[BaseConnector] = [
            GitHubConnector(),
            TwitterConnector(),
            TelegramConnector(),
            WebSearchConnector(),
        ]
        self.threat_intel_connectors: List[BaseConnector] = [
            VirusTotalConnector(),
            URLScanConnector(),
        ]

    def get_sources_status(self) -> Dict[str, Any]:
        """Return the configuration and readiness status of all external surveillance connectors."""
        app_statuses = [c.get_status() for c in self.app_connectors]
        social_statuses = [c.get_status() for c in self.social_connectors]
        intel_statuses = [c.get_status() for c in self.threat_intel_connectors]

        active_apps = [s for s in app_statuses if s.get("status") == "active"]
        active_social = [s for s in social_statuses if s.get("status") == "active"]
        active_intel = [s for s in intel_statuses if s.get("status") == "active"]

        return {
            "app_sources": app_statuses,
            "social_sources": social_statuses,
            "threat_intel_sources": intel_statuses,
            "active_app_connectors": len(active_apps),
            "total_app_connectors": len(app_statuses),
            "active_social_connectors": len(active_social),
            "total_social_connectors": len(social_statuses),
            "active_intel_connectors": len(active_intel),
            "total_intel_connectors": len(intel_statuses),
            "live_app_scanning_ready": len(active_apps) > 0,
            "live_social_scanning_ready": len(active_social) > 0,
            "live_threat_intel_ready": len(active_intel) > 0,
        }

    def discover_live_app_candidates(
        self,
        brand_name: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 10,
    ) -> Tuple[List[AppCandidateInput], Dict[str, Any]]:
        """Run configured app connectors and deduplicate results. Never fabricates candidates."""
        candidates: List[AppCandidateInput] = []
        source_details: Dict[str, Any] = {}
        seen_packages = set()
        seen_urls = set()

        for conn in self.app_connectors:
            res: ConnectorResult = conn.search(brand_name, brand_info, limit=limit)
            source_details[conn.name] = res.to_dict()

            for cand in res.candidates:
                pkg = (cand.package_identifier or "").lower().strip()
                url = (cand.store_url or "").lower().strip()

                if pkg and pkg in seen_packages:
                    continue
                if url and url in seen_urls:
                    continue

                if pkg:
                    seen_packages.add(pkg)
                if url:
                    seen_urls.add(url)

                candidates.append(cand)

        return candidates, source_details

    def discover_live_social_candidates(
        self,
        brand_name: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 10,
    ) -> Tuple[List[SocialCandidateInput], Dict[str, Any]]:
        """Run configured social and threat intel connectors and deduplicate results."""
        candidates: List[SocialCandidateInput] = []
        source_details: Dict[str, Any] = {}
        seen_usernames = set()
        seen_urls = set()

        all_connectors = self.social_connectors + self.threat_intel_connectors

        for conn in all_connectors:
            res: ConnectorResult = conn.search(brand_name, brand_info, limit=limit)
            source_details[conn.name] = res.to_dict()

            for cand in res.candidates:
                user = (cand.username or "").lower().strip().lstrip("@")
                url = (cand.profile_url or "").lower().strip()

                if user and user in seen_usernames:
                    continue
                if url and url in seen_urls:
                    continue

                if user:
                    seen_usernames.add(user)
                if url:
                    seen_urls.add(url)

                candidates.append(cand)

        return candidates, source_details

    def generate_demo_social_candidates(
        self,
        brand_name: str,
        brand_info: Optional[Dict[str, Any]] = None,
    ) -> List[SocialCandidateInput]:
        """
        Explicitly labelled demo candidates for simulation / offline demonstration mode.
        Every returned candidate has is_demo=True explicitly set.
        """
        slug = sanitize_slug(brand_name)
        info = brand_info or {}
        official_urls = info.get("official_social_urls", [])

        candidates: List[SocialCandidateInput] = [
            SocialCandidateInput(
                display_name=f"{brand_name} Support & Helpdesk",
                username=f"@{slug}_support_desk",
                profile_url=f"https://x.com/{slug}_support_desk",
                platform="Twitter/X",
                bio=f"Official verified support and recovery service for {brand_name}. DM us for urgent account assistance.",
                image_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&auto=format&fit=crop&q=80",
                is_demo=True,
            ),
            SocialCandidateInput(
                display_name=f"{brand_name} Bonus & Community Rewards",
                username=f"@{slug}_rewards_bot",
                profile_url=f"https://t.me/{slug}_rewards_bot",
                platform="Telegram",
                bio=f"Claim your exclusive {brand_name} verification reward and membership tokens now. Limited registration.",
                image_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&auto=format&fit=crop&q=80",
                is_demo=True,
            ),
            SocialCandidateInput(
                display_name=f"{brand_name} Global Fans",
                username=f"@{slug}_fans",
                profile_url=f"https://x.com/{slug}_fans",
                platform="Twitter/X",
                bio=f"Independent fan community and discussion club for {brand_name}. Unofficial & community run.",
                image_url="https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=96&auto=format&fit=crop&q=80",
                is_demo=True,
            ),
        ]

        # Add official baseline account if URL provided or default
        off_url = official_urls[0] if (official_urls and len(official_urls) > 0) else f"https://x.com/{slug}"
        candidates.append(
            SocialCandidateInput(
                display_name=brand_name,
                username=f"@{slug}",
                profile_url=off_url,
                platform="Twitter/X",
                bio=f"The verified official account of {brand_name}.",
                image_url=info.get("logo_url") or "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=96",
                is_demo=True,
            )
        )

        return candidates

    def generate_demo_app_candidates(
        self,
        brand_name: str,
        brand_info: Optional[Dict[str, Any]] = None,
    ) -> List[AppCandidateInput]:
        """
        Explicitly labelled demo mobile applications for simulation / offline demonstration mode.
        Every returned candidate has is_demo=True explicitly set.
        """
        slug = sanitize_slug(brand_name)
        info = brand_info or {}
        official_devs = info.get("official_developers", [])
        official_apps = info.get("official_apps", [])

        candidates: List[AppCandidateInput] = [
            AppCandidateInput(
                app_name=f"{brand_name} Mobile Pro (Unlocked)",
                package_identifier=f"com.unauthorized.{slug}.mod",
                developer_name=f"{brand_name} Global Direct",
                store_url=f"https://apk-mirrors.net/download/{slug}-pro-v2",
                store_type="APK Mirror / Third-party",
                description=f"Full premium edition of {brand_name} with unlocked capabilities and direct credentials gateway.",
                icon_url="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96&auto=format&fit=crop&q=80",
                is_demo=True,
            ),
            AppCandidateInput(
                app_name=f"{brand_name} Companion & Community",
                package_identifier=f"org.community.{slug}.fans",
                developer_name="Community Enthusiasts Club",
                store_url=f"https://play.google.com/store/apps/details?id=org.community.{slug}.fans",
                store_type="Google Play Store",
                description=f"Fan community discussion application for {brand_name} users. Unofficial enthusiast app.",
                icon_url="https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=96&auto=format&fit=crop&q=80",
                is_demo=True,
            ),
        ]

        # Add official app
        off_dev = official_devs[0] if (official_devs and len(official_devs) > 0) else f"{brand_name} Inc."
        off_pkg = official_apps[0] if (official_apps and len(official_apps) > 0) else f"com.{slug}.official"
        candidates.append(
            AppCandidateInput(
                app_name=brand_name,
                package_identifier=off_pkg,
                developer_name=off_dev,
                store_url=f"https://play.google.com/store/apps/details?id={off_pkg}",
                store_type="Google Play Store",
                description=f"The verified official mobile application from {brand_name}.",
                icon_url=info.get("logo_url") or "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=96",
                is_demo=True,
            )
        )

        return candidates


_manager = ConnectorManager()


def get_connector_manager() -> ConnectorManager:
    return _manager
