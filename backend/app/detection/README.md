# SOC 360 - Similarity Detection & Digital Risk Protection Engine

The SOC 360 detection engine identifies potentially impersonating social media profiles and suspicious mobile/desktop applications by comparing candidate information against registered brand assets.

---

## Architecture Overview

The detection engine performs deterministic, multi-signal heuristic analysis:

```
[Registered Brand Data]        [Candidate Profile / App]
           │                               │
           ├──────────► [1. Official URL Exclusion] ──► (Bypass if Match)
           │                               │
           ├──────────► [2. Name Similarity (RapidFuzz)]
           │                               │
           ├──────────► [3. Logo Similarity (Pillow/ImageHash)]
           │                               │
           ├──────────► [4. Description / Branding Match]
           │                               │
           └──────────► [5. Developer / Publisher Match]
                                           │
                                           ▼
                            [6. Risk Scoring Engine]
                                (Configurable 0-100)
                                           │
                                           ▼
                          [7. Factual Explanation Generator]
```

### Core Principles
1. **No Unauthorized Scraping**: The engine only evaluates candidate records provided by the backend, user submissions, authorized connectors, or synthetic datasets.
2. **Heuristic Review Priority, Not Fraud Allegations**: Scores represent priority for SOC analyst review (0–100), not a legal or calibrated probability of criminal fraud.
3. **Missing Data is Unknown**: Absence of a logo or description is recorded as unavailable evidence; it does not artificially increment or decrement risk.
4. **False-Positive Safeguards**: Short brand names in long phrases are penalized; common buzzwords (e.g., "official", "support", "shop") are discounted; developer mismatches alone cannot trigger high risk.

---

## Public Python Interface

### 1. `analyze_social_candidate(brand, candidate, config=None)`

Analyzes social media profiles across display names, handles/usernames, avatar icons, bios, and profile URLs.

#### Sample Call:
```python
from backend.app.detection import analyze_social_candidate

brand = {
    "name": "Apex Finance",
    "aliases": ["ApexFin", "Apex Bank"],
    "official_urls": ["https://twitter.com/ApexFinance", "https://apexfinance.com"],
    "official_domains": ["apexfinance.com"],
    "logo_path": "data/logos/apex_official.png",
    "description": "Apex Finance is the premier wealth management and digital banking platform.",
}

candidate = {
    "display_name": "Apex Finance Helpdesk",
    "username": "@apexfinance_care",
    "url": "https://twitter.com/apexfinance_care",
    "avatar_path": "data/incoming/suspicious_avatar.png",
    "bio": "Official support page for Apex Finance account recovery.",
}

result = analyze_social_candidate(brand, candidate)
```

### 2. `analyze_app_candidate(brand, candidate, config=None)`

Analyzes application listings across app titles, developer/publisher names, store URLs, app icons, and descriptions.

#### Sample Call:
```python
from backend.app.detection import analyze_app_candidate

brand = {
    "name": "SecureVault",
    "official_developers": ["SecureVault Technologies Inc."],
    "official_urls": ["https://play.google.com/store/apps/details?id=com.securevault.app"],
    "logo_path": "data/logos/vault_logo.png",
}

candidate = {
    "app_name": "Secure-Vault Pro",
    "developer": "Unknown Rogue Dev",
    "url": "https://play.google.com/store/apps/details?id=com.fake.securevault",
    "icon_path": "data/incoming/rogue_icon.png",
    "description": "Manage your passwords with SecureVault Pro edition.",
}

result = analyze_app_candidate(brand, candidate)
```

---

## Response Schema

Both endpoints return consistent, JSON-serializable dictionaries:

```json
{
  "risk_score": 68.5,
  "risk_level": "High",
  "review_priority": "High",
  "is_official_match": false,
  "exclusion_reason": null,
  "evidence": [
    "Candidate name shows high similarity (87.5%) to brand",
    "Developer name differs from registered official developer",
    "Candidate icon/logo has high visual similarity to brand logo (82.8%)"
  ],
  "missing_evidence": [
    "Candidate description unavailable for comparison"
  ],
  "explanation": "The candidate app name is highly similar to registered brand 'SecureVault'. The candidate developer 'Unknown Rogue Dev' differs from registered official developers. The candidate icon has high visual similarity to the brand logo (distance 11, 82.8% similarity).",
  "signals": {
    "name_similarity": {
      "similarity_score": 87.5,
      "match_type": "high_similarity",
      "field": "app_name",
      "brand_term": "SecureVault",
      "candidate_name": "Secure-Vault Pro",
      "has_character_substitution": false,
      "has_reordered_words": false,
      "has_affix_variant": false,
      "explanation": "Candidate app_name is highly similar to registered brand 'SecureVault'."
    },
    "image_similarity": {
      "compared": true,
      "status": "completed",
      "hash_distance": 11,
      "similarity_score": 82.81,
      "is_visual_match": false,
      "explanation": "Candidate image has high visual similarity..."
    },
    "description_similarity": {
      "available": false,
      "status": "unavailable",
      "similarity_score": null,
      "explanation": "Candidate description not provided; signal is unavailable."
    },
    "developer_comparison": {
      "status": "mismatch",
      "is_match": false,
      "is_mismatch": true,
      "candidate_developer": "Unknown Rogue Dev",
      "explanation": "Candidate developer 'Unknown Rogue Dev' does not match registered official developer(s)..."
    },
    "official_url_check": {
      "is_official": false,
      "exclusion_reason": null,
      "matched_official_url": null,
      "explanation": "Candidate URL does not match any registered official URLs or domains."
    }
  }
}
```

---

## Scoring Configuration

The engine uses configurable, transparent weights with no hidden magic numbers:

| Signal | Default Maximum Weight | Notes |
|---|---|---|
| Name Similarity | 35.0 pts | Continuous scale based on RapidFuzz ratio, homoglyphs, and token overlap |
| Developer Mismatch | 20.0 pts | Pro-rated: only applied if name similarity >= 40.0% |
| Logo Similarity | 20.0 pts | Hamming distance on perceptual hashes (64-bit standard) |
| Description Similarity | 15.0 pts | Distinctive brand & product keyword overlap |
| Other Evidence | 10.0 pts | Suspicious affixes (login/support/helpdesk) or homoglyph replacements |
| **Total Max** | **100.0 pts** | Deterministic 0–100 scale |

### Customizing Weights:
```python
from backend.app.detection import RiskScoringConfig, analyze_social_candidate

custom_config = RiskScoringConfig(
    weight_name_similarity=40.0,
    weight_logo_similarity=25.0,
    weight_developer_mismatch=15.0,
    weight_description_similarity=10.0,
    weight_other_evidence=10.0,
    threshold_low_max=30.0,
    threshold_medium_max=65.0,
)

result = analyze_social_candidate(brand, candidate, config=custom_config)
```

---

## Safeguards & Edge-Case Handling

1. **Short Brand Name Protection**: Prevents brands like "Fox" from matching "Silver Fox Shoes" at 100% via length-proportion penalties.
2. **Homoglyph & Leetspeak Normalization**: Resolves `@` to `a`, `0` to `o`, `1` to `l`, `3` to `e`, and Cyrillic look-alikes.
3. **Noise & Stop-Word Filtering**: Common generic words (`the`, `corp`, `llc`, `support`, `official`) do not inflate similarity between unrelated candidates.
4. **Resilient Image Processing**: Corrupt, unreadable, or missing images fail gracefully with `status: "invalid_image"` or `status: "unavailable"`.
5. **Exact Official URL Exclusions**: Accounts on registered official URLs, verified social handles, or genuine registered subdomains score 0.0 with `is_official_match: True`.
