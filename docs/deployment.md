# SOC 360 - Deployment Guide

This guide details instructions for setting up, running locally, and deploying the **SOC 360** platform across all components:
1. **Database**: Supabase PostgreSQL setup, schema migrations, and secure configuration.
2. **Backend**: FastAPI REST service local execution, environment variables, Render deployment, and CORS setup.
3. **Frontend**: React + Vite local execution, environment configuration, and Vercel deployment.

---

## 1. Database Setup (Supabase PostgreSQL)

### Step 1: Create Supabase Project
1. Log in to [Supabase](https://supabase.com) and click **New project**.
2. Set a project name (e.g., `soc360-production`), select an organization, and choose your preferred database region.
3. Generate a strong database password and store it securely in your password manager.

### Step 2: Apply Database Schema
Navigate to the **SQL Editor** in your Supabase dashboard and execute the following schema definition:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_name VARCHAR(200) NOT NULL,
    registered_domains TEXT[] DEFAULT '{}',
    official_handles JSONB DEFAULT '{}'::jsonb,
    official_app_ids JSONB DEFAULT '{}'::jsonb,
    keywords TEXT[] DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Scans Table
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
    scan_type VARCHAR(50) NOT NULL, -- 'social', 'app', 'combined'
    source_mode VARCHAR(50) NOT NULL, -- 'demo', 'user_submitted', 'live_api'
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    items_scanned INT DEFAULT 0,
    findings_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Candidates Table
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
    candidate_type VARCHAR(50) NOT NULL, -- 'social', 'app'
    identifier VARCHAR(255) NOT NULL, -- handle or package_id
    display_title VARCHAR(255) NOT NULL,
    target_url TEXT NOT NULL,
    source_platform VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'demo', 'user_submitted', 'manual_input', 'live_api'
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    raw_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Findings Table
CREATE TABLE IF NOT EXISTS public.findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    candidate_type VARCHAR(50) NOT NULL,
    target_identifier VARCHAR(255) NOT NULL,
    target_name VARCHAR(255) NOT NULL,
    risk_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    risk_level VARCHAR(50) NOT NULL, -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'BENIGN', 'OFFICIAL'
    is_official_match BOOLEAN NOT NULL DEFAULT FALSE,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    evidence JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'new', -- 'new', 'under_review', 'resolved', 'dismissed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_candidates_brand_id ON public.candidates(brand_id);
CREATE INDEX IF NOT EXISTS idx_findings_brand_id ON public.findings(brand_id);
CREATE INDEX IF NOT EXISTS idx_findings_risk_level ON public.findings(risk_level);
CREATE INDEX IF NOT EXISTS idx_findings_is_demo ON public.findings(is_demo);
```

### Step 3: Retrieve API Credentials
In the Supabase dashboard, navigate to **Project Settings > API**:
- **Project URL**: e.g., `https://xyzproject.supabase.co`
- **anon / public key**: Client-side safe key.
- **service_role key**: Secret server-side key (used only by FastAPI backend).

---

## 2. Backend Setup (FastAPI)

### Step 1: Install Python Requirements
Ensure Python 3.10+ is installed:

```bash
# Clone and enter project directory
cd Digital-Risk-Management

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables
Create a `.env` file in the backend root directory (do not commit secrets to Git):

```env
# Server Configuration
PORT=8000
ENVIRONMENT=production

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Permitted External API Keys (Optional)
GITHUB_TOKEN=your_github_personal_access_token_optional
TWITTER_BEARER_TOKEN=your_twitter_api_v2_bearer_token_optional
INSTAGRAM_ACCESS_TOKEN=your_meta_instagram_access_token_optional

# Allowed CORS Origins (comma-separated frontend URLs)
ALLOWED_ORIGINS=http://localhost:5173,https://soc360.vercel.app
```

### Step 3: Configure CORS in FastAPI
Ensure your FastAPI application initializes CORS middleware with allowed origins:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="SOC 360 API", version="1.0.0")

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "soc360-api", "timestamp": "ok"}
```

### Step 4: Run FastAPI Locally
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Verify the health check endpoint:
```bash
curl http://localhost:8000/health
# Response: {"status":"healthy","service":"soc360-api","timestamp":"ok"}
```

### Step 5: Deploy Backend to Render

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New + > Web Service**.
3. Connect your GitHub repository (`Digital-Risk-Management`).
4. Select branch: `main` (or `feature/data-sources` for preview).
5. Configure service settings:
   - **Name**: `soc360-api`
   - **Environment**: `Python 3`
   - **Region**: Choose closest to your Supabase region (e.g., Oregon or Frankfurt).
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Under **Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGINS`: `https://soc360.vercel.app,http://localhost:5173`
   - `GITHUB_TOKEN` (optional)
7. Click **Create Web Service**.
8. Once deployed, note your Render URL (e.g., `https://soc360-api.onrender.com`).
9. Test the live health endpoint:
   ```bash
   curl https://soc360-api.onrender.com/health
   ```

---

## 3. Frontend Setup (React + Vite)

### Step 1: Install Dependencies
Navigate to the frontend directory:
```bash
cd frontend
npm install
```

### Step 2: Configure Environment Variables
Create a `.env.local` file in the `frontend/` directory:

```env
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:8000
```

For production deployment on Vercel, set:
```env
VITE_API_BASE_URL=https://soc360-api.onrender.com
```

### Step 3: Run Frontend Locally
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Step 4: Deploy Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New... > Project**.
3. Import your Git repository (`Digital-Risk-Management`).
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` (if stored in a subdirectory, or `./` if root).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://soc360-api.onrender.com`
6. Click **Deploy**.
7. Create a `vercel.json` in the frontend directory to handle SPA client-side routing:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 4. End-to-End Verification Checklist

| Step | Action | Verification Command / URL | Expected Outcome |
| :--- | :--- | :--- | :--- |
| 1 | Database Check | Supabase SQL Editor | Tables `brands`, `scans`, `candidates`, `findings` exist |
| 2 | Backend Health | `GET /health` | HTTP 200 `{"status": "healthy"}` |
| 3 | CORS Verification | `OPTIONS /api/v1/brands` | Header `Access-Control-Allow-Origin` present |
| 4 | Frontend Accessibility | Open Vercel URL in browser | Dashboard loads without network errors in DevTools |
| 5 | Demo Scan Flow | Click **Run Demo Scan** | Synthetic candidates load with `DEMO` badge |
