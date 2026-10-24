# SOC 360 — Digital Risk Protection & Brand Defense Platform

[![Backend Tests](https://img.shields.io/badge/backend%20tests-92%20passed-success)](backend/tests/)
[![Frontend Build](https://img.shields.io/badge/frontend%20build-passing-brightgreen)](frontend/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://react.dev/)
[![Threat Intel](https://img.shields.io/badge/Threat%20Intel-VirusTotal%20%7C%20urlscan.io-blue.svg)](https://virustotal.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-3ECF8E.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **SOC 360** is an enterprise-grade Digital Risk Protection (DRP) and brand impersonation defense platform engineered for Security Operations Centers (SOCs), Brand Protection units, and legal teams to detect, score, investigate, and neutralize trademark impersonation across social networks, mobile app marketplaces, and phishing infrastructure.

---

![SOC 360 Executive Risk Dashboard](docs/screenshots/dashboard.png)

---

## 1. Project Overview & Core Mission

### The Problem
Organizations face unprecedented surges in automated digital fraud:
- Threat actors spawn counterfeit accounts across **X, Telegram, and Instagram** to divert customers, execute phishing schemes, and harvest credentials.
- Malicious and unauthorized APK packages mimic corporate apps on **unofficial stores and third-party mirrors**, installing spyware or financial trojans.
- High-risk phishing domains and typosquats mimic brand domains to deceive consumers.
- Traditional brand defense relies on manual URL hunting, slow spreadsheets, and opaque "black-box" vendors lacking auditable evidence.

### The Solution: SOC 360
SOC 360 delivers an automated, **evidence-backed, brand-first digital risk defense platform**:
- **Brand-First Automated Discovery**: Enter only a brand name or corporate domain. The engine coordinates automated discovery across multiple channels without requiring analysts to find or input malicious URLs manually.
- **Explainable Multi-Vector Scoring**: Replaces subjective threat claims with deterministic, transparent 0–100 risk scores combining lexical matching (RapidFuzz), perceptual trademark logo hashing (ImageHash), official publisher verification, and live threat intelligence (VirusTotal & urlscan.io).
- **Prioritized Investigation Queue**: Automatically ranks high-risk impersonations at the top of the queue so analysts can triage critical threats first.
- **Audit-Ready Investigation History**: Complete timeline tracking with analyst names, status updates (`New`, `Under Review`, `Confirmed`, `False Positive`, `Closed`), and investigative notes.
- **Evidence-Based Takedown Drafting**: One-click generation of platform-compliant takedown notices (Google Play, Apple App Store, Twitter/X, Meta, Telegram, ICANN) citing objective evidence.
- **Deduplicated High-Risk Alerts**: Real-time notifications for critical impersonations that notify analysts once without duplicate alert spam.
- **Dual-Mode Privacy & Multi-Tenancy**:
  - **Guest Mode**: 100% in-memory scans (`POST /scan/guest`) with zero database writes, instant threat graphs, and PDF/CSV export.
  - **Account Mode**: Continuous multi-brand registration, user isolation with PostgreSQL Row Level Security (RLS), and analyst triage lifecycle management.

---

## 2. Platform Visual Tour & Screenshots

### Executive Risk Dashboard
Comprehensive situational awareness with real-time KPI metrics, threat activity timelines, risk severity donut charts, and live operational status.
![Executive Risk Dashboard](docs/screenshots/dashboard.png)

---

### Brand-First Monitoring Workflow
Automated four-stage reconnaissance lifecycle: Brand Registration ➔ Multi-Vector Auto-Scanning ➔ Algorithmic Similarity Analysis ➔ Triage & Takedowns.
![Brand-First Monitoring Workflow](docs/screenshots/workflow-mindmap.png)

---

### Security Findings Registry & Prioritized Investigation Queue
Centralized analyst triage queue prioritizing high-risk impersonations first. Features quick-triage tabs (`All`, `High Risk`, `Needs Review`, `Confirmed`, `False Positive`), multi-attribute filtering (Brand, Source Vector, Severity, Status), search, and sorting.
![Security Findings Registry](docs/screenshots/findings-registry.png)

---

### Finding Threat Dossier & Side-by-Side Asset Analysis
Deep-dive evidence dossiers featuring side-by-side authentic baseline comparisons, perceptual logo hashing, lexical string similarity, unauthorized developer warnings, live threat intelligence verification, and immutable investigation audit trails.
![Finding Threat Dossier](docs/screenshots/finding-threat-dossier.png)

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
Autonomous surveillance across social media ecosystems (Twitter/X, Telegram, GitHub, Web Search) evaluating handle spoofing, typosquats, and unauthorized recovery accounts.
![Social Media Impersonation Monitoring](docs/screenshots/social-monitoring.png)

---

### Mobile Application Marketplace Discovery
Deep monitoring across app marketplaces and third-party APK distribution mirrors, identifying unauthorized developer namespaces, modified APKs, and trojanized clones.
![Mobile Application Marketplace Monitoring](docs/screenshots/app-monitoring.png)

---

### Public Landing Page
High-impact dark-theme landing experience with glassmorphic navigation, dynamic floating brand shields, responsive scroll stack cards, and one-click guest scan entry.
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
│  • Multi-source discovery       │      │  • Verify Brand user_id         │
│  • RapidFuzz token analysis     │      │  • Upsert candidates & findings │
│  • ImageHash perceptual hashing │      │  • Apply Row Level Security     │
│  • VirusTotal & urlscan lookup  │      │  • Append investigation history │
│  • Zero SQL write operations    │      │  • Log audit telemetry          │
└─────────────────────────────────┘      └─────────────────────────────────┘
         │                                         │
         ▼                                         ▼
   Temporary Dossier                       Prioritized Investigation Queue
   (PDF / CSV Downloads)                   (Triage, Takedown & Alerts)
```

---

## 4. Key Capabilities & Engineering Highlights

| Capability | Description |
| :--- | :--- |
| **Brand-First Surveillance** | Analysts input only a brand name; SOC 360 discovers candidates across App Store, Google Play, GitHub, Telegram, Twitter, and Web automatically. |
| **Explainable Scoring Engine** | Combines RapidFuzz token set ratio, Levenshtein distance, pHash perceptual distance, developer discrepancy, and threat intelligence. |
| **Threat Intelligence Connectors** | Native integration with **VirusTotal** (multi-engine malware detection & domain reputation) and **urlscan.io** (live phishing DOM analysis & screenshots). |
| **Prioritized Investigation Queue** | High-risk impersonations are prioritized at the top of the queue with one-click filters for `High Risk`, `Needs Review`, and `Confirmed`. |
| **Takedown Report Drafting** | Pre-fills evidence-based takedown requests tailored for Google Play, Apple App Store, Twitter/X, Meta, Telegram, and ICANN abuse desks. |
| **Deduplicated High-Risk Alerts** | Notifies analysts in real-time when critical threats emerge, using deduplicated registry storage to eliminate duplicate alerts. |
| **Investigation History Audit Trail** | Every status update and note is permanently recorded with timestamps, previous/new status, analyst name, and rationale. |
| **Dual-Mode Privacy Architecture** | Unauthenticated scans are processed strictly in-memory; authenticated scans enforce PostgreSQL Row Level Security (RLS). |
| **Audit-Ready Exports** | Generates client-side PDF Executive Dossiers and CSV spreadsheets with formula-injection defenses (CWE-1236). |

---

## 5. Technology Stack

### Frontend
- **Framework**: React 19 + Vite 8
- **Icons & Visuals**: Lucide React
- **Analytics & Graphs**: Recharts
- **Design System**: Vanilla CSS design system with custom tokens, glassmorphism, floating shield micro-animations, and responsive ScrollStack
- **Auth Client**: `@supabase/supabase-js` 2.117+

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **Server**: Uvicorn ASGI
- **ORM & Database**: SQLAlchemy 2.0 with Psycopg 3 + PostgreSQL 17 (Supabase transaction pooler) / SQLite local fallback
- **Validation**: Pydantic v2 Settings & Models

### Detection, Similarity & Threat Intel
- **RapidFuzz**: Token set ratio, partial ratio, token sort ratio, Levenshtein distance
- **ImageHash**: Perceptual hashing (pHash), difference hashing (dHash)
- **Pillow**: Image normalization and visual decoding
- **VirusTotal v3 API**: Domain reputation analysis and multi-engine antivirus validation
- **urlscan.io API**: Live web scanning, DOM inspection, hosting telemetry, and screenshot capture

---

## 6. Repository Structure

```
├── docs/
│   ├── screenshots/                 # Application screenshots & UI tours
│   │   ├── dashboard.png
│   │   ├── workflow-mindmap.png
│   │   ├── findings-registry.png
│   │   ├── finding-threat-dossier.png
│   │   ├── brand-scan.png
│   │   ├── scan-results.png
│   │   ├── social-monitoring.png
│   │   ├── app-monitoring.png
│   │   └── landing-page.png
│   ├── architecture.md              # Detailed architecture documentation
│   ├── data_sources.md              # External connectors specification
│   ├── deployment.md                # Deployment and hosting guides
│   └── demo_checklist.md            # Live demonstration script
├── backend/
│   ├── app/
│   │   ├── auth.py                  # Supabase JWT token verification
│   │   ├── config.py                # Environment configuration & settings
│   │   ├── database.py              # SQLAlchemy engine (PgBouncer compatible)
│   │   ├── detection/               # RapidFuzz & ImageHash detection logic
│   │   │   ├── detector.py          # Unified detection orchestrator
│   │   │   ├── name_matcher.py      # Lexical similarity & typosquats
│   │   │   ├── logo_matcher.py      # Perceptual image hashing
│   │   │   └── explanations.py      # Explainable evidence synthesizer
│   │   ├── connectors/              # External surveillance & threat intel
│   │   │   ├── base.py              # Base connector interface
│   │   │   ├── app_store.py         # Apple App Store & Google Play connectors
│   │   │   ├── social.py            # GitHub, Telegram, Twitter, WebSearch
│   │   │   ├── security_intel.py    # VirusTotal & urlscan.io connectors
│   │   │   └── manager.py           # Multi-source candidate discovery orchestrator
│   │   ├── models/                  # SQLAlchemy ORM models (with user_id)
│   │   ├── routes/                  # API endpoints (brands, scans, findings, stats)
│   │   ├── schemas/                 # Pydantic validation schemas
│   │   └── services/                # Business logic & scan orchestration
│   ├── sql/
│   │   ├── schema.sql               # Base database schema
│   │   └── 002_multi_user_rls.sql   # Multi-user Row Level Security migration
│   ├── tests/                       # 92 automated test cases (100% passing)
│   └── requirements.txt             # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/              # Header, TakedownModal, NotificationDrawer, Badges
│   │   ├── context/AuthContext.jsx  # Session tracking & in-memory guest state
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx      # Dark-mode landing page with floating shields
│   │   │   ├── BrandScan.jsx        # Unified brand scan form
│   │   │   ├── ScanResults.jsx      # Threat intelligence graph & candidate table
│   │   │   ├── Dashboard.jsx        # Executive telemetry dashboard
│   │   │   ├── BrandProfiles.jsx    # Monitored brand management
│   │   │   ├── SocialMonitoring.jsx # Social surveillance surface
│   │   │   ├── AppMonitoring.jsx    # Mobile app surveillance surface
│   │   │   ├── Findings.jsx         # Prioritized investigation queue
│   │   │   ├── FindingDetails.jsx   # Detailed evidence threat dossier & audit trail
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

# Live External Surveillance & Threat Intelligence Keys (Optional for live scanning)
VIRUSTOTAL_API_KEY=your_virustotal_api_key_here
URLSCAN_API_KEY=your_urlscan_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
SERPER_API_KEY=your_serper_api_key_here
SERPAPI_API_KEY=your_serpapi_key_here
GITHUB_TOKEN=your_github_token_here
```

Start the FastAPI backend:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd ../frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Start the Vite development server:
```bash
npm run dev
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

**Results: 92 passed (100% pass rate)**
- `test_threat_intel_connectors.py`: VirusTotal & urlscan.io threat intelligence discovery, scoring, and status reporting.
- `test_guest_and_multi_user.py`: In-memory guest scan execution with 0 database writes, and User A vs User B data isolation.
- `test_brand_first_scan.py`: Brand-first scan orchestration and finding deduplication.
- `test_name_matcher.py` & `test_logo_matcher.py`: RapidFuzz & ImageHash scoring boundary validation.
- `test_explanations.py`: Transparent review priority evidence generation.
- `test_evidence_based_scanning.py`: Evidence signals and publisher verification.
- `test_brands.py`, `test_findings.py`, `test_scans.py`: Full REST API CRUD, audit trail history, and status transitions.

### Frontend Quality Checks
```bash
cd frontend
npm run build      # Clean production bundle with 0 errors
```

---

## 9. Security & Privacy Guarantees

- **Zero-Storage Guest Privacy**: Unauthenticated scans process strictly in memory and do not write rows to database tables.
- **PostgreSQL Row Level Security (RLS)**: Enforces strict data ownership where users only read and mutate records matching `auth.uid() = user_id`.
- **Client Secret Isolation**: Service-role keys, database passwords, and third-party threat intel keys are never exposed to browser bundles.
- **Formula Injection Mitigation (CWE-1236)**: CSV exports automatically sanitize cells starting with `=`, `+`, `-`, or `@`.

---

## 10. License

Built for the Digital Risk Protection Hackathon 2026.  
Licensed under the [MIT License](LICENSE).
