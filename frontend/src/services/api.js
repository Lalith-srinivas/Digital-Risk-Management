/**
 * SOC 360 - Centralized API Service
 *
 * Communicates with the FastAPI backend while providing a robust Demo Data Adapter
 * fallback when the backend is not yet running or during hackathon evaluation.
 *
 * Base URL is read from `VITE_API_BASE_URL`, with optional runtime configuration in Settings.
 */

import { getStoredDemoData, saveStoredDemoData, INITIAL_BRANDS, INITIAL_FINDINGS, INITIAL_SCANS } from './demoData';
import { sortFindingsByBrandRelevance } from '../utils/sorting';

const CONFIG_KEYS = {
  BASE_URL: 'soc360_api_base_url',
  FORCE_DEMO: 'soc360_force_demo_mode',
};

// Default backend URL
const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://soc360-backend.onrender.com' : 'http://localhost:8000');

let isBackendLive = false;
let lastHealthCheck = null;

export function notifyFindingsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('soc360:findings_updated'));
  }
}

function normalizeFinding(f) {
  if (!f) return null;
  const cand = f.candidate || {};
  const brand = f.brand || f.brandDetails || {};
  const evidence = f.evidence || {};

  // Build reasons if missing
  let reasons = f.reasons;
  if (!reasons || !reasons.length) {
    if (evidence.reasons && Array.isArray(evidence.reasons)) {
      reasons = evidence.reasons;
    } else if (f.explanation) {
      reasons = f.explanation.split('\n').filter(Boolean);
    } else {
      reasons = ['Automated similarity detection signal triggered'];
    }
  }

  // Build evidenceSignals if missing
  let evidenceSignals = f.evidenceSignals;
  if (!evidenceSignals || !evidenceSignals.length) {
    evidenceSignals = [];
    if (evidence.name_similarity !== undefined) {
      evidenceSignals.push({
        name: 'Lexical Trademark Similarity',
        score: evidence.name_similarity,
        detail: `RapidFuzz lexical match on protected brand trademark`
      });
    }
    if (evidence.logo_similarity !== undefined && evidence.logo_similarity > 0) {
      evidenceSignals.push({
        name: 'Visual Trademark Perceptual Hash',
        score: evidence.logo_similarity,
        detail: 'ImageHash perceptual distance on brand visual mark'
      });
    }
    if (evidence.developer_match !== undefined) {
      evidenceSignals.push({
        name: 'Publisher Identity Verification',
        score: evidence.developer_match ? 10 : 85,
        detail: evidence.developer_match ? 'Matched authorized corporate developer' : 'Publisher not in registered official developers'
      });
    }
    if (evidence.official_url_match) {
      evidenceSignals.push({
        name: 'Official Domain Verification',
        score: 0,
        detail: 'Verified official corporate URL'
      });
    }
    if (!evidenceSignals.length) {
      evidenceSignals.push({
        name: 'Heuristic Review Signal',
        score: f.risk_score || f.riskScore || 50,
        detail: 'Synthesized signal score'
      });
    }
  }

  return {
    ...f,
    id: String(f.id),
    brandId: String(f.brand_id || f.brandId || ''),
    brandName: f.brand_name || brand.name || f.brandName || (f.brandDetails && f.brandDetails.name) || (f.brand_id ? 'Protected Brand' : ''),
    candidateName: cand.candidate_name || f.candidate_name || f.candidateName || 'Candidate Identity',
    candidateHandle: cand.username || cand.package_identifier || f.candidateHandle || f.packageId || '',
    candidateUrl: cand.source_url || f.candidateUrl || '',
    sourceType: f.source_type || f.sourceType || 'social',
    platform: f.platform || (f.source_type === 'social' ? 'Social Media' : 'App Marketplace'),
    riskScore: f.risk_score !== undefined ? f.risk_score : (f.riskScore || 0),
    riskLevel: f.risk_level || f.riskLevel || 'Low',
    avatarUrl: cand.image_url || f.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&auto=format&fit=crop&q=80',
    detectionDate: f.created_at || f.detectionDate || new Date().toISOString(),
    reviewStatus: f.review_status || f.reviewStatus || 'New',
    reviewNotes: f.reviewNotes || f.review_notes || '',
    developer: cand.developer_name || f.developer || '',
    packageId: cand.package_identifier || f.packageId || '',
    reasons,
    evidenceSignals,
    isDemoData: Boolean(f.is_demo || f.isDemoData),
    brandDetails: {
      id: String(f.brand_id || f.brandId || ''),
      name: f.brand_name || brand.name || f.brandName || (f.brandDetails && f.brandDetails.name) || 'Protected Brand',
      website: brand.website || '',
      logo: brand.logo_url || brand.logo || '',
      officialDevelopers: brand.official_developers || brand.developerNames || [],
    }
  };
}

export const api = {
  getBaseUrl() {
    return localStorage.getItem(CONFIG_KEYS.BASE_URL) || DEFAULT_API_BASE;
  },

  setBaseUrl(url) {
    if (url) {
      localStorage.setItem(CONFIG_KEYS.BASE_URL, url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem(CONFIG_KEYS.BASE_URL);
    }
  },

  isForcedDemoMode() {
    return localStorage.getItem(CONFIG_KEYS.FORCE_DEMO) === 'true';
  },

  setForcedDemoMode(val) {
    localStorage.setItem(CONFIG_KEYS.FORCE_DEMO, val ? 'true' : 'false');
  },

  isBackendConnected() {
    return isBackendLive && !this.isForcedDemoMode();
  },

  getLastHealthCheckTime() {
    return lastHealthCheck;
  },

  /**
   * Health Check with timeout
   */
  async checkHealth() {
    if (this.isForcedDemoMode()) {
      isBackendLive = false;
      lastHealthCheck = new Date().toISOString();
      return { status: 'demo', connected: false, message: 'Demo mode actively forced' };
    }

    const url = `${this.getBaseUrl()}/health`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json().catch(() => ({ status: 'ok' }));
        isBackendLive = true;
        lastHealthCheck = new Date().toISOString();
        return { status: 'healthy', connected: true, data };
      } else {
        isBackendLive = false;
        lastHealthCheck = new Date().toISOString();
        return { status: 'error', connected: false, code: response.status };
      }
    } catch (err) {
      clearTimeout(timeout);
      isBackendLive = false;
      lastHealthCheck = new Date().toISOString();
      return { status: 'offline', connected: false, error: err.message };
    }
  },

  getAuthToken() {
    try {
      const keys = Object.keys(localStorage);
      const supabaseKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (supabaseKey) {
        const item = JSON.parse(localStorage.getItem(supabaseKey));
        if (item?.access_token) return item.access_token;
      }
      const demoSession = localStorage.getItem('soc360_demo_session');
      if (demoSession) {
        const item = JSON.parse(demoSession);
        if (item?.access_token) return item.access_token;
      }
    } catch {
      // ignore
    }
    return null;
  },

  /**
   * Universal Fetch Wrapper with timeout and JSON handling
   */
  async request(endpoint, options = {}) {
    if (this.isForcedDemoMode()) {
      throw new Error('DEMO_MODE_FORCED');
    }

    const baseUrl = this.getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const token = this.getAuthToken();
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 45000);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders,
          ...(options.headers || {})
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        let errorJson;
        try { errorJson = JSON.parse(errorBody); } catch { errorJson = null; }
        const err = new Error(errorJson?.detail || errorJson?.message || `HTTP ${response.status}: ${response.statusText}`);
        err.status = response.status;
        err.data = errorJson;
        throw err;
      }

      isBackendLive = true;
      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`Request to ${endpoint} timed out`);
        timeoutErr.status = 408;
        throw timeoutErr;
      }
      throw err;
    }
  },

  // ==========================================
  // BRAND PROFILES
  // ==========================================

  async getBrands() {
    try {
      const data = await this.request('/brands');
      const list = Array.isArray(data) ? data : data.brands || [];
      return { data: list, isDemoData: false };
    } catch (err) {
      const { brands } = getStoredDemoData();
      return { data: brands, isDemoData: true, notice: 'Demonstration dataset active (backend offline)' };
    }
  },

  async getBrandById(id) {
    try {
      const data = await this.request(`/brands/${id}`);
      return { data, isDemoData: false };
    } catch (err) {
      const { brands } = getStoredDemoData();
      const brand = brands.find(b => b.id === id) || brands[0];
      return { data: brand, isDemoData: true };
    }
  },

  async createBrand(brandInput) {
    try {
      const data = await this.request('/brands', {
        method: 'POST',
        body: JSON.stringify(brandInput)
      });
      notifyFindingsUpdated();
      return { data, isDemoData: false };
    } catch (err) {
      const { brands, findings, scans } = getStoredDemoData();
      const newBrand = {
        id: `brand-${Date.now()}`,
        name: brandInput.name,
        category: brandInput.category || 'General Enterprise',
        website: brandInput.website || '',
        logo: brandInput.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(brandInput.name)}&background=6366f1&color=fff`,
        aliases: brandInput.aliases || [],
        officialSocials: brandInput.officialSocials || [],
        officialApps: brandInput.officialApps || [],
        developerNames: brandInput.developerNames || [],
        lastScan: new Date().toISOString(),
        status: 'Active Monitoring',
        findingsCount: 0,
        isDemoData: true
      };

      const updatedBrands = [newBrand, ...brands];
      saveStoredDemoData({ brands: updatedBrands, findings, scans });
      notifyFindingsUpdated();
      return { data: newBrand, isDemoData: true };
    }
  },

  async deleteBrand(id) {
    try {
      await this.request(`/brands/${id}`, { method: 'DELETE' });
      notifyFindingsUpdated();
      return { success: true, isDemoData: false };
    } catch (err) {
      const { brands, findings, scans } = getStoredDemoData();
      const updatedBrands = brands.filter(b => b.id !== id);
      const updatedFindings = findings.filter(f => f.brandId !== id);
      saveStoredDemoData({ brands: updatedBrands, findings: updatedFindings, scans });
      notifyFindingsUpdated();
      return { success: true, isDemoData: true };
    }
  },

  /**
   * Primary Brand-First Orchestration Scan:
   * Executes coordinated social & app store monitoring for a registered brand.
   */
  async scanBrand(brandId, isDemo = false) {
    try {
      const data = await this.request(`/brands/${brandId}/scan?is_demo=${isDemo}`, {
        method: 'POST',
        timeout: 60000,
      });
      const normalizedFindings = (data.findings || []).map(normalizeFinding);
      return {
        data: {
          ...data,
          findings: normalizedFindings,
        },
        isDemoData: Boolean(data.is_demo),
      };
    } catch (err) {
      console.warn('Backend brand scan request exception, checking stored findings:', err);
      // Check if the backend already produced findings for this brand
      try {
        const res = await this.getFindings({ brandId });
        if (res.data && res.data.length > 0) {
          const brandRes = await this.getBrandById(brandId).catch(() => null);
          const brandName = brandRes?.data?.name || 'Protected Brand';
          notifyFindingsUpdated();
          return {
            data: {
              brand_id: brandId,
              brand_name: brandName,
              status: 'completed',
              candidates_analyzed: res.data.length,
              findings_generated: res.data.length,
              social_analyzed: res.data.filter(f => (f.sourceType || f.source_type) === 'social').length,
              apps_analyzed: res.data.filter(f => (f.sourceType || f.source_type) === 'app').length,
              sources_checked: ['Twitter/X', 'Telegram', 'Instagram', 'Google Play Store', 'Apple App Store'],
              findings: res.data,
              is_demo: isDemo,
              is_guest: false,
            },
            isDemoData: false,
          };
        }
      } catch (innerErr) {
        console.warn('Could not retrieve brand findings from backend:', innerErr);
      }

      // Dynamic brand-specific simulation fallback (never return hardcoded Apex Bank for a different brand)
      const { brands, scans } = getStoredDemoData();
      const brand = brands.find(b => b.id === brandId) || brands[0];
      const brandName = brand ? brand.name : 'Target Brand';
      const slug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'brand';

      const simFindings = [
        normalizeFinding({
          id: `find-dyn-${Date.now()}-1`,
          brandId,
          brandName,
          candidateName: `${brandName} Support & Helpdesk`,
          sourceType: 'social',
          platform: 'Twitter/X',
          candidateHandle: `@${slug}_support_desk`,
          candidateUrl: `https://x.com/${slug}_support_desk`,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96',
          riskScore: 89,
          riskLevel: 'High',
          reasons: [`Account claiming official support status for ${brandName} without verified organization badge`],
          detectionDate: new Date().toISOString(),
          reviewStatus: 'Needs Review',
          isDemoData: true,
        }),
        normalizeFinding({
          id: `find-dyn-${Date.now()}-2`,
          brandId,
          brandName,
          candidateName: `${brandName} Mobile Pro (Unlocked)`,
          sourceType: 'app',
          platform: 'APK Repository / Unofficial Store',
          candidateHandle: `com.unauthorized.${slug}.mod`,
          candidateUrl: `https://apk-mirror-store.example/download/${slug}`,
          avatarUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96',
          developer: 'Unauthorized Mod Network',
          packageId: `com.unauthorized.${slug}.mod`,
          riskScore: 94,
          riskLevel: 'High',
          reasons: [`Package identifier mimics official ${brandName} banking or corporate namespace`],
          detectionDate: new Date().toISOString(),
          reviewStatus: 'Needs Review',
          isDemoData: true,
        }),
        normalizeFinding({
          id: `find-dyn-${Date.now()}-3`,
          brandId,
          brandName,
          candidateName: `${brandName} Bonus & Community Rewards`,
          sourceType: 'social',
          platform: 'Telegram',
          candidateHandle: `@${slug}_rewards_bot`,
          candidateUrl: `https://t.me/${slug}_rewards_bot`,
          avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96',
          riskScore: 80,
          riskLevel: 'High',
          reasons: [`Suspicious token giveaway channel soliciting credentials under ${brandName} mark`],
          detectionDate: new Date().toISOString(),
          reviewStatus: 'Needs Review',
          isDemoData: true,
        }),
      ];

      const simScan = {
        id: `scan-${Date.now()}`,
        brandName,
        type: 'Combined Surveillance Scan',
        target: 'Social & Mobile App Ecosystem',
        timestamp: new Date().toISOString(),
        duration: '18s',
        candidatesAnalyzed: 8,
        findingsGenerated: simFindings.length,
        status: 'Completed',
        isDemoData: true,
      };

      saveStoredDemoData({ brands, findings: simFindings, scans: [simScan, ...scans] });

      notifyFindingsUpdated();
      return {
        data: {
          brand_id: brandId,
          brand_name: brandName,
          status: 'completed',
          candidates_analyzed: 8,
          findings_generated: simFindings.length,
          social_analyzed: 5,
          apps_analyzed: 3,
          sources_checked: ['Twitter/X', 'Telegram', 'Instagram', 'Google Play Store', 'Apple App Store'],
          scans: [simScan],
          findings: simFindings,
          is_demo: true,
          is_guest: false,
        },
        isDemoData: true,
      };
    }
  },

  /**
   * Connector and data source readiness check
   */
  async getConnectorsStatus() {
    try {
      const data = await this.request('/connectors/status', { method: 'GET' });
      return { data, isDemoData: false };
    } catch (err) {
      return {
        data: {
          app_sources: [
            { name: 'Apple App Store', source_type: 'app', status: 'active', is_configured: true, description: 'Public Apple iTunes Search API' },
            { name: 'Google Play Store', source_type: 'app', status: 'unconfigured', is_configured: false, message: 'GOOGLE_PLAY_API_KEY or SERPAPI_API_KEY required' },
          ],
          social_sources: [
            { name: 'GitHub Profiles', source_type: 'social', status: 'active', is_configured: true, description: 'Public GitHub search API' },
            { name: 'Twitter/X Surveillance', source_type: 'social', status: 'unconfigured', is_configured: false, message: 'TWITTER_BEARER_TOKEN required' },
            { name: 'Telegram Channels', source_type: 'social', status: 'unconfigured', is_configured: false, message: 'TELEGRAM_BOT_TOKEN required' },
          ],
          active_app_connectors: 1,
          total_app_connectors: 2,
          active_social_connectors: 1,
          total_social_connectors: 4,
          live_app_scanning_ready: true,
          live_social_scanning_ready: false,
        },
        isDemoData: true,
      };
    }
  },

  /**
   * Guest Scanning Workflow (In-Memory, Zero Persistent DB Writes):
   * Analyzes social & app vectors in memory and returns threat dossiers directly.
   */
  async scanGuest(brandData) {
    const isDemoRequested = Boolean(brandData.is_demo);
    const payload = {
      name: brandData.name || brandData.brand_name || brandData.brandName,
      website: brandData.website || brandData.websiteUrl || null,
      logo_url: brandData.logo_url || brandData.logoUrl || brandData.logo || null,
      official_social_urls: brandData.official_social_urls || brandData.officialSocialUrls || [],
      official_apps: brandData.official_apps || brandData.officialApps || [],
      official_developers: brandData.official_developers || brandData.officialDevelopers || [],
      aliases: brandData.aliases || [],
      is_demo: isDemoRequested,
    };

    try {
      const data = await this.request('/scan/guest', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeout: 45000,
      });

      const normalizedFindings = (data.findings || []).map(normalizeFinding);
      return {
        ...data,
        findings: normalizedFindings,
        isGuest: true,
      };
    } catch (err) {
      console.warn('Backend guest scan failed:', err);
      const brandName = payload.name;

      if (!isDemoRequested) {
        return {
          brand_name: brandName,
          status: 'error',
          error: true,
          candidates_analyzed: 0,
          findings_generated: 0,
          social_analyzed: 0,
          apps_analyzed: 0,
          sources_checked: ['Apple App Store', 'GitHub Public'],
          sources_status: {
            apple_app_store: { status: 'error', message: err.message || 'Service connection error' },
            github: { status: 'error', message: err.message || 'Service connection error' },
            twitter: { status: 'unconfigured', message: 'API credentials required' },
            telegram: { status: 'unconfigured', message: 'API credentials required' },
            google_play: { status: 'unconfigured', message: 'API credentials required' }
          },
          findings: [],
          is_demo: false,
          is_guest: true,
          scan_message: 'Live scanning unavailable: Unable to contact surveillance engine. Configure live data connectors or select Demo Simulation Mode.',
          privacy_notice: 'GUEST DATA PRIVACY: This scan was processed entirely in memory.',
        };
      }

      const slug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'brand';

      const demoFindings = [
        normalizeFinding({
          id: `guest-dyn-${Date.now()}-1`,
          brandName,
          candidateName: `${brandName} Support & Helpdesk`,
          sourceType: 'social',
          platform: 'Twitter/X',
          candidateHandle: `@${slug}_support_desk`,
          candidateUrl: `https://x.com/${slug}_support_desk`,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96',
          riskScore: 85,
          riskLevel: 'High',
          reasons: [`Account claiming official support status for ${brandName} without verified organization badge`],
          detectionDate: new Date().toISOString(),
          reviewStatus: 'Needs Review',
          isDemoData: true,
        }),
        normalizeFinding({
          id: `guest-dyn-${Date.now()}-2`,
          brandName,
          candidateName: `${brandName} Mobile Pro (Unlocked)`,
          sourceType: 'app',
          platform: 'APK Repository / Unofficial Store',
          candidateHandle: `com.unauthorized.${slug}.mod`,
          candidateUrl: `https://apk-mirror-store.example/download/${slug}`,
          avatarUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96',
          developer: 'Unauthorized Mod Network',
          packageId: `com.unauthorized.${slug}.mod`,
          riskScore: 88,
          riskLevel: 'High',
          reasons: [`Package identifier mimics official ${brandName} namespace`],
          detectionDate: new Date().toISOString(),
          reviewStatus: 'Needs Review',
          isDemoData: true,
        }),
      ];

      return {
        brand_name: brandName,
        status: 'completed',
        candidates_analyzed: demoFindings.length,
        findings_generated: demoFindings.length,
        social_analyzed: demoFindings.filter(f => f.sourceType === 'social').length,
        apps_analyzed: demoFindings.filter(f => f.sourceType === 'app').length,
        sources_checked: ['Apple App Store', 'Twitter/X', 'Telegram'],
        sources_status: {
          apple_app_store: { status: 'demo', message: 'Simulated candidates' },
          twitter: { status: 'demo', message: 'Simulated candidates' },
          telegram: { status: 'demo', message: 'Simulated candidates' }
        },
        findings: demoFindings,
        is_demo: true,
        is_guest: true,
        scan_message: 'Demo Simulation Mode: Synthetic candidate dataset generated for evaluation.',
        privacy_notice: 'GUEST DATA PRIVACY: This scan was processed entirely in memory.',
      };
    }
  },

  /**
   * Data Source Connectors Status:
   * Returns live status and configuration needs of all external connectors.
   */
  async getConnectorsStatus() {
    try {
      const data = await this.request('/connectors/status', { method: 'GET' });
      return { data, isDemoData: false };
    } catch (err) {
      console.warn('Could not fetch connector status from backend, using descriptor:', err);
      return {
        data: {
          apple_app_store: {
            name: 'Apple App Store (iTunes API)',
            status: 'active',
            type: 'app_store',
            requires_auth: false,
            message: 'Active - Public iTunes Search API operational',
          },
          github: {
            name: 'GitHub Public Repository & User Search',
            status: 'active',
            type: 'social',
            requires_auth: false,
            message: 'Active - Public GitHub search API operational',
          },
          google_play: {
            name: 'Google Play Store',
            status: 'unconfigured',
            type: 'app_store',
            requires_auth: true,
            required_keys: ['GOOGLE_PLAY_API_KEY', 'SERPAPI_API_KEY'],
            message: 'Unconfigured - requires GOOGLE_PLAY_API_KEY or SERPAPI_API_KEY',
          },
          twitter: {
            name: 'Twitter/X API v2',
            status: 'unconfigured',
            type: 'social',
            requires_auth: true,
            required_keys: ['TWITTER_BEARER_TOKEN'],
            message: 'Unconfigured - requires TWITTER_BEARER_TOKEN',
          },
          telegram: {
            name: 'Telegram Bot API',
            status: 'unconfigured',
            type: 'social',
            requires_auth: true,
            required_keys: ['TELEGRAM_BOT_TOKEN'],
            message: 'Unconfigured - requires TELEGRAM_BOT_TOKEN',
          },
        },
        isDemoData: true,
      };
    }
  },

  // ==========================================
  // SCANS (Social & Apps)
  // ==========================================

  async scanSocial(scanPayload) {
    const isDemoRequested = Boolean(scanPayload.is_demo);
    try {
      // If manual candidate payload provided
      let body;
      if (scanPayload.candidateName || scanPayload.handle || scanPayload.profileUrl) {
        body = {
          brand_id: scanPayload.brandId,
          candidates: [{
            display_name: scanPayload.candidateName || scanPayload.handle,
            username: scanPayload.handle,
            profile_url: scanPayload.profileUrl,
            platform: scanPayload.platform || 'Twitter/X',
            bio: scanPayload.description,
            image_url: scanPayload.avatarUrl,
            is_demo: isDemoRequested,
          }],
          is_demo: isDemoRequested,
        };
      } else {
        // Brand-first scan (auto-discovery)
        body = {
          brand_id: scanPayload.brandId,
          is_demo: isDemoRequested,
        };
      }

      const data = await this.request('/scan/social', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      notifyFindingsUpdated();
      return { data, isDemoData: false };
    } catch (err) {
      if (!isDemoRequested) {
        throw new Error(err.message || 'Live social monitoring failed: Service unavailable.');
      }
      const { brands, findings, scans } = getStoredDemoData();
      const brand = brands.find(b => b.id === scanPayload.brandId) || brands[0];

      const candidateName = scanPayload.candidateName || scanPayload.handle || `${brand ? brand.name : 'Brand'} Helpdesk`;
      const handle = scanPayload.handle || '@' + candidateName.toLowerCase().replace(/\s+/g, '_');
      const riskScore = 84;
      const riskLevel = 'High';

      const newFinding = {
        id: `find-${Date.now()}`,
        brandId: brand ? brand.id : 'brand-1',
        brandName: brand ? brand.name : 'Enterprise Brand',
        candidateName,
        sourceType: 'social',
        platform: scanPayload.platform || 'Twitter/X',
        candidateHandle: handle,
        candidateUrl: scanPayload.profileUrl || `https://x.com/${handle.replace('@', '')}`,
        avatarUrl: scanPayload.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96',
        riskScore,
        riskLevel,
        nameSimilarity: 88,
        logoSimilarity: 78,
        detectionDate: new Date().toISOString(),
        reviewStatus: 'New',
        reasons: [`Candidate claims official recovery / support capabilities for ${brand ? brand.name : 'Brand'}`],
        isDemoData: true
      };

      const newScan = {
        id: `scan-${Date.now()}`,
        brandName: brand ? brand.name : 'Target Brand',
        type: 'Social Profiles Scan',
        target: 'Social Media',
        timestamp: new Date().toISOString(),
        duration: '14s',
        candidatesAnalyzed: 1,
        findingsGenerated: 1,
        status: 'Completed',
        isDemoData: true
      };

      saveStoredDemoData({ brands, findings: [newFinding, ...findings], scans: [newScan, ...scans] });

      notifyFindingsUpdated();
      return {
        data: {
          finding: newFinding,
          scan: newScan,
          summary: `Analysis finished. Candidate evaluated at ${riskScore}/100 risk score (${riskLevel}).`
        },
        isDemoData: true
      };
    }
  },

  async scanApps(scanPayload) {
    const isDemoRequested = Boolean(scanPayload.is_demo);
    try {
      let body;
      if (scanPayload.appName || scanPayload.storeUrl || scanPayload.packageId) {
        body = {
          brand_id: scanPayload.brandId,
          candidates: [{
            app_name: scanPayload.appName,
            package_identifier: scanPayload.packageId,
            developer_name: scanPayload.developer,
            store_url: scanPayload.storeUrl,
            store_type: scanPayload.storeType || 'APK Mirror',
            description: scanPayload.description,
            icon_url: scanPayload.iconUrl,
            is_demo: isDemoRequested,
          }],
          is_demo: isDemoRequested,
        };
      } else {
        body = {
          brand_id: scanPayload.brandId,
          is_demo: isDemoRequested,
        };
      }

      const data = await this.request('/scan/apps', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      notifyFindingsUpdated();
      return { data, isDemoData: false };
    } catch (err) {
      if (!isDemoRequested) {
        throw new Error(err.message || 'Live mobile app monitoring failed: Service unavailable.');
      }
      const { brands, findings, scans } = getStoredDemoData();
      const brand = brands.find(b => b.id === scanPayload.brandId) || brands[0];

      const appName = scanPayload.appName || `${brand ? brand.name : 'Brand'} Mobile Mod Pro`;
      const packageId = scanPayload.packageId || `com.unauthorized.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}.app`;
      const riskScore = 86;
      const riskLevel = 'High';

      const newFinding = {
        id: `find-${Date.now()}`,
        brandId: brand ? brand.id : 'brand-1',
        brandName: brand ? brand.name : 'Target Brand',
        candidateName: appName,
        sourceType: 'app',
        platform: scanPayload.storeType || 'Third-Party APK Store',
        candidateHandle: packageId,
        candidateUrl: scanPayload.storeUrl || 'https://apk-mirror-store.example/app',
        avatarUrl: scanPayload.iconUrl || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96',
        developer: scanPayload.developer || 'Unknown Publisher',
        packageId,
        riskScore,
        riskLevel,
        nameSimilarity: 85,
        logoSimilarity: 80,
        detectionDate: new Date().toISOString(),
        reviewStatus: 'New',
        reasons: ['Publisher identity does not match official authorized developer list'],
        isDemoData: true
      };

      const newScan = {
        id: `scan-${Date.now()}`,
        brandName: brand ? brand.name : 'Target Brand',
        type: 'App Store Discovery',
        target: 'APK Distribution Channels',
        timestamp: new Date().toISOString(),
        duration: '19s',
        candidatesAnalyzed: 1,
        findingsGenerated: 1,
        status: 'Completed',
        isDemoData: true
      };

      saveStoredDemoData({ brands, findings: [newFinding, ...findings], scans: [newScan, ...scans] });

      notifyFindingsUpdated();
      return {
        data: {
          finding: newFinding,
          scan: newScan,
          summary: `App analysis complete. Review priority score: ${riskScore}/100 (${riskLevel}).`
        },
        isDemoData: true
      };
    }
  },

  // ==========================================
  // FINDINGS
  // ==========================================

  async getFindings(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.brandId && filters.brandId !== 'all') queryParams.set('brand_id', filters.brandId);
      if (filters.sourceType && filters.sourceType !== 'all') queryParams.set('source_type', filters.sourceType);
      if (filters.riskLevel && filters.riskLevel !== 'all') queryParams.set('risk_level', filters.riskLevel);
      if (filters.reviewStatus && filters.reviewStatus !== 'all') queryParams.set('review_status', filters.reviewStatus);
      if (filters.search) queryParams.set('q', filters.search);
      if (filters.sortBy === 'riskScore') {
        queryParams.set('sort_by', 'risk_score');
        queryParams.set('sort_dir', 'desc');
      } else if (filters.sortBy === 'date') {
        queryParams.set('sort_by', 'created_at');
        queryParams.set('sort_dir', 'desc');
      }

      const qs = queryParams.toString();
      const data = await this.request(`/findings${qs ? `?${qs}` : ''}`);
      const rawList = Array.isArray(data) ? data : (data.items || data.findings || []);
      const normalized = rawList.map(normalizeFinding);
      const prioritized = sortFindingsByBrandRelevance(normalized, filters.brandName || '', filters.sortBy || 'riskScore');
      return { data: prioritized, isDemoData: false };
    } catch (err) {
      const { findings } = getStoredDemoData();
      let filtered = [...findings];

      if (filters.brandId && filters.brandId !== 'all') {
        filtered = filtered.filter(f => f.brandId === filters.brandId);
      }
      if (filters.sourceType && filters.sourceType !== 'all') {
        filtered = filtered.filter(f => f.sourceType === filters.sourceType);
      }
      if (filters.riskLevel && filters.riskLevel !== 'all') {
        filtered = filtered.filter(f => f.riskLevel?.toLowerCase() === filters.riskLevel.toLowerCase());
      }
      if (filters.reviewStatus && filters.reviewStatus !== 'all') {
        filtered = filtered.filter(f => f.reviewStatus?.toLowerCase() === filters.reviewStatus.toLowerCase());
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(f =>
          (f.candidateName && f.candidateName.toLowerCase().includes(q)) ||
          (f.brandName && f.brandName.toLowerCase().includes(q)) ||
          (f.candidateHandle && f.candidateHandle.toLowerCase().includes(q))
        );
      }

      const normalized = filtered.map(normalizeFinding);
      const prioritized = sortFindingsByBrandRelevance(normalized, filters.brandName || '', filters.sortBy || 'riskScore');
      return { data: prioritized, isDemoData: true };
    }
  },

  async getFindingById(id) {
    try {
      const data = await this.request(`/findings/${id}`);
      return { data: normalizeFinding(data), isDemoData: false };
    } catch (err) {
      const { findings, brands } = getStoredDemoData();
      const finding = findings.find(f => f.id === id) || findings[0];
      const brand = brands.find(b => b.id === (finding ? finding.brandId : '')) || brands[0];
      return { data: normalizeFinding({ ...finding, brandDetails: brand }), isDemoData: true };
    }
  },

  async updateFindingStatus(id, newStatus, notes = '') {
    try {
      const data = await this.request(`/findings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewStatus: newStatus, reviewNotes: notes })
      });
      notifyFindingsUpdated();
      return { data: normalizeFinding(data), isDemoData: false };
    } catch (err) {
      const { brands, findings, scans } = getStoredDemoData();
      const updatedFindings = findings.map(f => {
        if (f.id === id) {
          return {
            ...f,
            reviewStatus: newStatus,
            reviewNotes: notes || f.reviewNotes,
            updatedAt: new Date().toISOString()
          };
        }
        return f;
      });
      saveStoredDemoData({ brands, findings: updatedFindings, scans });
      const updated = updatedFindings.find(f => f.id === id);
      notifyFindingsUpdated();
      return { data: normalizeFinding(updated), isDemoData: true };
    }
  },

  // ==========================================
  // DASHBOARD AGGREGATES & SCANS
  // ==========================================

  async getDashboardStats() {
    try {
      const data = await this.request('/stats');
      return {
        data: {
          ...data,
          openFindings: typeof data.openFindings === 'number' ? data.openFindings : (data.suspiciousFindings || 0),
          recentFindings: (data.recentFindings || []).map(normalizeFinding),
        },
        isDemoData: false
      };
    } catch (err) {
      const { brands, findings, scans } = getStoredDemoData();

      const totalBrands = brands.length;
      if (totalBrands === 0) {
        return {
          data: {
            totalBrands: 0,
            socialScanned: 0,
            appsScanned: 0,
            suspiciousFindings: 0,
            openFindings: 0,
            riskCounts: { High: 0, Medium: 0, Low: 0 },
            sourceCounts: { social: 0, apps: 0, other: 0 },
            recentFindings: [],
            recentScans: []
          },
          isDemoData: true
        };
      }

      const socialFindings = findings.filter(f => f.sourceType === 'social').length;
      const appFindings = findings.filter(f => f.sourceType === 'app').length;
      const suspiciousFindings = findings.filter(f => (f.riskScore || 0) >= 60).length;
      const openFindings = findings.filter(f => {
        const s = (f.reviewStatus || '').toLowerCase();
        return s !== 'resolved' && s !== 'false positive';
      }).length;

      const socialScanned = scans.reduce((acc, s) => acc + (s.type?.toLowerCase().includes('social') ? (s.candidatesAnalyzed || 0) : 0), 0) || socialFindings;
      const appsScanned = scans.reduce((acc, s) => acc + (s.type?.toLowerCase().includes('app') ? (s.candidatesAnalyzed || 0) : 0), 0) || appFindings;

      const riskCounts = {
        High: findings.filter(f => f.riskLevel === 'High').length,
        Medium: findings.filter(f => f.riskLevel === 'Medium').length,
        Low: findings.filter(f => f.riskLevel === 'Low').length
      };

      const sourceCounts = {
        social: socialFindings,
        apps: appFindings,
        other: 0
      };

      return {
        data: {
          totalBrands,
          socialScanned,
          appsScanned,
          suspiciousFindings,
          openFindings,
          riskCounts,
          sourceCounts,
          recentFindings: findings.slice(0, 5).map(normalizeFinding),
          recentScans: scans.slice(0, 4)
        },
        isDemoData: true
      };
    }
  },

  async getScanActivity() {
    try {
      const data = await this.request('/scans');
      return { data: Array.isArray(data) ? data : data.scans || [], isDemoData: false };
    } catch (err) {
      const { scans } = getStoredDemoData();
      return { data: scans, isDemoData: true };
    }
  },

  resetDemoDataToDefaults() {
    saveStoredDemoData({
      brands: INITIAL_BRANDS,
      findings: INITIAL_FINDINGS,
      scans: INITIAL_SCANS
    });
    return true;
  }
};

export default api;
