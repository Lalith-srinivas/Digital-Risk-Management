import re
import socket
import urllib.parse
from typing import Optional, List, Dict, Any


class BrandValidator:
    """
    Validates entered brand identity against registered domains, authoritative DNS,
    and official profiles to prevent treating arbitrary strings as verified brands.
    """

    @staticmethod
    def extract_domain(url_or_domain: str) -> Optional[str]:
        if not url_or_domain or not url_or_domain.strip():
            return None
        text = url_or_domain.strip()
        if not text.startswith("http://") and not text.startswith("https://"):
            text = "https://" + text
        try:
            parsed = urllib.parse.urlsplit(text)
            host = parsed.netloc.lower()
            if ":" in host:
                host = host.split(":")[0]
            if host.startswith("www."):
                host = host[4:]
            return host or None
        except Exception:
            return None

    @staticmethod
    def resolve_domain(domain: str) -> bool:
        """Verify whether domain resolves via DNS."""
        if not domain or "." not in domain:
            return False
        try:
            socket.gethostbyname(domain)
            return True
        except (socket.gaierror, socket.herror, OSError):
            return False

    @classmethod
    def validate_brand(
        cls,
        name: str,
        website: Optional[str] = None,
        official_social_urls: Optional[List[str]] = None,
        official_apps: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        clean_name = name.strip()
        slug = re.sub(r"[^a-zA-Z0-9]", "", clean_name.lower())

        # 1. Official website provided
        if website and website.strip():
            domain = cls.extract_domain(website)
            if domain and cls.resolve_domain(domain):
                return {
                    "status": "verified",
                    "verified": True,
                    "domain": domain,
                    "confidence": "high",
                    "summary": f"Brand identity verified via active official domain '{domain}'.",
                    "explanation": "Authoritative DNS resolution succeeded for registered website.",
                }
            elif domain:
                return {
                    "status": "unverified",
                    "verified": False,
                    "domain": domain,
                    "confidence": "low",
                    "summary": f"Official domain '{domain}' could not be resolved via DNS.",
                    "explanation": "Provided corporate website did not return a valid DNS record.",
                }

        # 2. Registered official social profiles or apps provided
        has_official_social = bool(official_social_urls and len(official_social_urls) > 0)
        has_official_apps = bool(official_apps and len(official_apps) > 0)
        if has_official_social or has_official_apps:
            return {
                "status": "verified",
                "verified": True,
                "domain": None,
                "confidence": "moderate",
                "summary": "Brand verified through registered official profile credentials.",
                "explanation": "User provided authenticated official profile or app identifiers.",
            }

        # 3. Check for obvious short or arbitrary input (e.g., 'spo', 'abc', 'test')
        if len(clean_name) <= 3:
            return {
                "status": "unverified",
                "verified": False,
                "domain": None,
                "confidence": "none",
                "summary": f"Short or ambiguous term '{clean_name}'. Brand verification unavailable.",
                "explanation": "Entered string is too short to establish brand authenticity without a registered website.",
            }

        # 4. Attempt standard .com lookup for established brands entered by name only
        if len(slug) >= 4:
            candidate_domain = f"{slug}.com"
            if cls.resolve_domain(candidate_domain):
                return {
                    "status": "probable",
                    "verified": True,
                    "domain": candidate_domain,
                    "confidence": "moderate",
                    "summary": f"Brand matches active web domain '{candidate_domain}'.",
                    "explanation": "Primary web domain resolved. Add official website URL to confirm high-confidence verification.",
                }

        # 5. Fallback unverified
        return {
            "status": "unverified",
            "verified": False,
            "domain": None,
            "confidence": "low",
            "summary": "Brand verification was unavailable or insufficient.",
            "explanation": "No official domain or registry could verify this identity. Results reflect candidate matching only.",
        }
