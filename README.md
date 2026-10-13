# SOC 360 — Digital Risk Protection Platform

[![Backend Tests](https://img.shields.io/badge/backend%20tests-87%20passed-success)](backend/tests/)
[![Frontend Build](https://img.shields.io/badge/frontend%20build-passing-brightgreen)](frontend/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-3ECF8E.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **SOC 360** is an enterprise-grade Digital Risk Protection (DRP) and brand defense platform engineered for Security Operations Centers (SOCs), Brand Protection units, and legal teams to detect, score, and neutralize brand impersonation across social networks and mobile application marketplaces.

---

![SOC 360 Executive Risk Dashboard](docs/screenshots/dashboard.png)

---

## 1. Project Overview & Core Mission

### The Problem
Organizations face unprecedented surges in digital fraud:
- Threat actors spawn counterfeit accounts across **X, Telegram, and Instagram** to divert customers, execute phishing schemes, and harvest credentials.
- Malicious and unauthorized APK packages mimic corporate apps on **unofficial stores and third-party mirrors**, installing spyware or financial trojans.
- Traditional brand defense relies on manual URL hunting, slow spreadsheets, and opaque "black-box" vendors lacking auditable evidence.

### The Solution: SOC 360
SOC 360 delivers an automated, **brand-first dual-mode surveillance architecture**:
- **Brand-First Discovery**: Enter only a brand name or corporate domain. The engine coordinates automated discovery across multiple channels without requiring analysts to find or input malicious URLs manually.
- **Explainable Review Priority**: Replaces subjective threat claims with deterministic, transparent 0–100 risk scores combining lexical matching (RapidFuzz), perceptual trademark logo hashing (ImageHash), and official publisher verification.
- **Dual-Mode Privacy & Multi-Tenancy**:
  - **Guest Mode**: 100% in-memory scans (`POST /scan/guest`) with zero database writes, instant threat graphs, and PDF/CSV export.
  - **Account Mode**: Continuous multi-brand registration, user isolation with PostgreSQL Row Level Security (RLS), and analyst triage lifecycle management.

---

## 2. Platform Visual Tour

### Executive Risk Dashboard
Comprehensive situational awareness with real-time KPI metrics, threat activity timelines, risk severity donut charts, and live operational status.
![Executive Risk Dashboard](docs/screenshots/dashboard.png)

---

### Brand-First Surveillance Scan
Instant multi-vector surveillance launch requiring only the trademark or brand name. Guest privacy mode ensures zero database persistence when desired.
![Brand-First Digital Risk Scan](docs/screenshots/brand-scan.png)

---

### Scan Results & Threat Intelligence Graph
Multi-vector analysis summary displaying candidate volume breakdowns (High, Medium, Low / Benign), risk severity distribution graphs, and evidence tables with lexical match scores.
![Scan Results and Threat Intelligence Graph](docs/screenshots/scan-results.png)

---

### Social Media Impersonation Monitoring
Autonomous surveillance across social media ecosystems (Twitter/X, Telegram, Instagram) evaluating handle spoofing, typosquats, and unauthorized recovery accounts.
![Social Media Impersonation Monitoring](docs/screenshots/social-monitoring.png)

---

### Mobile Application Marketplace Discovery
Deep monitoring across app marketplaces and third-party APK distribution mirrors, identifying unauthorized developer namespaces, modified APKs, and trojanized clones.
![Mobile Application Marketplace Monitoring](docs/screenshots/app-monitoring.png)

---

### Security Findings Registry
Centralized management console with multi-attribute filtering (Protected Brand, Vector Source, Risk Severity, Review Status), search, and sorting.
![Security Findings Registry](docs/screenshots/findings-registry.png)

---

### Finding Threat Dossier & Analyst Triage
Deep-dive evidence dossiers featuring side-by-side authentic baseline comparisons, heuristic signal weightings, and analyst triage actions (`Under Review`, `Confirmed Suspicious`, `False Positive`, `Resolved`).
![Finding Threat Dossier](docs/screenshots/finding-threat-dossier.png)

---

### Public Landing Page & Guest Entry
High-impact dark-theme landing experience with glassmorphic navigation, product feature showcases, and one-click guest scan entry.
![Public Landing Page](docs/screenshots/landing-page.png)

---

## 3. Architecture & Data Flow

```
[ Public User / Guest ]                 [ Authenticated Analyst ]
         │                                         │
         ▼                                         ▼
   Landing Page                                Dashboard
         │                                         │
         ▼                                         ▼
   Brand Scan Form                           Brand Profiles
         │                                         │
         ▼                                         ▼
 POST /scan/guest                         POST /brands/{id}/scan
 (Bearer Token: None)                     (Bearer Token: Supabase JWT)
         │                                         │
         ▼                                         ▼
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│        IN-MEMORY RUNTIME        │      │       DATABASE PERSISTENCE      │
│  • Discover candidates          │      │  • Verify Brand user_id         │
│  • RapidFuzz token analysis     │      │  • Upsert candidates & findings │
│  • ImageHash perceptual hashing │      │  • Apply Row Level Security     │
│  • Zero SQL write operations    │      │  • Log audit telemetry          │
└─────────────────────────────────┘      └─────────────────────────────────┘
         │                                         │
         ▼                                         ▼
   Temporary Dossier                       Persistent Dossier
   (PDF / CSV Downloads)                   (Triage & Escalate)
```

---

## 4. Key Capabilities & Engineering Highlights

| Capability | Description |
| :--- | :--- |
| **Brand-First Surveillance** | Analysts input a brand name; SOC 360 queries connectors across social and app channels automatically. |
| **Explainable Scoring Engine** | Combines token sort/set ratio, Levenshtein distance, pHash perceptual distance, and developer validation. |
| **Dual-Mode Privacy Architecture** | Unauthenticated scans are processed strictly in-memory; authenticated scans enforce PostgreSQL RLS. |
| **Analyst Triage Lifecycle** | Transitions findings through `New`, `Under Review`, `Confirmed Suspicious`, `False Positive`, and `Resolved`. |
| **Audit-Ready Exports** | Generates client-side PDF Executive Dossiers and CSV spreadsheets with formula-injection defenses (CWE-1236). |
| **Reactive Telemetry** | Dynamic findings badge indicators in the navigation that accurately reflect open findings without stale defaults. |

---

## 5. Technology Stack

### Frontend
- **Framework**: React 19 + Vite 8
- **Icons & Visuals**: Lucide React
- **Analytics & Graphs**: Recharts
- **Design System**: Vanilla CSS with custom tokens, responsive grid layouts, and glassmorphic micro-animations
- **Auth Client**: `@supabase/supabase-js` 2.117+

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **Server**: Uvicorn ASGI
- **ORM & Database**: SQLAlchemy 2.0 with Psycopg 3 + PostgreSQL 17 (Supabase transaction pooler)
- **Validation**: Pydantic v2 Settings & Models

### Detection & Similarity Engine
- **RapidFuzz**: Token set ratio, partial ratio, Levenshtein distance
- **ImageHash**: Perceptual hashing (pHash), difference hashing (dHash)
- **Pillow**: Image normalization and visual decoding

---

## 6. Repository Structure

```
├── docs/
│   └── screenshots/                 # Application screenshots & UI tours
│       ├── dashboard.png
│       ├── brand-scan.png
│       ├── scan-results.png
│       ├── social-monitoring.png
│       ├── app-monitoring.png
│       ├── findings-registry.png
│       ├── finding-threat-dossier.png
│       └── landing-page.png
├── backend/
│   ├── app/
│   │   ├── auth.py                  # Supabase JWT token verification
│   │   ├── config.py                # Environment configuration
│   │   ├── database.py              # SQLAlchemy engine (PgBouncer compatible)
│   │   ├── detection/               # RapidFuzz & ImageHash detection logic
│   │   │   ├── detector.py          # Unified detection orchestrator
│   │   │   ├── name_matcher.py      # Lexical similarity & typosquats
│   │   │   ├── logo_matcher.py      # Perceptual image hashing
│   │   │   └── explanations.py      # Explainable evidence synthesizer
│   │   ├── models/                  # SQLAlchemy ORM models (with user_id)
│   │   ├── routes/                  # API endpoints (brands, scans, findings, stats)
│   │   ├── schemas/                 # Pydantic validation schemas
│   │   └── services/                # Business logic & scan orchestration
│   ├── sql/
│   │   ├── schema.sql               # Base database schema
│   │   └── 002_multi_user_rls.sql   # Multi-user Row Level Security migration
│   ├── tests/                       # 87 automated test cases (100% passing)
│   └── requirements.txt             # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/              # Header, Sidebar, Badges, Modals, DataTable
│   │   ├── context/AuthContext.jsx  # Session tracking & in-memory guest state
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx      # Public onboarding landing page
│   │   │   ├── BrandScan.jsx        # Unified brand scan form
│   │   │   ├── ScanResults.jsx      # Threat intelligence graph & candidate table
│   │   │   ├── Dashboard.jsx        # Executive telemetry dashboard
│   │   │   ├── BrandProfiles.jsx    # Monitored brand management
│   │   │   ├── SocialMonitoring.jsx # Social surveillance surface
│   │   │   ├── AppMonitoring.jsx    # Mobile app surveillance surface
│   │   │   ├── Findings.jsx         # Security findings registry
│   │   │   ├── FindingDetails.jsx   # Detailed evidence threat dossier
│   │   │   ├── Settings.jsx         # Profile & account settings
│   │   │   ├── Login.jsx            # Account sign-in
│   │   │   ├── Register.jsx         # Account sign-up
│   │   │   └── ResetPassword.jsx    # Password recovery
│   │   ├── services/
│   │   │   ├── api.js               # Centralized API service with auth injection
│   │   │   └── supabase.js          # Supabase client & fallback handlers
│   │   └── utils/reports.js         # PDF & CSV formula-safe report generator
│   └── package.json                 # Node dependencies
└── README.md
```

---

## 7. Local Setup & Installation

### Prerequisites
- Node.js 18+ and `pnpm` (or `npm`)
- Python 3.11+
- Virtual environment tool (`venv`)

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` (refer to `backend/.env.example`):
```env
ENVIRONMENT=development
PORT=8000
DEBUG=true

# Database (Supabase PostgreSQL transaction pooler or SQLite)
DATABASE_URL=postgresql://postgres.xxx:xxx@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require

# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key

# Allowed CORS origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://soc360.onrender.com,https://soc360.vercel.app
```

Run database migrations:
```bash
# Execute backend/sql/schema.sql and backend/sql/002_multi_user_rls.sql in Supabase SQL Editor
```

Start the FastAPI backend:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd ../frontend
pnpm install
```

Create `frontend/.env` (refer to `frontend/.env.example`):
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Start the Vite development server:
```bash
pnpm run dev
```

- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

---

## 8. Automated Testing

### Backend Test Suite (pytest)
```bash
python -m pytest backend/tests/ -v
```
**Results: 87 passed (100% pass rate)**
- `test_guest_and_multi_user.py`: In-memory guest scan execution with 0 database writes, and User A vs User B data isolation.
- `test_brand_first_scan.py`: Brand-first scan orchestration and finding deduplication.
- `test_name_matcher.py` & `test_logo_matcher.py`: RapidFuzz & ImageHash scoring boundary validation.
- `test_explanations.py`: Transparent review priority evidence generation.
- `test_evidence_based_scanning.py`: Evidence signals and publisher verification.
- `test_brands.py`, `test_findings.py`, `test_scans.py`: Full REST API CRUD validation.

### Frontend Quality Checks
```bash
cd frontend
npm run build      # Clean production build with 0 errors
```

---

## 9. Security & Privacy Guarantees

- **Zero-Storage Guest Privacy**: Unauthenticated scans process strictly in memory and do not write rows to database tables.
- **PostgreSQL Row Level Security (RLS)**: Enforces strict data ownership where users only read and mutate records matching `auth.uid() = user_id`.
- **Client Secret Isolation**: Service-role keys and database credentials are never exposed to browser bundles.
- **Formula Injection Mitigation (CWE-1236)**: CSV exports automatically sanitize cells starting with `=`, `+`, `-`, or `@`.

---

## 10. License

Built for the Digital Risk Protection Hackathon 2026.  
Licensed under the [MIT License](LICENSE).
