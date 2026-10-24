# SOC 360 - Data Sources Research & Connector Specification

This document provides a comprehensive analysis of external data sources for the **SOC 360 Digital Risk Protection Platform**. It evaluates official APIs, authentication models, pricing, rate limits, legal/ethical restrictions, and explains why SOC 360 enforces a strict fallback model utilizing permitted APIs, user-submitted candidate records, and labelled synthetic demo data.

---

## Executive Summary & Core Rules

1. **No Unauthorized Scraping**: Social networks (X, Instagram, LinkedIn, TikTok) and application stores (Google Play) strictly forbid automated scraping in their Terms of Service and deploy bot mitigation defenses (Cloudflare, reCAPTCHA, Akamai, IP reputation blocks). Unauthorized scraping introduces severe legal risk (CFAA, breach of contract) and fragile pipelines.
2. **Transparent Connector States**: SOC 360 connectors never fake or simulate live external network calls. If an API key is missing or an endpoint requires paid commercial access, the connector explicitly reports `DataSourceStatus.NOT_CONFIGURED` with actionable instructions.
3. **Explicit Synthetic Labelling**: Synthetic demo records are tagged with `is_demo = True` across every schema layer (`CandidateProfile`, `CandidateApp`, `DataSourceResponse`, `RiskFinding`). Synthetic data is never represented as live findings.
4. **Fallback & Ingestion Strategy**: In the absence of multimillion-dollar enterprise feeds, SOC 360 relies on:
   - User-submitted suspect profile and application URLs (with automatic platform and identifier extraction).
   - Manually entered candidate metadata by security analysts.
   - Permitted, official public APIs (e.g., Apple iTunes Search API, GitHub Public User API).
   - Realistic synthetic demo datasets (Northstar Pay).

---

## Detailed Data Source Feasibility Matrix

| Data Source | Official API | Auth Required | Rate Limits | Approval / Cost | Fields Provided | Feasibility in SOC 360 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **X / Twitter** | X API v2 (`/2/users/by`, `/2/tweets/search`) | OAuth 2.0 Bearer Token | Basic: 100 req/24h per endpoint; 10k tweets/mo | Paid: $100/mo (Basic), $5,000/mo (Pro). Requires Developer App Review. | `id`, `name`, `username`, `description`, `profile_image_url`, `verified`, `created_at`, `public_metrics` | **Documented Connector**: Checks `TWITTER_BEARER_TOKEN`. Returns `NOT_CONFIGURED` if unconfigured. Fallback to URL ingestion. |
| **Meta / Instagram** | Instagram Graph API (Business Discovery) | Facebook User / Page Access Token | 200 calls/hour per user bucket | Free, but requires Meta App Review, Business Verification, and connected Professional Account. | `id`, `username`, `name`, `biography`, `profile_picture_url`, `followers_count`, `media_count` | **Documented Connector**: Checks `INSTAGRAM_ACCESS_TOKEN`. Returns `NOT_CONFIGURED` if unconfigured. |
| **LinkedIn** | Community Management API | OAuth 2.0 User Token | Tier-dependent (Strict daily limits) | Restricted to approved LinkedIn Marketing/Talent Partners. Individual developers cannot query arbitrary profiles. | `vanityName`, `localizedName`, `description`, `logo`, `organizationType` | **Not feasible for open scanning**: Requires manual URL ingestion or analyst input. |
| **Apple App Store** | iTunes Search API (`itunes.apple.com/search`) | None (Unauthenticated) | ~20 calls per minute fair use | Publicly accessible. No approval, contract, or payment needed. | `trackName`, `bundleId`, `artistName`, `trackViewUrl`, `artworkUrl512`, `description`, `version`, `averageUserRating` | **Active Live Connector**: Fully implemented and enabled out of the box in `ModularAppDataSource`. |
| **Google Play Store** | Google Play Developer API | Google Cloud Service Account OAuth | Quotas per project | Only provides management of apps *owned* by the authenticated account. **No public search API exists**. | App metadata for developer's own packages only. | **No Public Search API**: Scraping prohibited by ToS §3.3. Connector accepts user-submitted URLs (`?id=pkg`) or commercial feeds. |
| **GitHub** | GitHub REST API v3 (`api.github.com/users`) | None (Optional `GITHUB_TOKEN`) | 60 req/hr unauth; 5,000 req/hr auth | Publicly permitted for user and org lookups. | `login`, `name`, `html_url`, `avatar_url`, `bio`, `company`, `blog`, `public_repos`, `followers` | **Active Live Connector**: Fully implemented and enabled for developer/brand impersonation lookups. |

---

## Deep Dive: Platform Analysis

### 1. X (formerly Twitter) API v2
- **Official Documentation**: [X Developer Platform - User Lookup](https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference)
- **Authentication**: OAuth 2.0 Bearer Token (Application-Only) or OAuth 1.0a User Context. Pass via `Authorization: Bearer <token>`.
- **Pricing & Tier Restrictions**:
  - *Free Tier*: Write-only access (posting tweets). Read/search endpoints return HTTP 403 Forbidden.
  - *Basic Tier ($100/month)*: 10,000 read tweets/month limit across all projects. User lookup allows 100 requests per 24-hour window per user.
  - *Pro Tier ($5,000/month)*: 1,000,000 read tweets/month, full search archive access.
- **Data Provided**: Display name, handle, profile description, creation timestamp, verified status, follower/following counts, profile avatar URL.
- **Why Scraping is Prohibited**: Section 4.3 of the X Developer Agreement and Terms of Service expressly forbids scraping. X actively litigates scrapers and enforces IP blockades.
- **SOC 360 Implementation**: `TwitterV2SocialConnector` checks `TWITTER_BEARER_TOKEN`. If not set, it returns `DataSourceStatus.NOT_CONFIGURED` with a message instructing the user to configure the token or submit the candidate profile URL directly.

---

### 2. Meta (Instagram & Facebook Graph API)
- **Official Documentation**: [Instagram Graph API - Business Discovery](https://developers.facebook.com/docs/instagram-api/guides/business-discovery)
- **Authentication**: Requires a Long-Lived User Access Token generated via an approved Facebook Login App.
- **Prerequisites**:
  - An approved Meta Developer App.
  - Meta Business Verification (requires legal corporate entity documents).
  - Meta App Review approval for permissions `instagram_basic`, `pages_show_list`.
  - The requesting user must own an Instagram Professional (Business or Creator) Account linked to a Facebook Page.
- **Rate Limits**: 200 calls per hour per user account.
- **Data Provided**: Public profile details of other Business/Creator accounts (`username`, `name`, `biography`, `profile_picture_url`, `followers_count`). Note: Private and personal accounts cannot be discovered.
- **SOC 360 Implementation**: Documented connector. Returns `DataSourceStatus.NOT_CONFIGURED` when `INSTAGRAM_ACCESS_TOKEN` is unset. Accepts direct user URL ingestion for suspect profiles.

---

### 3. Apple App Store (iTunes Search API)
- **Official Documentation**: [iTunes Search API Guide](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html)
- **Endpoint**: `GET https://itunes.apple.com/search?term={term}&entity=software&limit={limit}`
- **Authentication**: None required.
- **Rate Limits**: Apple specifies approximately 20 calls per minute under fair use. Requests exceeding this threshold receive HTTP 429 Too Many Requests.
- **Data Provided**:
  - `trackName`: Application title.
  - `bundleId`: Canonical package identifier (e.g., `com.company.app`).
  - `artistName`: Registered developer or seller name.
  - `trackViewUrl`: Store link.
  - `artworkUrl512` / `artworkUrl100`: High-resolution application icon.
  - `description`: App store description text.
  - `version`: Latest released version string.
  - `averageUserRating`: Aggregated rating (0.0 to 5.0).
- **SOC 360 Implementation**: `AppleAppStoreSearchConnector` in `data_sources/app_source.py`. Actively queried when searching iOS application candidates. Fully tested with mocked unit tests.

---

### 4. Google Play Store
- **Official Documentation**: [Google Play Developer API](https://developers.google.com/android-publisher)
- **Key Finding**: Google does **NOT** provide a public search API for discovering arbitrary third-party applications on Google Play.
- **Authentication & Scope**: The official Developer API only manages applications that belong to the authenticated Google Play Console developer account. It cannot search or inspect rival or suspicious third-party apps.
- **Why Scraping is Prohibited**:
  - Section 3.3 of the Google Play Terms of Service explicitly forbids automated scraping or access without explicit consent.
  - Google employs advanced bot detection (reCAPTCHA, TLS fingerprinting, automated IP rate bans) on `play.google.com`.
  - Unofficial scraping libraries (such as `google-play-scraper`) frequently break when DOM structures shift and violate corporate risk compliance.
- **Commercial Feeds**: Enterprise vendors (42matters, App Annie, Sensor Tower) provide specialized aggregations under costly annual licenses ($10,000+).
- **SOC 360 Implementation**: `GooglePlayStoreConnector` documents this architectural constraint. The system facilitates immediate triage by parsing user-submitted Play Store URLs (`https://play.google.com/store/apps/details?id=<package_name>`) and extracting package IDs, developer names, and URLs cleanly into `CandidateApp` records.

---

### 5. GitHub Public User API
- **Official Documentation**: [GitHub REST API Users](https://docs.github.com/en/rest/users/users)
- **Endpoint**: `GET https://api.github.com/users/{username}`
- **Authentication**: Optional. Passing `Authorization: Bearer <GITHUB_TOKEN>` raises the rate limit from 60 requests/hour to 5,000 requests/hour.
- **Data Provided**: Login, display name, profile URL, avatar URL, bio, company affiliation, blog URL, repository counts, follower counts.
- **SOC 360 Implementation**: `GitHubPublicUserConnector` in `data_sources/social_source.py`. Enabled for developer/open-source impersonation analysis.

---

## SOC 360 Ingestion Pipeline Strategy

To maintain operational integrity without violating platform policies or relying on unstable scraping, SOC 360 utilizes a 4-tier ingestion strategy:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SOC 360 INGESTION PIPELINE                      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
    ▼                               ▼                               ▼
[Tier 1: User / Analyst]   [Tier 2: Permitted Public APIs]   [Tier 3: Synthetic Demo]
- Submit candidate profile URL   - Apple iTunes Search API         - Fictional brand:
- Submit store app URL           - GitHub Public REST API            "Northstar Pay"
- Submit manual metadata form                                      - is_demo = True
                                                                   - Illustrates typosquat,
                                                                     combosquat, clone app,
                                                                     look-alike baseline
    │                               │                               │
    └───────────────────────────────┼───────────────────────────────┘
                                    │
                                    ▼
                 [Strict Candidate Normalization Layer]
                 - Validate HTTPS URLs & domain schemes
                 - Extract handles & package IDs
                 - Guarantee is_demo flag propagation
                 - Output CandidateProfile / CandidateApp
                                    │
                                    ▼
                    [FastAPI Backend / Detection Engine]
```

### Candidate Schema Compatibility
All ingested candidates are mapped directly into Pydantic models:
- Social profiles -> `CandidateProfile`
- Store applications -> `CandidateApp`

These models expose standard attributes (`display_name`, `username`, `profile_url`, `bio`, `source_platform`, `app_name`, `package_id`, `developer_name`, `description`, `is_demo`) required by the detection engine's lexical and phonetic similarity algorithms.
