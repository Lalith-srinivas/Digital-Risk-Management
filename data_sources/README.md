# SOC 360 - Data Sources & Integration Layer

This module implements the candidate ingestion, normalization, and connector interfaces for **SOC 360** (Digital Risk Protection Platform).

---

## Architecture Role

SOC 360 monitors registered brands for digital impersonation across social platforms and mobile application stores. The `data_sources` package handles:

1. **Candidate Ingestion**: Parses user-submitted profile/app URLs, accepts manual analyst metadata, queries permitted public APIs, and provides synthetic demo datasets.
2. **Strict Normalization**: Converts diverse upstream inputs into standard Pydantic models (`CandidateProfile`, `CandidateApp`) with validated types, clean handles, and canonical URLs.
3. **Data Integrity & Compliance**: Enforces that synthetic demo records are strictly tagged with `is_demo = True`, preventing fake or synthetic findings from ever being misrepresented as live threat intelligence.
4. **Transparent Status Reporting**: If a commercial or restricted API (such as Twitter API v2 or Instagram Graph API) lacks credentials, the connector returns `DataSourceStatus.NOT_CONFIGURED` with actionable instructions rather than fabricating fake live data.

---

## Directory Structure

```
data_sources/
  ├── __init__.py           # Package exports
  ├── base.py               # Abstract base classes, Pydantic models, status enums, exceptions
  ├── social_source.py      # Modular social sources (URL parser, manual, GitHub live, Twitter v2 connector)
  ├── app_source.py         # Modular app sources (Store URL parser, manual, Apple iTunes Search API, Play limits)
  ├── demo_data.py          # Synthetic demo dataset (Fictional brand: Northstar Pay)
  └── README.md             # This documentation
```

---

## Core Schemas

### 1. `RegisteredBrand`
Represents the protected legal brand identity:
- `brand_name`: Name of the brand (e.g., `Northstar Pay`).
- `registered_domains`: Whitelisted domains (e.g., `["northstarpay.example.com"]`).
- `official_handles`: Verified social media handles (e.g., `{"twitter": ["northstarpay"]}`).
- `official_app_ids`: Verified mobile store identifiers (e.g., `{"google_play": ["com.northstarpay.app"]}`).
- `keywords`: Key industry terms (e.g., `["payments", "wallet", "fintech"]`).

### 2. `CandidateProfile`
Normalized social profile candidate for similarity and risk scoring:
- `display_name`: Visible profile name.
- `username`: Account handle without `@`.
- `profile_url`: Canonical HTTPS profile link.
- `bio`: Account biography / description.
- `source_platform`: `twitter`, `instagram`, `linkedin`, `github`, `tiktok`, etc.
- `is_demo`: Boolean flag (`True` for synthetic demo records, `False` for real candidates).
- `source_type`: `demo`, `user_submitted`, `manual_input`, or `live_api`.

### 3. `CandidateApp`
Normalized mobile application candidate:
- `app_name`: Store listing title.
- `store_url`: Canonical store link.
- `package_id`: Bundle ID or package name (e.g., `com.northstarpay.app`).
- `developer_name`: Publisher name.
- `description`: App store description.
- `source_platform`: `google_play`, `apple_app_store`, etc.
- `is_demo`: Boolean flag (`True` for synthetic demo records, `False` for real candidates).
- `source_type`: `demo`, `user_submitted`, `manual_input`, or `live_api`.

---

## Quickstart & Usage

### 1. Ingesting User-Submitted URLs

```python
from data_sources import ModularSocialDataSource, ModularAppDataSource

# Ingest a suspicious Twitter profile URL submitted by a user
social_source = ModularSocialDataSource()
candidate_profile = social_source.ingest_url(
    url="https://x.com/northstar_pay_care",
    display_name="Northstar Pay Support",
    bio="Direct message us to verify your neobank account credentials."
)
assert candidate_profile.username == "northstar_pay_care"
assert candidate_profile.source_platform == "twitter"
assert candidate_profile.is_demo is False

# Ingest an application store link submitted by a user
app_source = ModularAppDataSource()
candidate_app = app_source.ingest_url(
    url="https://play.google.com/store/apps/details?id=com.northstar.paywallet.online",
    app_name="Northstar Pay Wallet Helper",
    developer_name="Rogue Software LLC"
)
assert candidate_app.package_id == "com.northstar.paywallet.online"
assert candidate_app.source_platform == "google_play"
assert candidate_app.is_demo is False
```

### 2. Live API Connectors

#### Apple iTunes Search API (Permitted Official Public API)
```python
from data_sources import ModularAppDataSource

app_source = ModularAppDataSource()
response = app_source.search_live_store(platform="apple_app_store", term="Northstar", limit=5)

if response.status == "success":
    for app in response.records:
        print(f"Found: {app.app_name} by {app.developer_name} (Bundle: {app.package_id})")
```

#### GitHub Public User API (Permitted Official Public API)
```python
from data_sources import ModularSocialDataSource

social_source = ModularSocialDataSource()
response = social_source.query_live_source(platform="github", handle_or_term="octocat")
if response.status == "success":
    print(response.records[0].profile_url)
```

#### Documented Commercial APIs without Credentials
```python
response = social_source.query_live_source(platform="twitter", handle_or_term="northstarpay")
# Returns:
# response.status == "not_configured"
# response.error_message == "Twitter API v2 connector is not configured. Missing TWITTER_BEARER_TOKEN..."
```

---

## Synthetic Demo Dataset

The demo dataset centers on the fictional fintech brand **Northstar Pay** (`DEMO_BRAND`):

| Type | Scenario | Identifier / URL | is_demo | Expected Engine Handling |
| :--- | :--- | :--- | :--- | :--- |
| Social | Official Account | `northstarpay` (Twitter) | `True` | Excluded from findings (matches official handle) |
| Social | Typosquatting | `northstarpaay` (Twitter) | `True` | High risk (spelling variation + credential theft bio) |
| Social | Combosquatting | `northstarpay_support` (Instagram) | `True` | High risk (brand + "support" targeting user secrets) |
| Social | Legitimate Look-alike | `northstar_payment_advisory` (LinkedIn) | `True` | Low risk (B2B consultancy, legitimate entity) |
| App | Official App | `com.northstarpay.app` (Play Store) | `True` | Excluded from findings (matches official package ID) |
| App | Rogue Clone | `com.northstar.paywallet.online` (Play Store) | `True` | High risk (impersonating name, rogue developer) |
| App | Unrelated App | `com.northstarnav.compass` (App Store) | `True` | Benign / Non-fraudulent (Navigation compass) |

Loading demo data:
```python
from data_sources import get_demo_brand, get_demo_social_response, get_demo_app_response

brand = get_demo_brand()
social_demo = get_demo_social_response()
app_demo = get_demo_app_response()

assert all(r.is_demo for r in social_demo.records)
assert all(r.is_demo for r in app_demo.records)
```
