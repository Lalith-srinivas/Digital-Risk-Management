/**
 * SOC 360 - Centralized API Service
 *
 * Communicates with the FastAPI backend while providing a robust Demo Data Adapter
 * fallback when the backend is not yet running or during hackathon evaluation.
 *
 * Base URL is read from `VITE_API_BASE_URL`, with optional runtime configuration in Settings.
 */

import { getStoredDemoData, saveStoredDemoData, INITIAL_BRANDS, INITIAL_FINDINGS, INITIAL_SCANS } from './demoData';

const CONFIG_KEYS = {
  BASE_URL: 'soc360_api_base_url',
  FORCE_DEMO: 'soc360_force_demo_mode',
};

// Default backend URL
const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

let isBackendLive = false;
let lastHealthCheck = null;

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
    brandName: brand.name || f.brandName || (f.brand_id ? 'Protected Brand' : ''),
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
      name: brand.name || f.brandName || 'Protected Brand',
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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
      return { data: newBrand, isDemoData: true };
    }
  },

  async deleteBrand(id) {
    try {
      await this.request(`/brands/${id}`, { method: 'DELETE' });
      return { success: true, isDemoData: false };
    } catch (err) {
      const { brands, findings, scans } = getStoredDemoData();
      const updatedBrands = brands.filter(b => b.id !== id);
      const updatedFindings = findings.filter(f => f.brandId !== id);
      saveStoredDemoData({ brands: updatedBrands, findings: updatedFindings, scans });
      return { success: true, isDemoData: true };
    }
  },

  /**
   * Primary Brand-First Orchestration Scan:
   * Executes coordinated social & app store monitoring for a registered brand.
   */
  async scanBrand(brandId, isDemo = true) {
    try {
      const data = await this.request(`/brands/${brandId}/scan?is_demo=${isDemo}`, {
        method: 'POST'
      });
      return { data, isDemoData: false };
    } catch (err) {
      // Fallback demo scan simulation
      const { brands, findings, scans } = getStoredDemoData();
      const brand = brands.find(b => b.id === brandId) || brands[0];

      const simScan = {
        id: `scan-${Date.now()}`,
        brandName: brand ? brand.name : 'Target Brand',
        type: 'Combined Surveillance Scan',
        target: 'Social & Mobile App Ecosystem',
        timestamp: new Date().toISOString(),
        duration: '18s',
        candidatesAnalyzed: 8,
        findingsGenerated: 3,
        status: 'Completed',
        isDemoData: true
      };

      const updatedScans = [simScan, ...scans];
      saveStoredDemoData({ brands, findings, scans: updatedScans });

      return {
        data: {
          brand_id: brandId,
          brand_name: brand ? brand.name : 'Target Brand',
          status: 'completed',
          candidates_analyzed: 8,
          findings_generated: 3,
          scans: [simScan],
          findings: findings.slice(0, 3)
        },
        isDemoData: true
      };
    }
  },

  // ==========================================
  // SCANS (Social & Apps)
  // ==========================================

  async scanSocial(scanPayload) {
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
            is_demo: true,
          }],
          is_demo: true,
        };
      } else {
        // Brand-first scan (auto-discovery)
        body = {
          brand_id: scanPayload.brandId,
          is_demo: true,
        };
      }

      const data = await this.request('/scan/social', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      return { data, isDemoData: false };
    } catch (err) {
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
        candidatesAnalyzed: 5,
        findingsGenerated: 1,
        status: 'Completed',
        isDemoData: true
      };

      saveStoredDemoData({ brands, findings: [newFinding, ...findings], scans: [newScan, ...scans] });

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
            is_demo: true,
          }],
          is_demo: true,
        };
      } else {
        body = {
          brand_id: scanPayload.brandId,
          is_demo: true,
        };
      }

      const data = await this.request('/scan/apps', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      return { data, isDemoData: false };
    } catch (err) {
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
        candidatesAnalyzed: 3,
        findingsGenerated: 1,
        status: 'Completed',
        isDemoData: true
      };

      saveStoredDemoData({ brands, findings: [newFinding, ...findings], scans: [newScan, ...scans] });

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

      const qs = queryParams.toString();
      const data = await this.request(`/findings${qs ? `?${qs}` : ''}`);
      const rawList = Array.isArray(data) ? data : (data.items || data.findings || []);
      const normalized = rawList.map(normalizeFinding);
      return { data: normalized, isDemoData: false };
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

      if (filters.sortBy === 'riskScore') {
        filtered.sort((a, b) => b.riskScore - a.riskScore);
      } else {
        filtered.sort((a, b) => new Date(b.detectionDate) - new Date(a.detectionDate));
      }

      return { data: filtered.map(normalizeFinding), isDemoData: true };
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
          recentFindings: (data.recentFindings || []).map(normalizeFinding),
        },
        isDemoData: false
      };
    } catch (err) {
      const { brands, findings, scans } = getStoredDemoData();

      const totalBrands = brands.length;
      const socialFindings = findings.filter(f => f.sourceType === 'social').length;
      const appFindings = findings.filter(f => f.sourceType === 'app').length;
      const suspiciousFindings = findings.filter(f => (f.riskScore || 0) >= 60).length;

      const socialScanned = 1248 + findings.length * 12;
      const appsScanned = 412 + findings.length * 4;

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
