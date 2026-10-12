# SOC 360 — Security Operations Center
## Digital Risk Protection Platform (DRP)

SOC 360 is a cybersecurity platform designed to detect potential brand impersonation, social media spoofing, and malicious/fake mobile applications. Built for hackathon demonstration with seamless, production-ready FastAPI backend integration.

---

## 🎨 Visual Identity & Design System

The frontend adapts the modern SaaS dashboard reference design:
- **Clean SaaS aesthetics**: Light grey background (`#f1f3f9`) with a large rounded application container (`border-radius: 28px`).
- **Surface Palette**: Pure white cards with subtle lavender gradients (`#faf8ff` to `#f7f6fe`), soft borders (`#e5e9f2`), and non-distracting shadows.
- **Accents**: Deep indigo and violet primary gradients (`linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)`) with cyan highlights.
- **Severity Coding**: Clear, consistent risk indicators for **High** (Red), **Medium** (Amber), **Low** (Green), and **Needs Review** (Indigo).
- **Responsible Cybersecurity UX**: No excessive dark-hacker themes or distracting neon glows. Clean typography and generous whitespace.

---

## 🚀 Key Modules & Pages

### 1. Dashboard (`/`)
- **4 Key Stat Cards**: Brands Monitored, Social Profiles Scanned, Applications Scanned, Suspicious Findings.
- **Threat Activity Timeline**: Interactive weekly area chart using Recharts showing threat volume segmented by severity.
- **Recent Findings Table**: High-priority suspect candidates with similarity scores and one-click inspection.
- **Scan Activity Monitor**: Real-time scanning job logs with target channels, durations, and results.
- **Risk Severity Donut Chart**: Donut chart displaying proportion of High, Medium, and Low risk threats.
- **Threat Sources Breakdown**: Vector distribution comparing social media vs. mobile applications.
- **Monitoring Engine Status**: Live backend connectivity, last scan timestamp, and active monitored targets.

### 2. Brand Profiles (`/brands`)
- Complete registry of monitored brand identities.
- Searchable directory of official domains, verified social accounts, and mobile applications.
- **Add Brand Profile Modal**:
  - Brand name, industry category, official website.
  - Multi-input dynamic list of official social handles (X, Instagram, Telegram, LinkedIn).
  - Multi-input dynamic list of official mobile application names and package identifiers.
  - Authorized developer/publisher names for filtering out rogue app stores.
  - Known brand aliases and trademark variations.
- Inspect brand baseline and launch on-demand impersonation scans.

### 3. Social Media Monitoring (`/social-monitoring`)
- Targeted surveillance of potential social handle clones and typosquatting.
- Brand selector and platform filtering.
- **Candidate Submission Form**:
  - Test any candidate display name, handle, profile URL, bio text, and avatar.
  - Quick demo presets ("Suspect Phisher" and "Fan Community") to immediately demonstrate detection scoring.
- Heuristic results table with syntactic distance, perceptual image match %, risk score, and review status.
- Candidate inspection modal with detailed rationale.

### 4. Application Marketplace Monitoring (`/app-monitoring`)
- Surveillance of suspicious APKs, third-party store clones, and rogue publishers.
- Candidate submission form for APK store URLs, package identifiers, and developer names.
- Quick test presets ("Fake Banking APK" and "Derivative Wallet").
- Flags unauthorized developers, unverified signatures, and high-risk permission profiles.

### 5. Findings Management (`/findings`)
- Centralized triage database of all flagged digital risk candidates.
- Search by handle, keyword, or brand.
- Filter by Risk Level, Vector Source, and Analyst Review Status.
- Sort by date detected or threat severity score.

### 6. Finding Threat Dossier (`/findings/:id`)
- Deep-dive evidence inspection view:
  - Side-by-side asset comparison: authentic brand baseline vs. suspect candidate identity.
  - Individual evidence signals with percentage weights (Handle similarity, logo perceptual hash, phishing keyword density, publisher verification).
  - Algorithmic explanation detailing why the candidate was flagged.
  - Analyst triage actions (Confirm Impersonation, Mark Investigating, Mark False Positive, Mark Resolved).
  - Notes logger for audit trail.

### 7. Settings & API Management (`/settings`)
- Real-time FastAPI backend connectivity tester with latency ping.
- Dynamic `VITE_API_BASE_URL` override with localStorage persistence.
- Offline Demo Mode toggle for reliable hackathon presentation when backend services are restarting.
- Interface preferences (auto-refresh frequency, risk threshold cutoff).
- API contract documentation.

---

## 🛠️ Technology Stack

- **React 19**
- **Vite 8**
- **React Router 7**
- **Recharts 3** (Data visualization)
- **Lucide React** (Icons)
- **Vanilla CSS with Custom Design Tokens** (Zero bloated CSS framework lock-in)

---

## 💻 Local Development Setup

### Prerequisites
- Node.js (v18+)
- `pnpm` or `npm`

### 1. Install Dependencies
```bash
cd frontend
pnpm install
# or
npm install
```

### 2. Configure Environment
Copy the example environment configuration:
```bash
cp .env.example .env
```
Default configuration points to:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
pnpm dev
# or
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
pnpm build
# or
npm run build
```
The optimized production bundle will be generated in `frontend/dist/`.

---

## 🔌 FastAPI Backend Integration

The frontend uses a centralized API service in `src/services/api.js`.

### Planned Endpoints Contract:
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status check |
| `GET` | `/brands` | Fetch all monitored brands |
| `POST` | `/brands` | Register a new monitored brand |
| `GET` | `/brands/{id}` | Get specific brand details |
| `DELETE` | `/brands/{id}` | Delete brand profile |
| `POST` | `/scan/social` | Analyze candidate social profile |
| `POST` | `/scan/apps` | Analyze candidate application package |
| `GET` | `/findings` | List findings with filters (`brand_id`, `risk_level`, `source_type`, `q`) |
| `GET` | `/findings/{id}` | Get finding details and evidence signals |
| `PATCH` | `/findings/{id}` | Update analyst review status and notes |

### Demo Data Adapter Fallback
If the FastAPI backend is offline during presentation or testing, the frontend seamlessly engages the **Demo Data Adapter** (`src/services/demoData.js`).
- All simulated records are labeled with `[DEMO DATA MODE]`.
- Mutations (adding brands, scanning candidate profiles, changing review statuses) persist in `localStorage` for an interactive demo experience.
- The UI transitions cleanly to real API responses once the FastAPI backend is online.
