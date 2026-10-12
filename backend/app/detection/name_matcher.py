"""Name similarity detection for SOC 360.

Compares registered brand names and known aliases against candidate display names,
usernames, and application names using RapidFuzz and linguistic normalization.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

try:
    from rapidfuzz import fuzz
    from rapidfuzz.distance import Levenshtein
except ImportError:
    # Graceful pure-python fallback if rapidfuzz is not yet loaded
    import difflib

    class _FuzzFallback:
        @staticmethod
        def ratio(s1: str, s2: str) -> float:
            return difflib.SequenceMatcher(None, s1, s2).ratio() * 100.0

        @staticmethod
        def token_sort_ratio(s1: str, s2: str) -> float:
            t1 = " ".join(sorted(s1.split()))
            t2 = " ".join(sorted(s2.split()))
            return difflib.SequenceMatcher(None, t1, t2).ratio() * 100.0

        @staticmethod
        def token_set_ratio(s1: str, s2: str) -> float:
            tokens1 = set(s1.split())
            tokens2 = set(s2.split())
            intersection = " ".join(sorted(tokens1.intersection(tokens2)))
            diff1 = " ".join(sorted(tokens1 - tokens2))
            diff2 = " ".join(sorted(tokens2 - tokens1))
            t1 = f"{intersection} {diff1}".strip()
            t2 = f"{intersection} {diff2}".strip()
            return difflib.SequenceMatcher(None, t1, t2).ratio() * 100.0

        @staticmethod
        def partial_ratio(s1: str, s2: str) -> float:
            if not s1 or not s2:
                return 0.0
            shorter, longer = (s1, s2) if len(s1) <= len(s2) else (s2, s1)
            best = 0.0
            for i in range(len(longer) - len(shorter) + 1):
                sub = longer[i : i + len(shorter)]
                r = difflib.SequenceMatcher(None, shorter, sub).ratio() * 100.0
                if r > best:
                    best = r
            return best

    fuzz = _FuzzFallback()  # type: ignore

    class _LevenshteinFallback:
        @staticmethod
        def distance(s1: str, s2: str) -> int:
            if s1 == s2:
                return 0
            dp = [[0] * (len(s2) + 1) for _ in range(len(s1) + 1)]
            for i in range(len(s1) + 1):
                dp[i][0] = i
            for j in range(len(s2) + 1):
                dp[0][j] = j
            for i in range(1, len(s1) + 1):
                for j in range(1, len(s2) + 1):
                    cost = 0 if s1[i - 1] == s2[j - 1] else 1
                    dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
            return dp[len(s1)][len(s2)]

    Levenshtein = _LevenshteinFallback()  # type: ignore


# Homoglyph and look-alike character substitution map
# Maps visually confusable symbols/leetspeak/Cyrillic to normalized Latin chars
HOMOGLYPH_MAP: Dict[str, str] = {
    "@": "a",
    "4": "a",
    "8": "b",
    "3": "e",
    "1": "l",
    "!": "i",
    "|": "l",
    "0": "o",
    "5": "s",
    "$": "s",
    "7": "t",
    "+": "t",
    "vv": "w",
    # Cyrillic look-alikes
    "\u0430": "a",  # Cyrillic small a
    "\u0441": "c",  # Cyrillic small es
    "\u0435": "e",  # Cyrillic small ie
    "\u0456": "i",  # Cyrillic small byelorussian-ukrainian i
    "\u0458": "j",  # Cyrillic small je
    "\u043e": "o",  # Cyrillic small o
    "\u0440": "p",  # Cyrillic small er
    "\u0455": "s",  # Cyrillic small dze
    "\u0443": "y",  # Cyrillic small u
    "\u0445": "x",  # Cyrillic small ha
}

# Generic common affixes that may be appended in impersonation or brand confusion
SUSPICIOUS_AFFIXES = {
    "official",
    "support",
    "help",
    "helpdesk",
    "care",
    "login",
    "signin",
    "verify",
    "auth",
    "account",
    "billing",
    "security",
    "update",
    "claim",
    "reward",
    "giveaway",
    "app",
    "team",
}

# Generic noise words that should not inflate similarity when matching unrelated names
GENERIC_STOP_WORDS = {
    "the",
    "inc",
    "incorporated",
    "corp",
    "corporation",
    "llc",
    "ltd",
    "limited",
    "co",
    "company",
    "and",
    "global",
    "international",
    "group",
    "service",
    "services",
}


def normalize_text(
    text: Optional[str],
    resolve_homoglyphs: bool = True,
    strip_punctuation: bool = False,
) -> str:
    """Normalize text through unicode decomposition, case folding, and optional homoglyphs."""
    if not text:
        return ""

    # NFKD decomposition to separate accents
    normalized = unicodedata.normalize("NFKD", str(text))

    # Strip combining diacritical marks
    normalized = "".join(c for c in normalized if not unicodedata.combining(c))

    # Case fold to lowercase
    normalized = normalized.lower().strip()

    if resolve_homoglyphs:
        # Multi-character replacements first
        normalized = normalized.replace("vv", "w")
        chars = [HOMOGLYPH_MAP.get(ch, ch) for ch in normalized]
        normalized = "".join(chars)

    if strip_punctuation:
        # Treat all punctuation, dashes, underscores, dots as whitespace
        normalized = re.sub(r"[^\w\s]|_", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
    else:
        # Standardize hyphens and dots to spaces or single hyphen
        normalized = re.sub(r"[\s_]+", " ", normalized)
        normalized = re.sub(r"[-–—]", "-", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()

    return normalized


def _remove_noise_words(text: str) -> str:
    """Strip generic corporate noise tokens (e.g. LLC, Corp, Inc)."""
    tokens = text.split()
    filtered = [t for t in tokens if t not in GENERIC_STOP_WORDS]
    return " ".join(filtered) if filtered else text


def compare_name_pair(
    brand: str,
    candidate: str,
    field_name: str = "display_name",
) -> Dict[str, Any]:
    """Compare a single brand name against a candidate name.

    Returns a rich dictionary containing similarity scores, match type,
    detected transformations, and human-readable explanation.
    """
    if not brand or not candidate:
        return {
            "similarity_score": 0.0,
            "match_type": "none",
            "field": field_name,
            "brand_term": brand or "",
            "candidate_name": candidate or "",
            "is_exact": False,
            "has_character_substitution": False,
            "has_reordered_words": False,
            "has_affix_variant": False,
            "explanation": f"Missing {'brand' if not brand else 'candidate'} name.",
            "details": {},
        }

    raw_brand = brand.strip()
    raw_cand = candidate.strip()

    # Exact string match before normalization
    if raw_brand == raw_cand:
        return {
            "similarity_score": 100.0,
            "match_type": "exact",
            "field": field_name,
            "brand_term": raw_brand,
            "candidate_name": raw_cand,
            "is_exact": True,
            "has_character_substitution": False,
            "has_reordered_words": False,
            "has_affix_variant": False,
            "explanation": f"Exact match with registered brand name '{raw_brand}'.",
            "details": {"raw_match": True},
        }

    # Normalized versions
    norm_brand = normalize_text(raw_brand, resolve_homoglyphs=False, strip_punctuation=True)
    norm_cand = normalize_text(raw_cand, resolve_homoglyphs=False, strip_punctuation=True)

    # Resolved homoglyphs
    homo_brand = normalize_text(raw_brand, resolve_homoglyphs=True, strip_punctuation=True)
    homo_cand = normalize_text(raw_cand, resolve_homoglyphs=True, strip_punctuation=True)

    has_homoglyphs = (norm_cand != homo_cand) or (norm_brand != homo_brand)

    # Cleaned of corporate noise words
    clean_brand = _remove_noise_words(homo_brand)
    clean_cand = _remove_noise_words(homo_cand)

    # Check exact normalized match (case, whitespace, punctuation differences)
    if norm_brand == norm_cand and norm_brand:
        return {
            "similarity_score": 98.0,
            "match_type": "exact_normalized",
            "field": field_name,
            "brand_term": raw_brand,
            "candidate_name": raw_cand,
            "is_exact": True,
            "has_character_substitution": False,
            "has_reordered_words": False,
            "has_affix_variant": False,
            "explanation": (
                f"Candidate {field_name} matches '{raw_brand}' "
                "with minor case, punctuation, or spacing differences."
            ),
            "details": {"normalized_brand": norm_brand, "normalized_cand": norm_cand},
        }

    # Check match after resolving homoglyph / leetspeak substitutions
    if homo_brand == homo_cand and homo_brand:
        return {
            "similarity_score": 95.0,
            "match_type": "character_substitution",
            "field": field_name,
            "brand_term": raw_brand,
            "candidate_name": raw_cand,
            "is_exact": False,
            "has_character_substitution": True,
            "has_reordered_words": False,
            "has_affix_variant": False,
            "explanation": (
                f"Candidate {field_name} matches '{raw_brand}' via look-alike "
                "or character substitution (e.g., homoglyphs, numbers for letters)."
            ),
            "details": {"homoglyph_brand": homo_brand, "homoglyph_cand": homo_cand},
        }

    # RapidFuzz similarity calculations
    # 1. Base Levenshtein ratio
    ratio = fuzz.ratio(homo_brand, homo_cand)

    # 2. Token Sort ratio (order invariance: e.g. "Acme Corp" vs "Corp Acme")
    token_sort = fuzz.token_sort_ratio(homo_brand, homo_cand)

    # 3. Token Set ratio (handles duplicate/extra words)
    token_set = fuzz.token_set_ratio(homo_brand, homo_cand)

    # 4. Partial ratio (substring match)
    raw_partial = fuzz.partial_ratio(homo_brand, homo_cand)

    # Analyze tokens and affixes
    brand_tokens = set(homo_brand.split())
    cand_tokens = set(homo_cand.split())

    brand_token_count = len(brand_tokens)
    cand_token_count = len(cand_tokens)

    # Detect reordered words
    is_reordered = (
        token_sort >= 90.0
        and ratio < 85.0
        and brand_tokens == cand_tokens
        and brand_token_count > 1
    )

    # Detect brand presence with extra words / affixes
    is_brand_subset = (
        brand_tokens.issubset(cand_tokens) and brand_token_count > 0
    ) or (
        len(homo_brand) >= 4 and f" {homo_brand} " in f" {homo_cand} "
    )

    # Check if extra words are suspicious affixes
    extra_tokens = cand_tokens - brand_tokens
    has_suspicious_affix = bool(extra_tokens.intersection(SUSPICIOUS_AFFIXES))

    # Guard against false positives for short brand names in long unrelated phrases
    # (e.g. brand "Fox" in "Silver Fox Fur Coats" or brand "Ace" in "Space Station")
    short_brand_penalty = 1.0
    if len(homo_brand) < 5 and cand_token_count > brand_token_count + 1:
        # Significant length disparity on short brand names
        short_brand_penalty = 0.65

    # Safe partial ratio: penalize if candidate is dramatically longer and not an affix variant
    length_ratio = min(len(homo_brand), len(homo_cand)) / max(len(homo_brand), len(homo_cand), 1)
    if not is_brand_subset and length_ratio < 0.4:
        safe_partial = raw_partial * (length_ratio / 0.4)
    else:
        safe_partial = raw_partial

    # Compute edit distance on the normalized strings
    edit_dist = Levenshtein.distance(homo_brand, homo_cand)
    max_len = max(len(homo_brand), len(homo_cand), 1)

    # Determine highest-fidelity composite score
    match_type = "unrelated"
    explanation = f"Low similarity to brand '{raw_brand}'."
    composite_score = ratio

    if is_reordered:
        composite_score = token_sort * 0.95
        match_type = "reordered_words"
        explanation = f"Candidate {field_name} uses reordered words from '{raw_brand}'."

    elif edit_dist <= 2 and max_len >= 5 and ratio >= 80.0:
        # Minor typo / misspelling
        composite_score = max(ratio, 88.0 - (edit_dist * 4.0))
        match_type = "minor_misspelling"
        explanation = (
            f"Candidate {field_name} is a minor misspelling or edit distance of "
            f"{edit_dist} from '{raw_brand}'."
        )

    elif is_brand_subset:
        if has_suspicious_affix:
            # Brand name with high-risk keyword (e.g., "Brand Support", "Brand Login")
            composite_score = min(95.0, 75.0 + (token_set * 0.2))
            match_type = "suspicious_affix"
            explanation = (
                f"Candidate {field_name} contains brand name '{raw_brand}' combined "
                f"with high-risk keyword(s): {', '.join(sorted(extra_tokens.intersection(SUSPICIOUS_AFFIXES)))}."
            )
        else:
            # Added or removed general words
            # Score scaled by how dominant the brand is in the candidate
            coverage = len(homo_brand) / max(len(homo_cand), 1)
            composite_score = (token_set * 0.6 + token_sort * 0.2 + coverage * 20.0) * short_brand_penalty
            composite_score = min(composite_score, 85.0)
            if composite_score < 40.0:
                match_type = "unrelated"
                explanation = f"Candidate {field_name} has low similarity ({composite_score:.1f}%) to brand '{raw_brand}'."
            elif composite_score < 55.0:
                match_type = "low_similarity"
                explanation = f"Candidate {field_name} has low similarity ({composite_score:.1f}%) to brand '{raw_brand}'."
            else:
                match_type = "added_words"
                explanation = f"Candidate {field_name} incorporates '{raw_brand}' with additional words."

    elif token_sort >= 85.0 or ratio >= 85.0:
        composite_score = max(token_sort, ratio)
        match_type = "high_similarity"
        explanation = f"Candidate {field_name} is highly similar to registered brand '{raw_brand}'."

    elif safe_partial >= 75.0 and length_ratio >= 0.5:
        composite_score = safe_partial * short_brand_penalty
        match_type = "partial_match"
        explanation = f"Candidate {field_name} shows partial textual overlap with '{raw_brand}'."

    else:
        # Unrelated or weak match
        composite_score = max(ratio, token_sort * 0.5) * short_brand_penalty
        match_type = "unrelated" if composite_score < 45.0 else "low_similarity"
        explanation = f"Candidate {field_name} has low similarity ({composite_score:.1f}%) to brand '{raw_brand}'."

    # Clamp composite score strictly to [0.0, 100.0]
    final_score = round(max(0.0, min(100.0, float(composite_score))), 2)

    return {
        "similarity_score": final_score,
        "match_type": match_type,
        "field": field_name,
        "brand_term": raw_brand,
        "candidate_name": raw_cand,
        "is_exact": False,
        "has_character_substitution": has_homoglyphs,
        "has_reordered_words": is_reordered,
        "has_affix_variant": has_suspicious_affix,
        "explanation": explanation,
        "details": {
            "ratio": round(ratio, 2),
            "token_sort_ratio": round(token_sort, 2),
            "token_set_ratio": round(token_set, 2),
            "edit_distance": edit_dist,
            "normalized_brand": homo_brand,
            "normalized_cand": homo_cand,
        },
    }


def compare_candidate_names(
    brand_names: List[str],
    candidate_fields: List[Tuple[str, Optional[str]]],
) -> Dict[str, Any]:
    """Compare all brand names & aliases against all candidate name fields.

    Args:
        brand_names: Registered official brand names and known aliases.
        candidate_fields: List of (field_name, field_value) pairs,
                          e.g. [("display_name", "Acme Support"), ("username", "@acme_supp")]

    Returns:
        Structured evaluation with highest scoring match, individual field comparisons,
        and overall name similarity score (0.0 to 100.0).
    """
    valid_brands = [b.strip() for b in brand_names if b and b.strip()]
    valid_candidates = [
        (name, val.strip()) for name, val in candidate_fields if val and val.strip()
    ]

    if not valid_brands or not valid_candidates:
        return {
            "similarity_score": 0.0,
            "highest_match": None,
            "match_type": "none",
            "field_matches": {},
            "all_comparisons": [],
            "explanation": "No valid brand names or candidate names provided for comparison.",
        }

    best_match: Optional[Dict[str, Any]] = None
    field_best: Dict[str, Dict[str, Any]] = {}
    all_comparisons: List[Dict[str, Any]] = []

    for brand in valid_brands:
        for field_name, cand_val in valid_candidates:
            # Also test username with leading '@' stripped
            test_val = cand_val.lstrip("@") if field_name == "username" else cand_val
            result = compare_name_pair(brand, test_val, field_name=field_name)
            all_comparisons.append(result)

            # Update best match for this specific field
            if field_name not in field_best or result["similarity_score"] > field_best[field_name]["similarity_score"]:
                field_best[field_name] = result

            # Update global best match
            if best_match is None or result["similarity_score"] > best_match["similarity_score"]:
                best_match = result

    overall_score = best_match["similarity_score"] if best_match else 0.0
    explanation = best_match["explanation"] if best_match else "No match found."

    return {
        "similarity_score": overall_score,
        "highest_match": best_match,
        "match_type": best_match["match_type"] if best_match else "none",
        "field_matches": field_best,
        "all_comparisons": all_comparisons,
        "explanation": explanation,
    }
