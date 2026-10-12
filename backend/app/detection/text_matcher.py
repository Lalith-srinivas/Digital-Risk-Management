"""Text, description, developer, and official URL matcher for SOC 360.

Compares candidate profile/app descriptions, developer names, and URLs against
registered brand information with false-positive safeguards.
"""

from __future__ import annotations

import re
import urllib.parse
from typing import Any, Dict, List, Optional, Set, Tuple

# Generic stop words and platform generic terms that should NOT count as brand evidence
COMMON_DESCRIPTION_STOP_WORDS: Set[str] = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "he",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "that",
    "the",
    "to",
    "was",
    "were",
    "will",
    "with",
    # Generic commercial and support buzzwords
    "official",
    "shop",
    "store",
    "support",
    "help",
    "customer",
    "service",
    "services",
    "contact",
    "download",
    "free",
    "app",
    "application",
    "login",
    "signin",
    "portal",
    "welcome",
    "page",
    "community",
    "channel",
    "group",
    "update",
    "latest",
    "news",
    "info",
    "information",
    "online",
    "best",
    "new",
    "all",
    "your",
    "we",
    "our",
    "you",
}

# Recognized equivalent social platform host aliases
SOCIAL_HOST_EQUIVALENTS: Dict[str, str] = {
    "x.com": "twitter.com",
    "www.x.com": "twitter.com",
    "www.twitter.com": "twitter.com",
    "twitter.com": "twitter.com",
    "fb.com": "facebook.com",
    "www.facebook.com": "facebook.com",
    "facebook.com": "facebook.com",
    "m.facebook.com": "facebook.com",
    "www.instagram.com": "instagram.com",
    "instagram.com": "instagram.com",
    "www.linkedin.com": "linkedin.com",
    "linkedin.com": "linkedin.com",
    "www.youtube.com": "youtube.com",
    "youtube.com": "youtube.com",
    "youtu.be": "youtube.com",
    "www.tiktok.com": "tiktok.com",
    "tiktok.com": "tiktok.com",
}


def _tokenize_text(text: Optional[str]) -> List[str]:
    """Extract clean lowercase alphanumeric tokens from text."""
    if not text:
        return []
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    return [t for t in cleaned.split() if len(t) > 1]


def compare_descriptions(
    brand_description: Optional[str],
    candidate_description: Optional[str],
    brand_names: Optional[List[str]] = None,
    product_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Compare candidate description against registered brand descriptions and terms.

    Safeguards:
    - If either description is missing, signal is marked unavailable rather than dissimilar.
    - Common generic terms (e.g. 'official', 'support', 'shop') are stripped and cannot trigger similarity.
    - Specific brand terms, trademarks, and distinctive phrase overlaps are prioritized.
    """
    if not candidate_description or not candidate_description.strip():
        return {
            "available": False,
            "status": "unavailable",
            "similarity_score": None,
            "brand_terms_found": [],
            "distinctive_overlap": [],
            "explanation": "Candidate description not provided; signal is unavailable.",
            "details": {"reason": "missing_candidate_description"},
        }

    cand_text = candidate_description.strip()
    cand_tokens = set(_tokenize_text(cand_text))
    content_cand_tokens = cand_tokens - COMMON_DESCRIPTION_STOP_WORDS

    # 1. Search for explicit registered brand names and product names in candidate text
    brand_terms = [b.lower().strip() for b in (brand_names or []) if b and b.strip()]
    products = [p.lower().strip() for p in (product_names or []) if p and p.strip()]

    detected_brand_terms = []
    for term in brand_terms + products:
        # Check whole word match or phrase match
        pattern = r"\b" + re.escape(term) + r"\b"
        if re.search(pattern, cand_text.lower()):
            detected_brand_terms.append(term)

    # 2. Compare against brand reference description if available
    has_brand_desc = bool(brand_description and brand_description.strip())
    jaccard_similarity = 0.0
    common_content_tokens: List[str] = []

    if has_brand_desc:
        brand_tokens = set(_tokenize_text(brand_description))
        content_brand_tokens = brand_tokens - COMMON_DESCRIPTION_STOP_WORDS

        if content_brand_tokens and content_cand_tokens:
            intersection = content_brand_tokens.intersection(content_cand_tokens)
            union = content_brand_tokens.union(content_cand_tokens)
            jaccard_similarity = (len(intersection) / len(union)) * 100.0
            common_content_tokens = sorted(list(intersection))[:10]

    if not has_brand_desc and not detected_brand_terms:
        return {
            "available": False,
            "status": "unavailable",
            "similarity_score": None,
            "brand_terms_found": [],
            "distinctive_overlap": [],
            "explanation": "No brand reference description or matching brand terms found.",
            "details": {"reason": "missing_brand_reference_description"},
        }

    # 3. Calculate calibrated score
    # Score is 0 to 100
    score = 0.0
    explanation_parts = []

    if detected_brand_terms:
        # Brand terms or products prominently cited in candidate bio/description
        term_boost = min(75.0, 45.0 + (len(detected_brand_terms) * 15.0))
        score = max(score, term_boost)
        explanation_parts.append(
            f"Candidate description explicitly mentions brand/product terms: {', '.join(detected_brand_terms)}."
        )

    if has_brand_desc and common_content_tokens:
        # Textual overlap beyond generic stop words
        score = max(score, min(100.0, score + jaccard_similarity * 0.5))
        explanation_parts.append(
            f"Shares {len(common_content_tokens)} distinctive descriptive keywords with brand profile."
        )

    if not explanation_parts:
        score = 0.0
        explanation_parts.append("Candidate description shares no distinctive branding or keywords.")

    final_score = round(max(0.0, min(100.0, score)), 2)

    return {
        "available": True,
        "status": "available",
        "similarity_score": final_score,
        "brand_terms_found": detected_brand_terms,
        "distinctive_overlap": common_content_tokens,
        "explanation": " ".join(explanation_parts),
        "details": {
            "jaccard_similarity": round(jaccard_similarity, 2),
            "common_keywords": common_content_tokens,
            "brand_terms": detected_brand_terms,
        },
    }


def compare_developers(
    candidate_developer: Optional[str],
    official_developers: Optional[List[str]],
) -> Dict[str, Any]:
    """Compare application developer/publisher against official brand publishers.

    Returns:
        status: 'match' | 'mismatch' | 'missing'
        explanation: Clear, non-accusatory summary
    """
    if not candidate_developer or not candidate_developer.strip():
        return {
            "status": "missing",
            "is_mismatch": False,
            "is_match": False,
            "candidate_developer": None,
            "matched_official_developer": None,
            "explanation": "Candidate developer/publisher information is not available.",
        }

    clean_cand_dev = candidate_developer.strip()

    valid_official = [d.strip() for d in (official_developers or []) if d and d.strip()]
    if not valid_official:
        return {
            "status": "missing",
            "is_mismatch": False,
            "is_match": False,
            "candidate_developer": clean_cand_dev,
            "matched_official_developer": None,
            "explanation": "No registered official developer names available for comparison.",
        }

    # Normalize developers for comparison
    def norm_dev(s: str) -> str:
        s = s.lower().strip()
        s = re.sub(r"[^\w\s]", "", s)
        tokens = [t for t in s.split() if t not in COMMON_DESCRIPTION_STOP_WORDS]
        return " ".join(tokens)

    norm_cand = norm_dev(clean_cand_dev)

    for off_dev in valid_official:
        norm_off = norm_dev(off_dev)
        if norm_cand == norm_off or norm_cand in norm_off or norm_off in norm_cand:
            return {
                "status": "match",
                "is_match": True,
                "is_mismatch": False,
                "candidate_developer": clean_cand_dev,
                "matched_official_developer": off_dev,
                "explanation": (
                    f"Candidate developer '{clean_cand_dev}' matches registered official developer '{off_dev}'."
                ),
            }

    return {
        "status": "mismatch",
        "is_match": False,
        "is_mismatch": True,
        "candidate_developer": clean_cand_dev,
        "matched_official_developer": None,
        "explanation": (
            f"Candidate developer '{clean_cand_dev}' does not match registered official developer(s) "
            f"({', '.join(valid_official)}). Developer mismatch alone does not confirm fraud."
        ),
    }


def normalize_url(raw_url: Optional[str]) -> Tuple[str, str, str, Dict[str, List[str]]]:
    """Carefully normalize URL into (canonical_url, hostname, path, query_params).

    Rules:
    - Lowercase hostname
    - Strip standard ports (:80, :443)
    - Map social host equivalents (x.com -> twitter.com)
    - Remove tracking query parameters (utm_*, ref, fbclid, etc.)
    - Retain key identification params (e.g. ?id=com.app on google play)
    - Strip trailing slashes on paths
    """
    if not raw_url or not raw_url.strip():
        return "", "", "", {}

    u = raw_url.strip()
    if not (u.startswith("http://") or u.startswith("https://")):
        u = "https://" + u

    parsed = urllib.parse.urlsplit(u)

    # Clean host
    host = parsed.netloc.lower()
    if ":" in host:
        host = host.split(":")[0]

    # Map equivalent social hosts
    host = SOCIAL_HOST_EQUIVALENTS.get(host, host)
    if host.startswith("www."):
        host = host[4:]

    # Clean path
    path = parsed.path.rstrip("/")
    if not path:
        path = "/"

    # Clean query params: preserve ID / account params, drop analytics params
    query_dict = urllib.parse.parse_qs(parsed.query)
    filtered_query: Dict[str, List[str]] = {}
    for k, v in query_dict.items():
        lk = k.lower()
        if not (lk.startswith("utm_") or lk in {"ref", "fbclid", "igshid", "gclid", "source", "s"}):
            filtered_query[lk] = v

    # Reconstruct query string deterministically
    sorted_items = sorted(filtered_query.items())
    q_pairs = []
    for k, vals in sorted_items:
        for val in sorted(vals):
            q_pairs.append(f"{k}={val}")
    clean_query = "&".join(q_pairs)

    canonical = f"https://{host}{path}"
    if clean_query:
        canonical += f"?{clean_query}"

    return canonical, host, path, filtered_query


def check_official_url_exclusion(
    candidate_url: Optional[str],
    official_urls: Optional[List[str]],
    official_domains: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Check if candidate URL corresponds to an official brand account or registered asset.

    Safeguards:
    - Exact official URL matches trigger exclusion.
    - Subdomains are only considered official if genuinely within registered brand domain.
    - Merely having the brand name inside an arbitrary third-party domain (e.g. brand-login.com)
      is NOT considered official.
    """
    if not candidate_url or not candidate_url.strip():
        return {
            "is_official": False,
            "exclusion_reason": None,
            "matched_official_url": None,
            "explanation": "No candidate URL provided.",
        }

    cand_canonical, cand_host, cand_path, cand_query = normalize_url(candidate_url)
    if not cand_canonical:
        return {
            "is_official": False,
            "exclusion_reason": None,
            "matched_official_url": None,
            "explanation": "Invalid candidate URL.",
        }

    # 1. Compare against registered official URLs
    for raw_official in (official_urls or []):
        if not raw_official or not raw_official.strip():
            continue

        off_canonical, off_host, off_path, off_query = normalize_url(raw_official)

        # Exact canonical URL match
        if cand_canonical == off_canonical:
            return {
                "is_official": True,
                "exclusion_reason": "Exact match with registered official URL",
                "matched_official_url": raw_official,
                "explanation": (
                    f"Candidate URL matches registered official URL '{raw_official}'. "
                    "This account is excluded from suspicious impersonation flags."
                ),
            }

        # Check social profile handle / account identifier equality on same platform
        if cand_host == off_host and cand_host in {
            "twitter.com",
            "facebook.com",
            "instagram.com",
            "linkedin.com",
            "youtube.com",
            "tiktok.com",
            "github.com",
        }:
            # Normalize path segments (e.g. /nike/ -> /nike)
            if cand_path.lower() == off_path.lower() and cand_path != "/":
                return {
                    "is_official": True,
                    "exclusion_reason": f"Official verified handle on {cand_host}",
                    "matched_official_url": raw_official,
                    "explanation": (
                        f"Candidate account matches official registered profile handle on {cand_host}."
                    ),
                }

        # Check application store package id equality
        if cand_host == off_host and "play.google.com" in cand_host:
            cand_id = cand_query.get("id", [""])[0]
            off_id = off_query.get("id", [""])[0]
            if cand_id and off_id and cand_id == off_id:
                return {
                    "is_official": True,
                    "exclusion_reason": "Matching official Play Store application ID",
                    "matched_official_url": raw_official,
                    "explanation": (
                        f"Candidate app package ID '{cand_id}' matches registered official application."
                    ),
                }

    # 2. Check registered official domains / subdomains
    for domain in (official_domains or []):
        if not domain or not domain.strip():
            continue
        clean_domain = domain.lower().strip()
        if clean_domain.startswith("www."):
            clean_domain = clean_domain[4:]

        # Host matches domain exactly, or is a genuine hierarchical subdomain of the domain
        if cand_host == clean_domain or cand_host.endswith("." + clean_domain):
            return {
                "is_official": True,
                "exclusion_reason": f"Hosted under registered official domain '{domain}'",
                "matched_official_url": f"https://{domain}",
                "explanation": (
                    f"Candidate URL host '{cand_host}' belongs to registered official domain '{domain}'."
                ),
            }

    return {
        "is_official": False,
        "exclusion_reason": None,
        "matched_official_url": None,
        "explanation": "Candidate URL does not match any registered official URLs or domains.",
    }
