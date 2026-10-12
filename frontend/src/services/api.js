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
    const timeout = setTimeout(() => controller.abort(), options.timeout || 6000);

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
      return { data: Array.isArray(data) ? data : data.brands || [], isDemoData: false };
    } catch (err) {
      // Fallback to Demo Data
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
      // Demo store mutation
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

  // ==========================================
  // SCANS (Social & Apps)
  // ==========================================

  async scanSocial(scanPayload) {
    try {
      const data = await this.request('/scan/social', {
        method: 'POST',
        body: JSON.stringify(scanPayload)
      });
      return { data, isDemoData: false };
    } catch (err) {
      // Simulate realistic detection engine analysis
      const { brands, findings, scans } = getStoredDemoData();
      const brand = brands.find(b => b.id === scanPayload.brandId) || brands[0];

      const candidateName = scanPayload.candidateName || scanPayload.handle || 'Candidate Social Handle';
      const handle = scanPayload.handle || '@' + candidateName.toLowerCase().replace(/\s+/g, '_');

      // Calculate heuristic scores based on inputs
      const isKnownBenign = candidateName.toLowerCase().includes('fan') || candidateName.toLowerCase().includes('community');
      const riskScore = isKnownBenign ? 28 : (scanPayload.riskScore || Math.floor(Math.random() * 20 + 75));
      const riskLevel = riskScore >= 75 ? 'High' : riskScore >= 45 ? 'Medium' : 'Low';
      const nameSim = Math.floor(Math.random() * 15 + 82);
      const logoSim = Math.floor(Math.random() * 20 + 70);

      const newFinding = {
        id: `find-${Date.now()}`,
        brandId: brand.id,
        brandName: brand.name,
        candidateName,
        sourceType: 'social',
        platform: scanPayload.platform || 'Twitter/X',
        candidateHandle: handle,
        candidateUrl: scanPayload.profileUrl || `https://x.com/${handle.replace('@', '')}`,
        avatarUrl: scanPayload.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&auto=format&fit=crop&q=80',
        riskScore,
        riskLevel,
        nameSimilarity: nameSim,
        logoSimilarity: logoSim,
        detectionDate: new Date().toISOString(),
        reviewStatus: 'Needs Review',
        verdict: riskLevel === 'High' ? 'Suspicious Impersonator' : riskLevel === 'Medium' ? 'Questionable Handle' : 'Benign Profile',
        reasons: [
          `Detected ${nameSim}% lexical match to target protected trademark "${brand.name}"`,
          logoSim > 70 ? `Perceptual visual icon similarity of ${logoSim}% indicates probable brand asset reproduction` : 'Distinct profile imagery observed',
          scanPayload.description?.toLowerCase().includes('support') ? 'Profile bio claims customer support or assistance capability' : 'Non-verified account claiming brand association'
        ],
        evidenceSignals: [
          { name: 'Handle Syntactic Distance', score: nameSim, detail: `Compared with official handles of ${brand.name}` },
          { name: 'Emblem/Logo Perceptual Hash', score: logoSim, detail: 'Cosine distance on trademark visual embeddings' },
          { name: 'Bio Keyword Extraction', score: 82, detail: 'Phishing keyword vectors and support terms analyzed' }
        ],
        reviewNotes: '',
        isDemoData: true
      };

      const newScan = {
        id: `scan-${Date.now()}`,
        brandName: brand.name,
        type: 'Social Profiles Scan',
        target: scanPayload.platform || 'Social Media',
        timestamp: new Date().toISOString(),
        duration: '14s',
        candidatesAnalyzed: 1,
        findingsGenerated: 1,
        status: 'Completed',
        isDemoData: true
      };

      const updatedFindings = [newFinding, ...findings];
      const updatedScans = [newScan, ...scans];
      saveStoredDemoData({ brands, findings: updatedFindings, scans: updatedScans });

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
      const data = await this.request('/scan/apps', {
        method: 'POST',
        body: JSON.stringify(scanPayload)
      });
      return { data, isDemoData: false };
    } catch (err) {
      const { brands, findings, scans } = getStoredDemoData();
      const brand = brands.find(b => b.id === scanPayload.brandId) || brands[0];

      const appName = scanPayload.appName || 'Candidate Mobile App';
      const packageId = scanPayload.packageId || `com.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}.app`;
      const developer = scanPayload.developer || 'Unknown Publisher';

      const riskScore = scanPayload.riskScore || Math.floor(Math.random() * 22 + 73);
      const riskLevel = riskScore >= 75 ? 'High' : riskScore >= 45 ? 'Medium' : 'Low';
      const nameSim = Math.floor(Math.random() * 15 + 80);
      const iconSim = Math.floor(Math.random() * 20 + 75);

      const newFinding = {
        id: `find-${Date.now()}`,
        brandId: brand.id,
        brandName: brand.name,
        candidateName: appName,
        sourceType: 'app',
        platform: scanPayload.storeType || 'Third-Party APK Store',
        candidateHandle: packageId,
        candidateUrl: scanPayload.storeUrl || 'https://example-market.store/app',
        avatarUrl: scanPayload.iconUrl || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96&auto=format&fit=crop&q=80',
        developer,
        packageId,
        riskScore,
        riskLevel,
        nameSimilarity: nameSim,
        logoSimilarity: iconSim,
        detectionDate: new Date().toISOString(),
        reviewStatus: 'Needs Review',
        verdict: riskLevel === 'High' ? 'High Risk Impersonating App' : 'Questionable Derivative Application',
        reasons: [
          `App title overlaps significantly (${nameSim}%) with protected brand "${brand.name}"`,
          `Publisher "${developer}" is not in the approved official developer list for this brand`,
          'Store repository signature does not match brand corporate release keys',
          'Application contains generic financial/login redirect components'
        ],
        evidenceSignals: [
          { name: 'Package Namespace Heuristics', score: 88, detail: `Package ID: ${packageId}` },
          { name: 'App Icon Perceptual Hash', score: iconSim, detail: 'High similarity to official mobile application icon' },
          { name: 'Developer Identity Verification', score: 92, detail: 'Publisher not registered as brand authorized entity' }
        ],
        reviewNotes: '',
        isDemoData: true
      };

      const newScan = {
        id: `scan-${Date.now()}`,
        brandName: brand.name,
        type: 'App Store Discovery',
        target: scanPayload.storeType || 'APK Distribution Channels',
        timestamp: new Date().toISOString(),
        duration: '22s',
        candidatesAnalyzed: 1,
        findingsGenerated: 1,
        status: 'Completed',
        isDemoData: true
      };

      const updatedFindings = [newFinding, ...findings];
      const updatedScans = [newScan, ...scans];
      saveStoredDemoData({ brands, findings: updatedFindings, scans: updatedScans });

      return {
        data: {
          finding: newFinding,
          scan: newScan,
          summary: `App analysis complete. Heuristic score computed at ${riskScore}/100 (${riskLevel}).`
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
      if (filters.brandId) queryParams.set('brand_id', filters.brandId);
      if (filters.sourceType) queryParams.set('source_type', filters.sourceType);
      if (filters.riskLevel) queryParams.set('risk_level', filters.riskLevel);
      if (filters.search) queryParams.set('q', filters.search);

      const qs = queryParams.toString();
      const data = await this.request(`/findings${qs ? `?${qs}` : ''}`);
      return { data: Array.isArray(data) ? data : data.findings || [], isDemoData: false };
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
        filtered = filtered.filter(f => f.riskLevel.toLowerCase() === filters.riskLevel.toLowerCase());
      }
      if (filters.reviewStatus && filters.reviewStatus !== 'all') {
        filtered = filtered.filter(f => f.reviewStatus.toLowerCase() === filters.reviewStatus.toLowerCase());
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(f =>
          f.candidateName.toLowerCase().includes(q) ||
          f.brandName.toLowerCase().includes(q) ||
          (f.candidateHandle && f.candidateHandle.toLowerCase().includes(q))
        );
      }

      // Sort
      if (filters.sortBy === 'riskScore') {
        filtered.sort((a, b) => b.riskScore - a.riskScore);
      } else {
        // default by date descending
        filtered.sort((a, b) => new Date(b.detectionDate) - new Date(a.detectionDate));
      }

      return { data: filtered, isDemoData: true };
    }
  },

  async getFindingById(id) {
    try {
      const data = await this.request(`/findings/${id}`);
      return { data, isDemoData: false };
    } catch (err) {
      const { findings, brands } = getStoredDemoData();
      const finding = findings.find(f => f.id === id) || findings[0];
      const brand = brands.find(b => b.id === finding.brandId) || brands[0];
      return { data: { ...finding, brandDetails: brand }, isDemoData: true };
    }
  },

  async updateFindingStatus(id, newStatus, notes = '') {
    try {
      const data = await this.request(`/findings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewStatus: newStatus, reviewNotes: notes })
      });
      return { data, isDemoData: false };
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
      return { data: updated, isDemoData: true };
    }
  },

  // ==========================================
  // DASHBOARD AGGREGATES & SCANS
  // ==========================================

  async getDashboardStats() {
    try {
      const data = await this.request('/stats');
      return { data, isDemoData: false };
    } catch (err) {
      const { brands, findings, scans } = getStoredDemoData();

      const totalBrands = brands.length;
      const socialFindings = findings.filter(f => f.sourceType === 'social').length;
      const appFindings = findings.filter(f => f.sourceType === 'app').length;
      const suspiciousFindings = findings.filter(f => f.riskScore >= 60).length;

      // Realistic scan volume estimates
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
          recentFindings: findings.slice(0, 5),
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
