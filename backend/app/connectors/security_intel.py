import os
import re
import httpx
from typing import List, Dict, Any, Optional
from app.connectors.base import BaseConnector, ConnectorResult
from app.schemas.candidate import SocialCandidateInput


class VirusTotalConnector(BaseConnector):
    name: str = "virustotal"
    source_type: str = "threat_intel"

    def __init__(self):
        self.api_key = os.getenv("VIRUSTOTAL_API_KEY") or ""

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "name": "VirusTotal Threat Intelligence",
            "source_type": "threat_intel",
            "status": "active" if configured else "unconfigured",
            "is_configured": configured,
            "description": "Multi-engine malware, phishing verification, and domain reputation analysis across 70+ security vendors",
            "required_keys": ["VIRUSTOTAL_API_KEY"],
            "message": "Configured and active" if configured else "VirusTotal API key not configured.",
        }

    def check_domain(self, domain: str) -> Optional[Dict[str, Any]]:
        """Query VirusTotal v3 domain report."""
        if not self.is_configured():
            return None

        clean_domain = domain.strip().lower()
        # Remove protocol if present
        clean_domain = re.sub(r"^https?://", "", clean_domain).split("/")[0].split(":")[0]
        if not clean_domain or "." not in clean_domain:
            return None

        url = f"https://www.virustotal.com/api/v3/domains/{clean_domain}"
        headers = {"x-apikey": self.api_key}

        try:
            with httpx.Client(timeout=6.0) as client:
                resp = client.get(url, headers=headers)
                if resp.status_code != 200:
                    return None

                data = resp.json().get("data", {})
                attrs = data.get("attributes", {})
                stats = attrs.get("last_analysis_stats", {})
                malicious = stats.get("malicious", 0)
                suspicious = stats.get("suspicious", 0)

                return {
                    "domain": clean_domain,
                    "malicious_count": malicious,
                    "suspicious_count": suspicious,
                    "harmless_count": stats.get("harmless", 0),
                    "reputation": attrs.get("reputation", 0),
                    "categories": attrs.get("categories", {}),
                    "is_flagged": (malicious > 0 or suspicious > 0),
                    "whois": (attrs.get("whois") or "")[:500],
                }
        except Exception:
            return None

    def search(
        self,
        query: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 5,
    ) -> ConnectorResult:
        if not self.is_configured():
            return ConnectorResult(
                connector_name="VirusTotal",
                source_type="threat_intel",
                status="unconfigured",
                message="VirusTotal unconfigured. Set VIRUSTOTAL_API_KEY to enable reputation intelligence.",
                candidates=[],
                total_found=0,
                is_live=False,
            )

        # Check official website and look-alike candidate domains
        targets = []
        clean_query = query.strip().lower()
        if "." in clean_query:
            targets.append(clean_query)
        else:
            # Probe common suspicious typosquat patterns
            slug = re.sub(r"[^a-z0-9]", "", clean_query)
            if slug:
                targets.extend([
                    f"{slug}-security.com",
                    f"{slug}-login.com",
                    f"{slug}-support.com",
                    f"{slug}app.org",
                ][:min(limit, 3)])

        flagged_candidates: List[SocialCandidateInput] = []
        for dom in targets:
            intel = self.check_domain(dom)
            if intel and intel.get("is_flagged"):
                mal_count = intel["malicious_count"]
                susp_count = intel["suspicious_count"]
                cand = SocialCandidateInput(
                    display_name=f"{dom} [Threat Intel Alert]",
                    username=f"@{dom}",
                    profile_url=f"https://{dom}",
                    platform="Web / Phishing Domain",
                    bio=f"Flagged by VirusTotal: {mal_count} security engines marked malicious, {susp_count} suspicious. Reputation: {intel.get('reputation')}",
                    is_demo=False,
                )
                flagged_candidates.append(cand)

        return ConnectorResult(
            connector_name="VirusTotal",
            source_type="threat_intel",
            status="active",
            message=f"Scanned {len(targets)} targets. Identified {len(flagged_candidates)} flagged domains.",
            candidates=flagged_candidates,
            total_found=len(flagged_candidates),
            is_live=True,
        )


class URLScanConnector(BaseConnector):
    name: str = "urlscan"
    source_type: str = "threat_intel"

    def __init__(self):
        self.api_key = os.getenv("URLSCAN_API_KEY") or ""

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "name": "urlscan.io Phishing Surveillance",
            "source_type": "threat_intel",
            "status": "active" if configured else "unconfigured",
            "is_configured": configured,
            "description": "Automated phishing website scans, screenshots, DOM detection, and brand impersonation portals",
            "required_keys": ["URLSCAN_API_KEY"],
            "message": "Configured and active" if configured else "urlscan.io API key not configured.",
        }

    def search(
        self,
        query: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 5,
    ) -> ConnectorResult:
        if not self.is_configured():
            return ConnectorResult(
                connector_name="urlscan.io",
                source_type="threat_intel",
                status="unconfigured",
                message="urlscan.io unconfigured. Set URLSCAN_API_KEY for live phishing scans.",
                candidates=[],
                total_found=0,
                is_live=False,
            )

        clean_query = query.strip()
        slug = re.sub(r"[^a-zA-Z0-9]", "", clean_query)
        if not slug:
            return ConnectorResult(
                connector_name="urlscan.io",
                source_type="threat_intel",
                status="active",
                message="Query was empty",
                candidates=[],
                total_found=0,
            )

        url = "https://urlscan.io/api/v1/search/"
        headers = {"API-Key": self.api_key}
        params = {
            "q": f'page.domain:*{slug}* OR page.title:"{clean_query}"',
            "size": min(limit, 8),
        }

        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(url, headers=headers, params=params)
                if resp.status_code != 200:
                    return ConnectorResult(
                        connector_name="urlscan.io",
                        source_type="threat_intel",
                        status="error",
                        message=f"urlscan.io API returned HTTP {resp.status_code}",
                        candidates=[],
                        total_found=0,
                    )

                data = resp.json()
                results = data.get("results", [])
                candidates: List[SocialCandidateInput] = []

                # Official website to exclude
                official_website = ""
                if brand_info and brand_info.get("website"):
                    official_website = brand_info["website"].lower()

                for item in results:
                    page = item.get("page", {})
                    task = item.get("task", {})
                    target_url = page.get("url") or task.get("url") or ""
                    domain = page.get("domain") or task.get("domain") or ""
                    title = page.get("title") or domain or "Suspicious Domain Scan"
                    screenshot = item.get("screenshot")
                    ip = page.get("ip") or "Unknown IP"
                    country = page.get("country") or "Global"

                    if not target_url or not domain:
                        continue

                    # Skip exact official domain
                    if official_website and (domain in official_website or official_website in domain):
                        continue

                    cand = SocialCandidateInput(
                        display_name=title[:80],
                        username=f"@{domain}",
                        profile_url=target_url,
                        platform="Web / Phishing Domain",
                        bio=f"Live scanned website hosting on {ip} ({country}). Documented in urlscan.io threat database.",
                        image_url=screenshot,
                        is_demo=False,
                    )
                    candidates.append(cand)

                return ConnectorResult(
                    connector_name="urlscan.io",
                    source_type="threat_intel",
                    status="active",
                    message=f"Discovered {len(candidates)} live domain scans targeting '{clean_query}'",
                    candidates=candidates,
                    total_found=len(candidates),
                    is_live=True,
                )

        except Exception as ex:
            return ConnectorResult(
                connector_name="urlscan.io",
                source_type="threat_intel",
                status="error",
                message=f"urlscan.io search error: {str(ex)}",
                candidates=[],
                total_found=0,
                is_live=True,
            )
