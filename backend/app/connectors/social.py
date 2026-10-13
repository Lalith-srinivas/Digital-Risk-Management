import os
import re
import httpx
from typing import List, Dict, Any, Optional
from app.connectors.base import BaseConnector, ConnectorResult
from app.schemas.candidate import SocialCandidateInput


class GitHubConnector(BaseConnector):
    name: str = "github"
    source_type: str = "social"

    def is_configured(self) -> bool:
        # GitHub public user/org search is publicly accessible
        return True

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": "GitHub Organizations & Profiles",
            "source_type": "social",
            "status": "active",
            "is_configured": True,
            "description": "Public GitHub API for developer identities, orgs, and project accounts",
            "required_keys": [],
        }

    def search(
        self,
        query: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 5,
    ) -> ConnectorResult:
        clean_query = query.strip()
        if not clean_query:
            return ConnectorResult(
                connector_name="GitHub",
                source_type="social",
                status="active",
                message="Query was empty",
                candidates=[],
                total_found=0,
            )

        url = "https://api.github.com/search/users"
        params = {"q": clean_query, "per_page": min(limit, 10)}
        headers = {"User-Agent": "SOC360-Digital-Risk-Scanner"}
        token = os.getenv("GITHUB_TOKEN")
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            with httpx.Client(timeout=6.0) as client:
                resp = client.get(url, params=params, headers=headers)
                if resp.status_code == 403:
                    return ConnectorResult(
                        connector_name="GitHub",
                        source_type="social",
                        status="rate_limited",
                        message="GitHub API rate limit exceeded.",
                        candidates=[],
                        total_found=0,
                    )
                if resp.status_code != 200:
                    return ConnectorResult(
                        connector_name="GitHub",
                        source_type="social",
                        status="error",
                        message=f"GitHub API returned HTTP {resp.status_code}",
                        candidates=[],
                        total_found=0,
                    )

                data = resp.json()
                items = data.get("items", [])
                candidates: List[SocialCandidateInput] = []

                for item in items:
                    login = item.get("login")
                    if not login:
                        continue
                    cand = SocialCandidateInput(
                        display_name=login,
                        username=f"@{login}",
                        profile_url=item.get("html_url") or f"https://github.com/{login}",
                        platform="GitHub",
                        bio=f"Public account / repository namespace on GitHub matching '{clean_query}'.",
                        image_url=item.get("avatar_url"),
                        is_demo=False,
                    )
                    candidates.append(cand)

                return ConnectorResult(
                    connector_name="GitHub",
                    source_type="social",
                    status="active",
                    message=f"Retrieved {len(candidates)} live accounts from GitHub",
                    candidates=candidates,
                    total_found=len(candidates),
                    is_live=True,
                )

        except (httpx.TimeoutException, httpx.RequestError) as ex:
            return ConnectorResult(
                connector_name="GitHub",
                source_type="social",
                status="error",
                message=f"Network error querying GitHub: {str(ex)}",
                candidates=[],
                total_found=0,
                is_live=True,
            )
        except Exception as ex:
            return ConnectorResult(
                connector_name="GitHub",
                source_type="social",
                status="error",
                message=f"Failed parsing GitHub response: {str(ex)}",
                candidates=[],
                total_found=0,
                is_live=True,
            )


class TwitterConnector(BaseConnector):
    name: str = "twitter"
    source_type: str = "social"

    def __init__(self):
        self.bearer_token = os.getenv("TWITTER_BEARER_TOKEN") or os.getenv("X_BEARER_TOKEN") or ""

    def is_configured(self) -> bool:
        return bool(self.bearer_token and self.bearer_token.strip())

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "name": "Twitter/X Surveillance",
            "source_type": "social",
            "status": "active" if configured else "unconfigured",
            "is_configured": configured,
            "description": "Twitter/X API v2 handle surveillance and profile monitoring",
            "required_keys": ["TWITTER_BEARER_TOKEN"],
            "message": "Configured and active" if configured else "Twitter/X API credentials not configured in environment.",
        }

    def search(
        self,
        query: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 5,
    ) -> ConnectorResult:
        if not self.is_configured():
            return ConnectorResult(
                connector_name="Twitter/X",
                source_type="social",
                status="unconfigured",
                message="Twitter/X connector unconfigured. Provide TWITTER_BEARER_TOKEN for live handle scanning.",
                candidates=[],
                total_found=0,
                is_live=False,
            )

        url = "https://api.twitter.com/2/users/by"
        slug = query.lower().replace(" ", "")
        usernames = f"{slug},{slug}_official,{slug}_support,{slug}_app"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        params = {"usernames": usernames, "user.fields": "description,profile_image_url,verified"}

        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(url, params=params, headers=headers)
                if resp.status_code != 200:
                    return ConnectorResult(
                        connector_name="Twitter/X",
                        source_type="social",
                        status="error",
                        message=f"Twitter API returned HTTP {resp.status_code}",
                        candidates=[],
                        total_found=0,
                    )

                data = resp.json()
                users = data.get("data", [])
                candidates: List[SocialCandidateInput] = []

                for u in users:
                    handle = u.get("username")
                    candidates.append(
                        SocialCandidateInput(
                            display_name=u.get("name") or handle,
                            username=f"@{handle}",
                            profile_url=f"https://x.com/{handle}",
                            platform="Twitter/X",
                            bio=u.get("description", ""),
                            image_url=u.get("profile_image_url"),
                            is_demo=False,
                        )
                    )

                return ConnectorResult(
                    connector_name="Twitter/X",
                    source_type="social",
                    status="active",
                    message=f"Retrieved {len(candidates)} live accounts from Twitter/X",
                    candidates=candidates,
                    total_found=len(candidates),
                    is_live=True,
                )

        except Exception as ex:
            return ConnectorResult(
                connector_name="Twitter/X",
                source_type="social",
                status="error",
                message=f"Twitter/X query error: {str(ex)}",
                candidates=[],
                total_found=0,
                is_live=True,
            )


class TelegramConnector(BaseConnector):
    name: str = "telegram"
    source_type: str = "social"

    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN") or ""

    def is_configured(self) -> bool:
        return bool(self.bot_token and self.bot_token.strip())

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "name": "Telegram Channels & Bots",
            "source_type": "social",
            "status": "active" if configured else "unconfigured",
            "is_configured": configured,
            "description": "Telegram bot & channel brand impersonation surveillance",
            "required_keys": ["TELEGRAM_BOT_TOKEN"],
            "message": "Configured and active" if configured else "Telegram Bot Token not configured in environment.",
        }

    def search(
        self,
        query: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 5,
    ) -> ConnectorResult:
        if not self.is_configured():
            return ConnectorResult(
                connector_name="Telegram",
                source_type="social",
                status="unconfigured",
                message="Telegram connector unconfigured. Set TELEGRAM_BOT_TOKEN to enable live channel surveillance.",
                candidates=[],
                total_found=0,
                is_live=False,
            )

        slug = re.sub(r"[^a-zA-Z0-9_]", "", query.lower().replace(" ", "_")) or "brand"
        handles_to_probe = [
            f"@{slug}",
            f"@{slug}_support",
            f"@{slug}_official",
            f"@{slug}_app",
            f"@{slug}official",
        ][:min(limit, 5)]

        candidates: List[SocialCandidateInput] = []

        try:
            with httpx.Client(timeout=4.0) as client:
                for handle in handles_to_probe:
                    try:
                        url = f"https://api.telegram.org/bot{self.bot_token}/getChat"
                        resp = client.get(url, params={"chat_id": handle})
                        if resp.status_code == 200:
                            data = resp.json()
                            if data.get("ok") and "result" in data:
                                chat = data["result"]
                                uname = chat.get("username") or handle.lstrip("@")
                                title = chat.get("title") or f"{chat.get('first_name', '')} {chat.get('last_name', '')}".strip() or uname
                                bio = chat.get("description") or chat.get("bio") or ""

                                candidates.append(
                                    SocialCandidateInput(
                                        display_name=title,
                                        username=f"@{uname}",
                                        profile_url=f"https://t.me/{uname}",
                                        platform="Telegram",
                                        bio=bio[:500],
                                        image_url=None,
                                        is_demo=False,
                                    )
                                )
                    except Exception:
                        continue

            return ConnectorResult(
                connector_name="Telegram",
                source_type="social",
                status="active",
                message=f"Live resolved {len(candidates)} public Telegram channels/bots",
                candidates=candidates,
                total_found=len(candidates),
                is_live=True,
            )
        except Exception as ex:
            return ConnectorResult(
                connector_name="Telegram",
                source_type="social",
                status="error",
                message=f"Telegram query error: {str(ex)}",
                candidates=[],
                total_found=0,
                is_live=True,
            )


class WebSearchConnector(BaseConnector):
    name: str = "web_search"
    source_type: str = "social"

    def __init__(self):
        self.api_key = os.getenv("SERPER_API_KEY") or os.getenv("GOOGLE_SEARCH_API_KEY") or ""

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "name": "Web & Social Search (Serper / Google CSE)",
            "source_type": "social",
            "status": "active" if configured else "unconfigured",
            "is_configured": configured,
            "description": "External multi-platform social profile search via SERP API",
            "required_keys": ["SERPER_API_KEY or GOOGLE_SEARCH_API_KEY"],
            "message": "Configured and active" if configured else "Search API key not configured in environment.",
        }

    def search(
        self,
        query: str,
        brand_info: Optional[Dict[str, Any]] = None,
        limit: int = 5,
    ) -> ConnectorResult:
        if not self.is_configured():
            return ConnectorResult(
                connector_name="Web/Social Search",
                source_type="social",
                status="unconfigured",
                message="Web/Social search unconfigured. Provide SERPER_API_KEY or GOOGLE_SEARCH_API_KEY.",
                candidates=[],
                total_found=0,
                is_live=False,
            )

        # Serper search query
        url = "https://google.serper.dev/search"
        headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}
        payload = {"q": f"{query} (site:x.com OR site:instagram.com OR site:facebook.com OR site:t.me)", "num": limit}

        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code != 200:
                    return ConnectorResult(
                        connector_name="Web/Social Search",
                        source_type="social",
                        status="error",
                        message=f"Search API returned HTTP {resp.status_code}",
                        candidates=[],
                        total_found=0,
                    )

                data = resp.json()
                results = data.get("organic", [])
                candidates: List[SocialCandidateInput] = []

                for r in results:
                    link = r.get("link", "")
                    title = r.get("title", "")
                    snippet = r.get("snippet", "")
                    platform = "Social Media"
                    if "x.com" in link or "twitter.com" in link:
                        platform = "Twitter/X"
                    elif "instagram.com" in link:
                        platform = "Instagram"
                    elif "t.me" in link:
                        platform = "Telegram"
                    elif "facebook.com" in link:
                        platform = "Facebook"

                    cand = SocialCandidateInput(
                        display_name=title,
                        username=title.split(" ")[0] if title else None,
                        profile_url=link,
                        platform=platform,
                        bio=snippet[:300],
                        is_demo=False,
                    )
                    candidates.append(cand)

                return ConnectorResult(
                    connector_name="Web/Social Search",
                    source_type="social",
                    status="active",
                    message=f"Discovered {len(candidates)} social profiles via web search",
                    candidates=candidates,
                    total_found=len(candidates),
                    is_live=True,
                )

        except Exception as ex:
            return ConnectorResult(
                connector_name="Web/Social Search",
                source_type="social",
                status="error",
                message=f"Web search error: {str(ex)}",
                candidates=[],
                total_found=0,
                is_live=True,
            )
