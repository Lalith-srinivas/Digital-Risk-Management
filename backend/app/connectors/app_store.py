import os
import httpx
from typing import List, Dict, Any, Optional
from app.connectors.base import BaseConnector, ConnectorResult
from app.schemas.candidate import AppCandidateInput


class AppleAppStoreConnector(BaseConnector):
    name: str = "apple_app_store"
    source_type: str = "app"

    def is_configured(self) -> bool:
        # Apple iTunes Search API is a free, public endpoint requiring no API key
        return True

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": "Apple App Store",
            "source_type": "app",
            "status": "active",
            "is_configured": True,
            "description": "Public Apple iTunes Search API for iOS / macOS apps",
            "required_keys": [],
        }

    def search(
        self,
        query: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 10,
    ) -> ConnectorResult:
        clean_query = query.strip()
        if not clean_query:
            return ConnectorResult(
                connector_name="Apple App Store",
                source_type="app",
                status="active",
                message="Query was empty",
                candidates=[],
                total_found=0,
            )

        url = "https://itunes.apple.com/search"
        params = {
            "term": clean_query,
            "entity": "software",
            "limit": min(limit, 25),
        }

        try:
            with httpx.Client(timeout=6.0) as client:
                resp = client.get(url, params=params)
                if resp.status_code != 200:
                    return ConnectorResult(
                        connector_name="Apple App Store",
                        source_type="app",
                        status="error",
                        message=f"iTunes API returned HTTP {resp.status_code}",
                        candidates=[],
                        total_found=0,
                    )

                data = resp.json()
                results = data.get("results", [])
                candidates: List[AppCandidateInput] = []

                for item in results:
                    track_name = item.get("trackName")
                    if not track_name:
                        continue
                    cand = AppCandidateInput(
                        app_name=track_name,
                        package_identifier=item.get("bundleId") or f"id{item.get('trackId', '')}",
                        developer_name=item.get("artistName"),
                        store_url=item.get("trackViewUrl"),
                        store_type="Apple App Store",
                        description=(item.get("description") or "")[:500],
                        icon_url=item.get("artworkUrl100") or item.get("artworkUrl60"),
                        is_demo=False,
                    )
                    candidates.append(cand)

                return ConnectorResult(
                    connector_name="Apple App Store",
                    source_type="app",
                    status="active",
                    message=f"Retrieved {len(candidates)} live applications from Apple App Store",
                    candidates=candidates,
                    total_found=len(candidates),
                    is_live=True,
                )

        except (httpx.TimeoutException, httpx.RequestError) as ex:
            return ConnectorResult(
                connector_name="Apple App Store",
                source_type="app",
                status="error",
                message=f"Network error querying Apple App Store: {str(ex)}",
                candidates=[],
                total_found=0,
                is_live=True,
            )
        except Exception as ex:
            return ConnectorResult(
                connector_name="Apple App Store",
                source_type="app",
                status="error",
                message=f"Failed parsing Apple App Store response: {str(ex)}",
                candidates=[],
                total_found=0,
                is_live=True,
            )


class GooglePlayStoreConnector(BaseConnector):
    name: str = "google_play_store"
    source_type: str = "app"

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_PLAY_API_KEY") or os.getenv("SERPAPI_API_KEY") or ""

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "name": "Google Play Store",
            "source_type": "app",
            "status": "active" if configured else "unconfigured",
            "is_configured": configured,
            "description": "Google Play Store discovery via SerpAPI / Play API",
            "required_keys": ["SERPAPI_API_KEY or GOOGLE_PLAY_API_KEY"],
            "message": "Configured and active" if configured else "Credentials not configured in environment.",
        }

    def search(
        self,
        query: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 10,
    ) -> ConnectorResult:
        if not self.is_configured():
            return ConnectorResult(
                connector_name="Google Play Store",
                source_type="app",
                status="unconfigured",
                message="Google Play connector unconfigured. Provide GOOGLE_PLAY_API_KEY or SERPAPI_API_KEY.",
                candidates=[],
                total_found=0,
                is_live=False,
            )

        # When API key is provided, execute SerpAPI Google Play search
        url = "https://serpapi.com/search.json"
        params = {
            "engine": "google_play",
            "q": query.strip(),
            "api_key": self.api_key,
            "num": min(limit, 20),
        }

        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(url, params=params)
                if resp.status_code != 200:
                    return ConnectorResult(
                        connector_name="Google Play Store",
                        source_type="app",
                        status="error",
                        message=f"SerpAPI returned HTTP {resp.status_code}",
                        candidates=[],
                        total_found=0,
                    )

                data = resp.json()
                items = data.get("organic_results", [])
                candidates: List[AppCandidateInput] = []

                for item in items:
                    title = item.get("title")
                    if not title:
                        continue
                    candidates.append(
                        AppCandidateInput(
                            app_name=title,
                            package_identifier=item.get("product_id") or item.get("package_name") or "",
                            developer_name=item.get("developer"),
                            store_url=item.get("link"),
                            store_type="Google Play Store",
                            description=(item.get("description") or "")[:500],
                            icon_url=item.get("thumbnail"),
                            is_demo=False,
                        )
                    )

                return ConnectorResult(
                    connector_name="Google Play Store",
                    source_type="app",
                    status="active",
                    message=f"Retrieved {len(candidates)} live applications from Google Play",
                    candidates=candidates,
                    total_found=len(candidates),
                    is_live=True,
                )

        except Exception as ex:
            return ConnectorResult(
                connector_name="Google Play Store",
                source_type="app",
                status="error",
                message=f"Google Play search error: {str(ex)}",
                candidates=[],
                total_found=0,
                is_live=True,
            )
