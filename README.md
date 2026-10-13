# SOC 360 — Digital Risk Protection Platform

[![Backend Tests](https://img.shields.io/badge/backend%20tests-76%20passed-success)](file:///backend/tests/)
[![Frontend Build](https://img.shields.io/badge/frontend%20build-passing-brightgreen)](file:///frontend/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-3ECF8E.svg)](https://supabase.com/)

---

## 1. Project Overview & Purpose

**SOC 360** is an enterprise-grade **Digital Risk Protection Platform (DRP)** built for high-velocity Security Operations Centers, Brand Protection units, and legal risk teams.

### The Problem
Organizations face unprecedented surges in digital impersonation across social media platforms (X, Telegram, Instagram) and mobile application marketplaces (Google Play, APK mirrors). Traditional brand protection workflows require manual candidate submission, disjointed spreadsheets, and black-box takedown tools that lack explainable evidence.

### The Solution
SOC 360 automates brand protection using a **brand-first, dual-mode surveillance architecture**:
- **Guest Mode**: Zero-persistence in-memory brand scans allowing instant threat discovery, similarity scoring, and report exports without database storage.
- **Account Mode**: Continuous asset registration, multi-user isolation with PostgreSQL Row Level Security (RLS), and persistent finding lifecycle management.

---

## 2. Key Capabilities

- **Brand-First Automated Surveillance**: Users simply register or enter a brand name. SOC 360 automatically coordinates candidate discovery across social channels and mobile application stores without requiring manual URL submission.
- **Explainable Review Priority Scoring**: Replaces subjective fraud claims with transparent, deterministic heuristic review scores (0–100) calculated from RapidFuzz token matching, perceptual visual hashing (ImageHash), developer verification, and official baseline exclusions.
- **Dual-Mode Privacy & Multi-Tenancy**:
  - *Guest Scanning*: Processed 100% in memory with zero database writes (`POST /scan/guest`).
  - *Authenticated Scanning*: Multi-user tenancy with Supabase JWT validation, `user_id` record ownership, and PostgreSQL RLS.
- **Audit-Ready Report Exports**: Instant client-side PDF Executive Threat Dossiers and CSV spreadsheets with formula-injection mitigations (CWE-1236).
- **Security Operations User Experience**: Polished cybersecurity SaaS interface with dark/light visual accents, real-time stage progression, threat severity donuts, and analyst triage lifecycle actions (`Under Review`, `Confirmed Suspicious`, `False Positive`, `Resolved`).

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
│  • Discover candidates          │      │  • Check Brand user_id          │
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

## 4. Technology Stack

- **Frontend**:
  - Framework: React 19 + Vite 8
  - Icons: Lucide React
  - Visualization: Recharts
  - Styling: Vanilla CSS Design System with responsive grid layouts
  - Auth Client: `@supabase/supabase-js` 2.117+
- **Backend**:
  - Framework: FastAPI (Python 3.12+)
  - Server: Uvicorn ASGI
  - ORM: SQLAlchemy 2.0 with Psycopg 3
  - Data Validation: Pydantic v2 Settings
- **Detection & Similarity Engine**:
  - `RapidFuzz`: Token set ratio, partial ratio, Levenshtein distance
  - `ImageHash`: Average, difference, and perceptual hashing (pHash)
  - `Pillow`: Image normalization and visual decoding
- **Database & Identity**:
  - PostgreSQL 17 on Supabase (with PgBouncer transaction pooling)
  - Supabase Auth (Email & Password JWT)

---

## 5. Repository Structure

```
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
│   ├── tests/                       # 76 automated test cases (100% passing)
│   └── requirements.txt             # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/              # Header, Sidebar, Badges, Modals
│   │   ├── context/AuthContext.jsx  # Session tracking & in-memory guest state
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx      # Public onboarding landing page
│   │   │   ├── BrandScan.jsx        # Unified brand scan form
│   │   │   ├── ScanResults.jsx      # Results first, mode choice after scan
│   │   │   ├── Dashboard.jsx        # Authenticated telemetry dashboard
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

## 6. Local Setup & Installation

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

Create `backend/.env` (see `backend/.env.example`):
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
# In the Supabase SQL editor or psql:
# Execute backend/sql/schema.sql and backend/sql/002_multi_user_rls.sql
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

Create `frontend/.env` (see `frontend/.env.example`):
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Start the Vite development server:
```bash
pnpm run dev
```

The application is now running:
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **API Swagger Docs**: `http://localhost:8000/docs`

---

## 7. Automated Testing

### Backend Tests (pytest)
Run the complete backend test suite:
```bash
python -m pytest backend/tests/ -v
```
**Results: 76 passed (100% pass rate)**
- `test_guest_and_multi_user.py`: In-memory guest scan execution with 0 database writes, and User A vs User B data isolation.
- `test_brand_first_scan.py`: Brand-first scan orchestration and finding deduplication.
- `test_name_matcher.py` & `test_logo_matcher.py`: RapidFuzz & ImageHash scoring boundary validation.
- `test_explanations.py`: Transparent review priority evidence generation.

### Frontend Quality Checks
```bash
cd frontend
pnpm exec oxlint    # 0 errors
pnpm run build      # Successful production bundle built in 2.00s
```

---

## 8. Hackathon Demonstration Walkthrough

1. **Public Landing Page**:
   - Open `http://localhost:5173/`. Unauthenticated visitors see the public landing page with product features, architecture diagrams, and legal disclaimers.
2. **Start Guest Scan**:
   - Click **"Start Monitoring"** to open `/scan`.
   - Enter brand name: `Netflix` or `Stripe`.
   - Click **"Start Monitoring"**.
   - Watch the real-time stage progression: Entity normalization $\rightarrow$ Social discovery $\rightarrow$ App store discovery $\rightarrow$ RapidFuzz & ImageHash scoring.
3. **Review Results**:
   - The `/scan-results` page renders instantly.
   - Shows total candidates analyzed, risk severity distribution, and findings.
   - A banner displays: *"Scan Complete — Choose How to Proceed"*.
4. **Export Reports**:
   - Click **"Download CSV"** to receive formula-injection sanitized spreadsheet.
   - Click **"Download PDF Dossier"** to preview and print the executive threat dossier.
5. **Account Mode & Multi-User Isolation**:
   - Click **"Create Account / Sign In"**.
   - Register or sign in with your email and password.
   - Access the authenticated `/dashboard` and `/brands` management views where assets are persisted to your specific `user_id`.

---

## 9. Security & Privacy Guarantees

- **Guest Data Privacy**: Unauthenticated guest scans do not insert rows into `brands`, `candidates`, `scans`, or `findings` tables. Temporary data lives only in the requesting browser session.
- **Row Level Security (RLS)**: Authenticated users can only read, update, or delete records associated with their `auth.uid() = user_id`.
- **Secret Safety**: No Supabase service-role keys or database passwords are built into frontend client bundles.
- **Formula Injection Defense**: CSV generation prepends a single quote to cells beginning with `=`, `+`, `-`, or `@`.

---

## 10. License & Acknowledgments

Built for the Digital Risk Protection Hackathon 2026.
Licensed under the MIT License.
