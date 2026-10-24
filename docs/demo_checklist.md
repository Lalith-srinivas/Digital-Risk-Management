# SOC 360 - Hackathon Demo Checklist & Script

This checklist provides a structured 13-step walkthrough for presenting **SOC 360** to judges and stakeholders during a hackathon or technical evaluation.

---

## Pre-Demo Checklist

- [ ] Backend is running (`http://localhost:8000` or deployed on Render).
- [ ] Backend `/health` check returns HTTP 200 `{"status": "healthy"}`.
- [ ] Frontend is running (`http://localhost:5173` or deployed on Vercel).
- [ ] Supabase connection is established.
- [ ] Synthetic demo dataset is loaded and ready.
- [ ] Browser window is sized and zoomed cleanly (100% or 110%).

---

## 13-Step Live Demonstration Walkthrough

### Step 1: Open the SOC 360 Dashboard
- **Action**: Navigate to the home view of SOC 360.
- **Talking Points**:
  > *"Welcome to SOC 360, our Digital Risk Protection platform. Digital brands today face an explosion of impersonation attacks—from fraudulent social profiles offering fake customer support to rogue mobile apps harvesting login credentials. SOC 360 provides unified brand protection across both social networks and app stores."*

---

### Step 2: Register a Brand
- **Action**: Click **Register Brand** (or view the pre-registered profile for **Northstar Pay**).
- **Inputs to highlight**:
  - **Brand Name**: `Northstar Pay`
  - **Registered Domains**: `northstarpay.example.com`
  - **Official Social Handles**: Twitter: `@northstarpay`, Instagram: `@northstarpay_official`
  - **Official App IDs**: Google Play: `com.northstarpay.app`, iOS: `id9876543210`
  - **Keywords**: `payments`, `wallet`, `transfers`, `fintech`
- **Talking Points**:
  > *"Before detection begins, the security team registers their legitimate brand footprint—including verified domain names, official social handles, and authorized mobile package identifiers. This baseline allows our detection engine to automatically filter out legitimate brand properties."*

---

### Step 3: Open Social Monitoring
- **Action**: Click on the **Social Monitoring** tab in the navigation bar.
- **Talking Points**:
  > *"Here in Social Monitoring, analysts can monitor candidate profiles across Twitter/X, Instagram, LinkedIn, and TikTok. Because major social platforms restrict automated scraping and require enterprise developer tiers, SOC 360 supports direct user-submitted URLs, analyst triage, live permitted APIs, and synthetic demo feeds."*

---

### Step 4: Submit Candidate Profiles
- **Action**: Click **Load Synthetic Demo Candidates** or submit a candidate URL (e.g., `https://x.com/northstarpaay`).
- **Candidates Loaded**:
  1. `northstarpay` (Twitter) - Official account.
  2. `northstarpaay` (Twitter) - Typosquatting variant.
  3. `northstarpay_support` (Instagram) - Combosquatting support scam.
  4. `northstar_payment_advisory` (LinkedIn) - Legitimate B2B consultancy.
- **Talking Points**:
  > *"We ingest our candidate batch. Notice that every candidate is normalized with canonical handles, clean platform identifiers, and explicit source labels."*

---

### Step 5: Run Detection on Social Candidates
- **Action**: Click the **Run Detection** button.
- **Talking Points**:
  > *"The detection engine processes the candidates against Northstar Pay's registered profile, evaluating lexical similarity, typosquatting algorithms, combosquatting keywords, and biographical intent."*

---

### Step 6: Show Name Similarity & Evidence
- **Action**: Inspect the flagged social candidates in the results list.
- **Highlight**:
  - **`northstarpaay`**: Show similarity score (95%+) and evidence tag: `HIGH_NAME_SIMILARITY: Handle exhibits strong lexical similarity to brand`. Show the bio flag: `CREDENTIAL_SOLICITATION_BIO: Biography solicits user credentials/PIN`.
  - **`northstarpay_support`**: Show keyword flag: `SENSITIVE_KEYWORD_IMPERSONATION: Account combines brand with support keyword`.
- **Talking Points**:
  > *"SOC 360 doesn't just produce an arbitrary number—it outputs transparent evidence rules explaining exactly why each candidate was flagged. Here, northstarpaay is identified as a typosquat with a suspicious biography asking for account unlocking PINs."*

---

### Step 7: Open App Monitoring
- **Action**: Click on the **App Monitoring** tab.
- **Talking Points**:
  > *"Rogue mobile apps pose even higher risk than social handles because they can steal biometric keys or credit card credentials directly on the device. Let's switch to App Monitoring."*

---

### Step 8: Submit Candidate Application Metadata
- **Action**: Click **Load Synthetic App Candidates** or paste a store link (e.g., `https://play.google.com/store/apps/details?id=com.northstar.paywallet.online`).
- **Candidates Loaded**:
  1. `Northstar Pay: Instant Money` (`com.northstarpay.app`) - Official app.
  2. `Northstar Pay Mobile Wallet` (`com.northstar.paywallet.online`) - Rogue clone by QuickFinance Devs.
  3. `Northstar Compass & Trail GPS` (`com.northstarnav.compass`) - Navigation app by Outdoor Tools.
- **Talking Points**:
  > *"Our app ingestion layer normalizes package IDs, publisher details, and store links across Google Play and the Apple App Store."*

---

### Step 9: Run Detection on App Candidates
- **Action**: Click **Run App Detection**.
- **Talking Points**:
  > *"The engine evaluates package IDs, developer name divergence, and store descriptions."*

---

### Step 10: Open Findings Dashboard
- **Action**: Navigate to the **Findings** tab.
- **Talking Points**:
  > *"The Findings view provides an aggregated, prioritized threat queue for the SOC analyst, complete with risk tiers: Critical, High, Medium, Low, and Official."*

---

### Step 11: Explain Risk Scores & Why Candidates Were Flagged
- **Action**: Click on the rogue app card: `Northstar Pay Mobile Wallet` (`com.northstar.paywallet.online`).
- **Highlight**:
  - Risk Score: **85/100 (HIGH RISK)**.
  - Evidence List:
    - `APP_TITLE_BRAND_INCLUSION`: App title contains protected brand name.
    - `UNVERIFIED_THIRD_PARTY_DEVELOPER`: Developer 'QuickFinance Devs LLC' is unverified and unaffiliated with Northstar Financial Technologies.
    - Low store rating (2.1) and credential-harvesting description.
- **Talking Points**:
  > *"The clone app achieves an 85/100 risk score because it copies the brand name while originating from an unverified third-party publisher requesting login credentials."*

---

### Step 12: Demonstrate Official Exclusion & Legitimate Look-Alikes
- **Action**:
  1. Show the official social profile `@northstarpay` and official app `com.northstarpay.app`.
     - Risk Score: **0/100 (OFFICIAL / EXCLUDED)**.
     - Evidence: `OFFICIAL_HANDLE_MATCH` / `OFFICIAL_PACKAGE_MATCH`.
  2. Show the legitimate look-alike: `Northstar Payment Advisory LLC` on LinkedIn.
     - Risk Score: **LOW RISK (30/100)**.
- **Talking Points**:
  > *"Two critical capabilities differentiate SOC 360 from naive keyword matchers: First, official assets are recognized and excluded automatically, preventing alarm fatigue. Second, look-alikes like 'Northstar Payment Advisory'—a legitimate B2B consultancy—are scored low rather than falsely flagged as phishing. SOC 360 protects against false positives."*

---

### Step 13: Transparent Data Disclosure (Synthetic vs. Live)
- **Action**: Point out the visual **`DEMO DATA`** badges on the synthetic cards.
- **Talking Points**:
  > *"Finally, we believe in radical transparency in security tooling. In this demo, Northstar Pay is a fictional benchmark brand and our records are labelled with `is_demo = True`. We do not perform unauthorized scraping of consumer platforms. In production, SOC 360 connects to authorized enterprise feeds, user-submitted URLs, and permitted public APIs like Apple iTunes Search and GitHub."*

---

## Quick Reference Summary Table for Presenters

| Candidate Name | Type | Classification | Risk Level | Key Talking Point |
| :--- | :--- | :--- | :--- | :--- |
| `northstarpay` | Social | Official Account | **OFFICIAL** | Filtered by registered official handles |
| `northstarpaay` | Social | Typosquatted Impersonator | **HIGH** | Spelling variation + urgent unlocking PIN lure |
| `northstarpay_support` | Social | Combosquatted Support Phish | **HIGH** | Targets distressed users via 'support' keyword |
| `northstar_payment_advisory` | Social | Legitimate Look-Alike | **LOW** | B2B consulting; NOT fraud |
| `com.northstarpay.app` | App | Official Application | **OFFICIAL** | Matches registered store package ID |
| `com.northstar.paywallet.online` | App | Impersonating Clone | **HIGH** | Unverified developer asking for card PIN |
| `com.northstarnav.compass` | App | Unrelated Application | **LOW / BENIGN** | Different category (Outdoor/GPS); no brand overlap |
