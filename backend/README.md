# SOC 360 - Digital Risk Protection Platform Backend

The SOC 360 backend is a high-performance Digital Risk Protection Platform (DRPP) service built with **Python**, **FastAPI**, **SQLAlchemy**, and **Supabase PostgreSQL**.

It ingests brand profiles, monitors candidate social profiles and mobile applications, coordinates detection engine analysis to detect rogue accounts and impersonation risks, persists structured risk findings, and provides clean RESTful APIs for the React frontend.

---

## Technology Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) 0.115+
- **Server**: [Uvicorn](https://www.uvicorn.org/)
- **Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- **Database**: [Supabase PostgreSQL](https://supabase.com/) (with [SQLAlchemy 2.0](https://www.sqlalchemy.org/) and modern [psycopg 3](https://www.psycopg.org/psycopg3/))
- **Testing**: [pytest](https://docs.pytest.org/), [pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio), and HTTPX test client

---

## Directory Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application, CORS middleware, error handlers
│   ├── config.py                # Environment configuration using pydantic-settings
│   ├── database.py              # SQLAlchemy engine, session maker, get_db dependency
│   ├── detection_adapter.py     # Detection engine interface and temporary adapter
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── brand.py             # Brand entity
│   │   ├── candidate.py         # Candidate social profile or mobile application
│   │   ├── scan.py              # Scan execution run record
│   │   └── finding.py           # Evaluated risk finding record
│   ├── schemas/                 # Pydantic request and response schemas
│   │   ├── __init__.py
│   │   ├── common.py            # Enums (SourceType, RiskLevel, ReviewStatus), PaginatedResponse
│   │   ├── brand.py             # BrandCreate, BrandUpdate, BrandResponse
│   │   ├── candidate.py         # SocialCandidateInput, AppCandidateInput, CandidateResponse
│   │   ├── scan.py              # SocialScanRequest, AppScanRequest, ScanResultResponse
│   │   └── finding.py           # FindingResponse, FindingStatusUpdate
│   ├── routes/                  # FastAPI router definitions
│   │   ├── __init__.py
│   │   ├── health.py            # GET /health
│   │   ├── brands.py            # /brands CRUD endpoints
│   │   ├── scans.py             # /scan/social, /scan/apps, /scans listing
│   │   └── findings.py          # /findings filtering, pagination, and status PATCH
│   └── services/                # Business logic and database operations
│       ├── __init__.py
│       ├── brand_service.py     # Brand registration, retrieval, update, deletion
│       ├── scan_service.py      # Scan lifecycle execution, candidate and finding persistence
│       └── finding_service.py   # Finding queries, filtering, sorting, review status lifecycle
├── sql/
│   └── schema.sql               # Supabase PostgreSQL DDL (tables, indexes, triggers)
├── tests/                       # Complete pytest suite
│   ├── conftest.py              # Database fixtures & isolated test client
│   ├── test_health.py           # Health endpoint tests
│   ├── test_brands.py           # Brand CRUD and validation tests
│   ├── test_scans.py            # Social and app scan lifecycle tests
│   ├── test_findings.py         # Filtering, pagination, sorting, status update tests
│   └── test_detection_adapter.py # Detection adapter scoring tests
├── requirements.txt             # Production and test Python dependencies
├── .env.example                 # Environment variables template
└── README.md                    # Project documentation
```

---

## Database Configuration (Supabase PostgreSQL)

### 1. Execute SQL Schema

In your Supabase project dashboard:
1. Open the **SQL Editor**.
2. Paste the contents of [`backend/sql/schema.sql`](file:///c:/Users/anjur/Desktop/digital/Digital-Risk-Management/backend/sql/schema.sql).
3. Run the query. This creates:
   - `brands`, `candidates`, `scans`, `findings` tables
   - Foreign key constraints with cascading deletes
   - Performance indexes on UUID foreign keys, risk scores, review statuses, and creation timestamps
   - Automated triggers for `updated_at`

### 2. Connection String

Copy your Supabase database connection string from **Project Settings > Database > Connection string > URI**:

```text
DATABASE_URL=postgresql://postgres.[project-ref]:[db-password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

*Note: The backend automatically converts standard `postgres://` or `postgresql://` connection strings to `postgresql+psycopg://` so modern psycopg 3 connects natively.*

---

## Environment Variables

Copy `.env.example` to `.env` in the `backend/` directory:

| Variable | Description | Default |
|---|---|---|
| `ENVIRONMENT` | Environment name (`development`, `production`) | `development` |
| `PORT` | Listening port for Uvicorn | `8000` |
| `DEBUG` | Enable verbose debugging | `true` |
| `DATABASE_URL` | Supabase PostgreSQL or local SQLite URL | `sqlite:///./soc360.db` |
| `SUPABASE_URL` | Supabase API URL (server-side only) | `""` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side only) | `""` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:3000,http://localhost:5173,https://soc360.onrender.com,https://soc360.vercel.app` |
| `DETECTION_ENGINE_MODE` | Detection engine driver mode | `internal_adapter` |

> [!CAUTION]
> Never commit `.env` or service-role keys into Git. Never expose Supabase database passwords or service-role keys to frontend client code.

---

## Local Setup & Development

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Git

### 2. Setup Virtual Environment

```bash
cd backend
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Linux / macOS:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger OpenAPI Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc Documentation: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

## Running Automated Tests

Run the full pytest test suite from the `backend/` directory:

```bash
pytest tests -v
```

The test suite runs against an isolated in-memory SQLite database, exercising 31 automated tests covering:
- Health and status endpoints
- Brand registration, listing, updating, deletion, and validation failures
- Social and app candidate ingestion
- Scan execution lifecycle, count tracking, and failure handling
- Detector failure recovery (marking scan as `failed` rather than `completed`)
- Findings multi-criteria filtering, pagination, and sorting
- Review status updates across allowed lifecycle statuses

---

## Frontend Integration API Contract

All endpoints return and accept standard JSON.

### 1. Brands API

#### Register Brand: `POST /brands`
```json
{
  "name": "Acme Corp",
  "website": "https://acme.example.com",
  "logo_url": "https://acme.example.com/logo.png",
  "official_social_urls": [
    "https://twitter.com/acmecorp",
    "https://linkedin.com/company/acmecorp"
  ],
  "official_apps": [
    "com.acmecorp.app"
  ],
  "official_developers": [
    "Acme Corporation"
  ],
  "aliases": [
    "Acme",
    "Acme Global"
  ]
}
```

#### List Brands: `GET /brands`
Returns an array of registered brand objects.

#### Get Brand: `GET /brands/{id}`
Returns brand details by UUID.

#### Update Brand: `PUT /brands/{id}`
Accepts partial or complete brand updates.

#### Delete Brand: `DELETE /brands/{id}`
Removes the brand and cascades deletion of candidate profiles, scans, and findings.

---

### 2. Scanning API

#### Run Social Scan: `POST /scan/social`
```json
{
  "brand_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "candidates": [
    {
      "display_name": "Acme Support Free Rewards",
      "username": "acme_giveaway",
      "profile_url": "https://twitter.com/acme_giveaway",
      "bio": "Official Acme Customer Reward Portal. Login here to claim.",
      "image_url": "https://example.com/logo.png",
      "is_demo": true
    }
  ],
  "is_demo": true
}
```

#### Run Mobile App Scan: `POST /scan/apps`
```json
{
  "brand_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "candidates": [
    {
      "app_name": "Acme Quick Wallet",
      "store_url": "https://apk-mirror.com/acme-wallet",
      "package_identifier": "com.unverified.acme.wallet",
      "developer_name": "Rogue Developer",
      "description": "Fast wallet transactions for Acme Corp users",
      "icon_url": "https://example.com/icon.png",
      "is_demo": true
    }
  ],
  "is_demo": true
}
```

#### Response Structure:
```json
{
  "scan": {
    "id": "c1f7a0b3-e29b-4682-849a-e8f08149e9d1",
    "brand_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "source_type": "social",
    "status": "completed",
    "started_at": "2026-10-12T08:15:00Z",
    "completed_at": "2026-10-12T08:15:01Z",
    "candidates_checked": 1,
    "findings_created": 1,
    "error_message": null,
    "is_demo": true
  },
  "findings": [
    {
      "id": "e6a14705-0e31-4148-ae8d-71b55979fdbb",
      "brand_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "candidate_id": "b3e0c704-5183-4a16-928d-905c1d68367a",
      "scan_id": "c1f7a0b3-e29b-4682-849a-e8f08149e9d1",
      "source_type": "social",
      "risk_score": 95,
      "risk_level": "critical",
      "evidence": {
        "name_impersonation": true,
        "handle_impersonation": true,
        "suspicious_keywords": ["support", "rewards", "login"],
        "is_temporary_adapter": true
      },
      "explanation": "Critical risk detected: High-confidence brand impersonation targeting 'Acme Corp'. Potential phishing or rogue profile.",
      "review_status": "New",
      "is_demo": true,
      "created_at": "2026-10-12T08:15:01Z",
      "updated_at": "2026-10-12T08:15:01Z"
    }
  ]
}
```

---

### 3. Findings API

#### List Findings: `GET /findings`
Query parameters:
- `brand_id`: UUID
- `source_type`: `social` or `app`
- `risk_level`: `low`, `medium`, `high`, `critical`
- `review_status`: `New`, `Under Review`, `Confirmed Suspicious`, `False Positive`, `Resolved`
- `sort_by`: `created_at`, `risk_score`, `updated_at` (default `created_at`)
- `sort_dir`: `asc`, `desc` (default `desc`)
- `page`: integer (default `1`)
- `page_size`: integer (default `20`, max `100`)

Response format:
```json
{
  "items": [ ... ],
  "total": 45,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

#### Get Finding by ID: `GET /findings/{finding_id}`
Returns complete finding details including embedded `candidate` profile details.

#### Update Review Status: `PATCH /findings/{finding_id}/status`
```json
{
  "review_status": "Confirmed Suspicious"
}
```
Allowed values:
- `"New"`
- `"Under Review"`
- `"Confirmed Suspicious"`
- `"False Positive"`
- `"Resolved"`

*(Note: Review status labels represent analyst triage states, not automatic legal determinations.)*

---

## Detection Developer Contract (`feature/detection`)

The backend coordinates with the detection developer via [`app/detection_adapter.py`](file:///c:/Users/anjur/Desktop/digital/Digital-Risk-Management/backend/app/detection_adapter.py).

### Expected Interface

The detection engine should implement `BaseDetectionEngine`:

```python
from app.detection_adapter import BaseDetectionEngine, DetectionInput, DetectionResult

class ProductionDetectionEngine(BaseDetectionEngine):
    def analyze(self, data: DetectionInput) -> DetectionResult:
        # data contains:
        #   data.brand_name, data.brand_website, data.official_social_urls,
        #   data.official_apps, data.official_developers, data.aliases, data.source_type
        #   data.candidate_name, data.username, data.source_url, data.developer_name,
        #   data.description, data.image_url, data.package_identifier, data.is_demo

        return DetectionResult(
            risk_score=85,                                  # int: 0-100
            risk_level="critical",                          # 'low' | 'medium' | 'high' | 'critical'
            evidence={"similarity_index": 0.94},            # dict
            explanation="Detailed reason for detection...", # str
            review_recommendation="Escalate",               # 'Review' | 'Escalate' | 'Ignore'
            is_temporary_adapter=False,
            engine_name="ai_detection_engine_v2",
        )
```

To register the production detection engine when ready, call:
```python
from app.detection_adapter import set_detection_engine
set_detection_engine(ProductionDetectionEngine())
```

---

## Render Deployment Instructions

### 1. Render Web Service Setup
1. Create a new **Web Service** on [Render](https://dashboard.render.com/).
2. Connect your Git repository: `Digital-Risk-Management`.
3. Set the **Branch** to: `feature/backend` (or `main` when merged).
4. Set the **Root Directory** to: `backend`.
5. Set the **Runtime** to: `Python 3`.

### 2. Build and Start Commands
- **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

### 3. Environment Variables in Render Dashboard
Add the following in the Render Environment Variables tab:
- `ENVIRONMENT`: `production`
- `DATABASE_URL`: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`
- `CORS_ORIGINS`: `https://your-frontend.vercel.app,https://your-frontend.onrender.com`
- `DEBUG`: `false`

### 4. Health Check
- Set **Health Check Path** in Render to `/health`.
Render will automatically monitor this path and perform zero-downtime rolling deploys.
