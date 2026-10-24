import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Download,
  Share2,
  Smartphone,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  UserCheck,
  UserPlus,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Info,
  Database,
  Radio,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { downloadCsvReport, downloadPdfReport } from '../utils/reports';
import RiskBadge from '../components/RiskBadge';
import { sortFindingsByBrandRelevance, matchesBrandName } from '../utils/sorting';

export default function ScanResults() {
  const navigate = useNavigate();
  const { user, isGuest, guestScanResults } = useAuth();

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'social', 'app'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [guestModeDismissed, setGuestModeDismissed] = useState(false);
  const [connectorsStatus, setConnectorsStatus] = useState(null);

  // If no in-memory results exist, provide clean empty initial state
  const scanData = guestScanResults || {
    brand_name: 'Target Brand',
    candidates_analyzed: 0,
    findings_generated: 0,
    social_analyzed: 0,
    apps_analyzed: 0,
    sources_checked: ['Apple App Store', 'GitHub Public'],
    sources_status: {
      apple_app_store: { status: 'active', name: 'Apple App Store (iTunes API)' },
      github: { status: 'active', name: 'GitHub Public Search' },
      twitter: { status: 'unconfigured', name: 'Twitter/X API v2' },
      google_play: { status: 'unconfigured', name: 'Google Play Store' },
      telegram: { status: 'unconfigured', name: 'Telegram Bot API' },
    },
    findings: [],
    is_demo: false,
    is_guest: true,
  };

  const [liveFindings, setLiveFindings] = useState(null);

  useEffect(() => {
    // If brand_id is present, query backend findings to ensure exact matching results
    const brandId = scanData.brand_id || scanData.brandId;
    if (brandId) {
      api.getFindings({ brandId }).then((res) => {
        if (res.data && res.data.length > 0) {
          setLiveFindings(res.data);
        }
      }).catch((e) => console.warn('Could not sync live brand findings:', e));
    }

    // Load connectors status for honest display
    api.getConnectorsStatus().then((res) => {
      if (res.data) setConnectorsStatus(res.data);
    }).catch((e) => console.warn('Could not load connectors status:', e));
  }, [scanData.brand_id, scanData.brandId]);

  const brandName = scanData.brand_name || scanData.brandName || scanData.brand_verification?.name || '';
  const rawFindings = liveFindings || scanData.findings || [];
  const findings = useMemo(() => {
    return sortFindingsByBrandRelevance(rawFindings, brandName, 'riskScore');
  }, [rawFindings, brandName]);

  // Metrics computation
  const highRiskCount = findings.filter((f) => {
    const lvl = (f.riskLevel || f.risk_level || '').toLowerCase();
    const score = f.riskScore !== undefined ? f.riskScore : (f.risk_score || 0);
    return lvl === 'high' || lvl === 'critical' || score >= 60;
  }).length;

  const medRiskCount = findings.filter((f) => {
    const lvl = (f.riskLevel || f.risk_level || '').toLowerCase();
    const score = f.riskScore !== undefined ? f.riskScore : (f.risk_score || 0);
    return lvl === 'medium' || (score >= 30 && score < 60);
  }).length;

  const lowRiskCount = findings.filter((f) => {
    const lvl = (f.riskLevel || f.risk_level || '').toLowerCase();
    const score = f.riskScore !== undefined ? f.riskScore : (f.risk_score || 0);
    return lvl === 'low' || score < 30;
  }).length;

  const socialCount = findings.filter((f) => (f.sourceType || f.source_type) === 'social').length;
  const appCount = findings.filter((f) => (f.sourceType || f.source_type) === 'app').length;

  const [graphTab, setGraphTab] = useState('severity'); // 'severity' | 'vectors'

  // Calculate Brand Risk Score (0-100) based on scan findings
  const brandRiskScore = Math.min(100, Math.max(0, (() => {
    if (findings.length === 0) return 0;
    const scores = findings.map(f => (f.riskScore !== undefined ? f.riskScore : (f.risk_score || 0)));
    const maxScore = Math.max(...scores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const penalty = Math.min(20, highRiskCount * 8 + medRiskCount * 2);
    return Math.round(0.6 * maxScore + 0.4 * avgScore + penalty);
  })()));

  const getRiskPostureInfo = (score) => {
    if (score >= 75) {
      return {
        level: 'CRITICAL RISK',
        color: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
        badgeBg: '#dc2626',
        desc: 'Critical impersonation threats detected. High-similarity accounts or unauthorized mobile apps warrant immediate escalation.',
      };
    }
    if (score >= 50) {
      return {
        level: 'HIGH RISK',
        color: '#ea580c',
        bg: '#fff7ed',
        border: '#ffedd5',
        badgeBg: '#ea580c',
        desc: 'Significant brand infringement signals identified. Priority candidates require analyst triage and identity verification.',
      };
    }
    if (score >= 25) {
      return {
        level: 'MODERATE RISK',
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        badgeBg: '#d97706',
        desc: 'Potential look-alikes or unofficial packages found. Moderate name or visual overlap with protected brand assets.',
      };
    }
    return {
      level: 'LOW / MINIMAL RISK',
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      badgeBg: '#16a34a',
      desc: 'No high-priority impersonation detected. Candidates are low similarity, fan communities, or verified corporate accounts.',
    };
  };

  const riskPosture = getRiskPostureInfo(brandRiskScore);

  // Graph Data: Severity Breakdown
  const severityDonutData = [
    { name: 'High Priority', value: highRiskCount, color: '#ef4444' },
    { name: 'Medium Risk', value: medRiskCount, color: '#f59e0b' },
    { name: 'Low / Benign', value: lowRiskCount, color: '#10b981' },
  ].filter(d => d.value > 0);

  const displayDonutData = severityDonutData.length > 0 ? severityDonutData : [
    { name: 'Clean / No Risks', value: 1, color: '#10b981' }
  ];

  // Graph Data: Surface Vectors Breakdown
  const vectorBarData = [
    {
      name: 'Social Media',
      high: findings.filter(f => (f.sourceType || f.source_type) === 'social' && ((f.riskLevel || f.risk_level || '').toLowerCase() === 'high' || (f.riskScore || 0) >= 60)).length,
      medium: findings.filter(f => (f.sourceType || f.source_type) === 'social' && ((f.riskLevel || f.risk_level || '').toLowerCase() === 'medium' || ((f.riskScore || 0) >= 30 && (f.riskScore || 0) < 60))).length,
      low: findings.filter(f => (f.sourceType || f.source_type) === 'social' && ((f.riskLevel || f.risk_level || '').toLowerCase() === 'low' || (f.riskScore || 0) < 30)).length,
    },
    {
      name: 'App Stores',
      high: findings.filter(f => (f.sourceType || f.source_type) === 'app' && ((f.riskLevel || f.risk_level || '').toLowerCase() === 'high' || (f.riskScore || 0) >= 60)).length,
      medium: findings.filter(f => (f.sourceType || f.source_type) === 'app' && ((f.riskLevel || f.risk_level || '').toLowerCase() === 'medium' || ((f.riskScore || 0) >= 30 && (f.riskScore || 0) < 60))).length,
      low: findings.filter(f => (f.sourceType || f.source_type) === 'app' && ((f.riskLevel || f.risk_level || '').toLowerCase() === 'low' || (f.riskScore || 0) < 30)).length,
    },
  ];

  // Filtered findings
  const filteredFindings = findings.filter((f) => {
    const sType = f.sourceType || f.source_type || '';
    if (activeTab === 'social' && sType !== 'social') return false;
    if (activeTab === 'app' && sType !== 'app') return false;

    // Risk severity
    if (selectedRisk !== 'ALL') {
      const rLevel = (f.riskLevel || f.risk_level || '').toUpperCase();
      if (rLevel !== selectedRisk) return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const cand = f.candidate || {};
      const name = (f.candidateName || cand.candidate_name || f.candidate_name || '').toLowerCase();
      const handle = (f.candidateHandle || cand.username || cand.package_identifier || f.username || f.package_identifier || '').toLowerCase();
      const platform = (f.platform || cand.platform || '').toLowerCase();
      return name.includes(q) || handle.includes(q) || platform.includes(q);
    }

    return true;
  });

  const handleDownloadCsv = () => {
    downloadCsvReport(scanData.brand_name, findings, {
      candidatesAnalyzed: scanData.candidates_analyzed || findings.length,
    });
  };

  const handleDownloadPdf = () => {
    downloadPdfReport(scanData.brand_name, findings, {
      candidatesAnalyzed: scanData.candidates_analyzed,
    });
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '28px auto', padding: '0 24px' }}>
      {/* Results First Mode Choice Banner (Phase 8 Requirement) */}
      {!user && !guestModeDismissed && (
        <div style={{
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          border: '1px solid #c4b5fd',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.08)',
        }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                background: '#7c3aed',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
              }}>
                Guest Scan Mode
              </span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#4c1d95' }}>
                Scan Complete — Choose How to Proceed
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#5b21b6', margin: 0, lineHeight: '1.5' }}>
              Your scan results for <strong>{scanData.brand_name}</strong> are currently held in memory. You can download reports now or create an account to save findings and monitor your brand continuously.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setGuestModeDismissed(true)}
              style={{
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#6d28d9',
                background: '#ffffff',
                border: '1px solid #ddd6fe',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Continue as Guest
            </button>
            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(109, 40, 217, 0.25)',
              }}
            >
              <UserPlus size={15} /> Create Account / Sign In
            </button>
          </div>
        </div>
      )}

      {/* Honest Error / Service Unavailable Notice */}
      {(scanData.error || scanData.status === 'error') && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '18px 22px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: '800', fontSize: '15px' }}>
              <AlertTriangle size={18} color="#dc2626" />
              Live Scanning Unavailable
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#b91c1c', maxWidth: '640px', lineHeight: '1.4' }}>
              {scanData.scan_message || 'Unable to connect with the backend surveillance engine. An honest error is displayed — zero threats are never assumed on connector failure.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/scan')}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#ffffff',
              background: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Launch Demo Simulation
          </button>
        </div>
      )}

      {/* Brand Verification Status Banner */}
      {scanData.brand_verification && (
        <div style={{
          background: scanData.brand_verification.verified ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${scanData.brand_verification.verified ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {scanData.brand_verification.verified ? (
              <ShieldCheck size={20} color="#16a34a" />
            ) : (
              <Info size={20} color="#d97706" />
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: scanData.brand_verification.verified ? '#166534' : '#92400e' }}>
                {scanData.brand_verification.verified
                  ? `Brand Identity Verified: ${scanData.brand_verification.domain || scanData.brand_name}`
                  : `Unverified Brand Identity: "${scanData.brand_name}"`}
              </div>
              <div style={{ fontSize: '12px', color: scanData.brand_verification.verified ? '#15803d' : '#b45309', marginTop: '2px' }}>
                {scanData.brand_verification.details || (scanData.brand_verification.verified ? 'Official authoritative domain validated via DNS.' : 'Could not confirm an authoritative DNS record or corporate domain.')}
                {' '}• Confidence: <strong>{(scanData.brand_verification.confidence || 'none').toUpperCase()}</strong>
              </div>
            </div>
          </div>
          {!scanData.brand_verification.verified && (
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px' }}>
              UNVERIFIED IDENTIFIER
            </span>
          )}
        </div>
      )}

      {/* Data Source Connectors Status Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: '700' }}>
          <Database size={14} color="#6366f1" />
          <span>Surveillance Connectors:</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(scanData.sources_status || connectorsStatus || {
            apple_app_store: { status: 'active', name: 'Apple App Store' },
            github: { status: 'active', name: 'GitHub' },
            twitter: { status: 'unconfigured', name: 'Twitter/X' },
            google_play: { status: 'unconfigured', name: 'Google Play' },
            telegram: { status: 'unconfigured', name: 'Telegram' },
          }).map(([key, info]) => {
            const isActive = info.status === 'active';
            const isDemo = info.status === 'demo';
            const label = info.name || key.replace(/_/g, ' ');
            return (
              <span
                key={key}
                title={info.message || (info.required_keys ? `Requires: ${(info.required_keys || []).join(', ')}` : '')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: isActive ? '#ecfdf5' : (isDemo ? '#fef3c7' : '#f1f5f9'),
                  color: isActive ? '#065f46' : (isDemo ? '#92400e' : '#64748b'),
                  border: `1px solid ${isActive ? '#a7f3d0' : (isDemo ? '#fde68a' : '#e2e8f0')}`,
                }}
              >
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isActive ? '#10b981' : (isDemo ? '#f59e0b' : '#94a3b8'),
                }} />
                {label}: {isActive ? 'Live' : (isDemo ? 'Demo' : 'Unconfigured')}
              </span>
            );
          })}
        </div>
      </div>

      {/* Top Header & Export Toolbar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Scan Results: {scanData.brand_name}
            </h1>
            {scanData.is_demo ? (
              <span style={{
                background: '#fef3c7',
                color: '#b45309',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid #fde68a',
              }}>
                SIMULATED CANDIDATES
              </span>
            ) : (
              <span style={{
                background: '#ecfdf5',
                color: '#065f46',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid #a7f3d0',
              }}>
                LIVE SURVEILLANCE
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
            {scanData.scan_message || 'Evidence-based discovery across active application stores and public platforms.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/scan')}
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} /> Start Another Scan
          </button>

          <button
            onClick={handleDownloadCsv}
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#0f172a',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileSpreadsheet size={15} color="#059669" /> Download CSV
          </button>

          <button
            onClick={handleDownloadPdf}
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)',
            }}
          >
            <FileText size={15} /> Download PDF Dossier
          </button>
        </div>
      </div>

      {/* Metrics KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Candidates Scanned</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>
            {scanData.candidates_analyzed !== undefined ? scanData.candidates_analyzed : findings.length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {(scanData.social_analyzed !== undefined ? scanData.social_analyzed : socialCount)} social • {(scanData.apps_analyzed !== undefined ? scanData.apps_analyzed : appCount)} apps
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>High Priority Risks</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
            {highRiskCount}
          </div>
          <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px' }}>Requires immediate review</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #fef3c7', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>Medium Risk Alerts</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
            {medRiskCount}
          </div>
          <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>Potential look-alikes</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #dcfce7', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>Low / Benign Profiles</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
            {lowRiskCount}
          </div>
          <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>Fan communities / official</div>
        </div>
      </div>

      {/* Executive Brand Threat Assessment & Results Graph */}
      <div className="scan-assessment-grid">
        {/* Left: Overall Brand Risk Score Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Brand Risk Score
                </h3>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#ffffff',
                background: riskPosture.badgeBg,
                padding: '3px 8px',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
              }}>
                {riskPosture.level}
              </span>
            </div>

            {/* Score Ring & Value */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '12px 0' }}>
              <div style={{ position: 'relative', width: 104, height: 104, flexShrink: 0 }}>
                <svg width="104" height="104" viewBox="0 0 104 104" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="52"
                    cy="52"
                    r="42"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="10"
                  />
                  <circle
                    cx="52"
                    cy="52"
                    r="42"
                    fill="transparent"
                    stroke={riskPosture.color}
                    strokeWidth="10"
                    strokeDasharray={263.89}
                    strokeDashoffset={263.89 - (263.89 * brandRiskScore) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                    {brandRiskScore}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>
                    / 100
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Overall Threat Posture
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.45, margin: 0 }}>
                  {riskPosture.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{
            background: riskPosture.bg,
            border: `1px solid ${riskPosture.border}`,
            borderRadius: '8px',
            padding: '9px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            marginTop: 10,
          }}>
            <span style={{ color: riskPosture.color, fontWeight: 700 }}>
              Peak Threat Score:
            </span>
            <span style={{ color: riskPosture.color, fontWeight: 800, fontSize: '13px' }}>
              {findings.length > 0 ? `${Math.max(...findings.map(f => (f.riskScore !== undefined ? f.riskScore : (f.risk_score || 0))))}/100` : '0/100'}
            </span>
          </div>
        </div>

        {/* Right: Risk Severity & Vector Threat Graph */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          minWidth: 0,
        }}>
          {/* Header & Graph Tab Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            flexWrap: 'wrap',
            gap: 10,
          }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Scan Results Threat Graph
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                {graphTab === 'severity'
                  ? 'Severity proportions across all detected candidates'
                  : 'Vector comparison across social and mobile channels'}
              </p>
            </div>

            {/* Toggle Graph View */}
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '3px',
              gap: 4,
            }}>
              <button
                type="button"
                onClick={() => setGraphTab('severity')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: graphTab === 'severity' ? '#ffffff' : 'transparent',
                  color: graphTab === 'severity' ? '#4f46e5' : '#64748b',
                  boxShadow: graphTab === 'severity' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <PieChartIcon size={13} />
                <span>Severity Breakdown</span>
              </button>

              <button
                type="button"
                onClick={() => setGraphTab('vectors')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: graphTab === 'vectors' ? '#ffffff' : 'transparent',
                  color: graphTab === 'vectors' ? '#4f46e5' : '#64748b',
                  boxShadow: graphTab === 'vectors' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <BarChart3 size={13} />
                <span>Vector Breakdown</span>
              </button>
            </div>
          </div>

          {/* Graph Content */}
          <div style={{ width: '100%', height: 175, minWidth: 0 }}>
            {graphTab === 'severity' ? (
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}>
                <div style={{ width: '55%', height: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayDonutData}
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {displayDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      {findings.length}
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Findings
                    </span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} /> High Risk:
                    </span>
                    <span style={{ fontWeight: 800, color: '#dc2626' }}>{highRiskCount}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} /> Medium Risk:
                    </span>
                    <span style={{ fontWeight: 800, color: '#d97706' }}>{medRiskCount}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} /> Low / Benign:
                    </span>
                    <span style={{ fontWeight: 800, color: '#16a34a' }}>{lowRiskCount}</span>
                  </div>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vectorBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} />
                  <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="high" name="High Risk" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="medium" name="Medium Risk" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="low" name="Low / Benign" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Vector Tabs */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
      }}>
        {/* Vector Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Findings (${findings.length})` },
            { id: 'social', label: `Social Media (${findings.filter(f => (f.sourceType || f.source_type) === 'social').length})` },
            { id: 'app', label: `App Marketplaces (${findings.filter(f => (f.sourceType || f.source_type) === 'app').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? '700' : '500',
                color: activeTab === tab.id ? '#4f46e5' : '#64748b',
                background: activeTab === tab.id ? '#e0e7ff' : '#f8fafc',
                border: activeTab === tab.id ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Risk Level Filter */}
        <div className="table-filter-toolbar">
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search candidate or handle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '7px 12px 7px 32px',
                fontSize: '13px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            style={{
              padding: '7px 12px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              background: '#ffffff',
              color: '#334155',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Risk Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Findings Table Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        {filteredFindings.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '24px',
              background: scanData.brand_verification?.verified ? '#ecfdf5' : '#f1f5f9',
              color: scanData.brand_verification?.verified ? '#059669' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              {scanData.brand_verification?.verified ? <CheckCircle2 size={24} /> : <Search size={24} />}
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
              {scanData.brand_verification?.verified
                ? 'Brand Verified: No Threat Candidates Detected'
                : 'No Candidates Discovered on Monitored Channels'}
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '480px', margin: '0 auto 16px', lineHeight: '1.5' }}>
              {scanData.brand_verification?.verified
                ? 'No rogue applications or unauthorized profiles were identified across active surveillance channels for this verified corporate brand.'
                : `No candidates matched "${scanData.brand_name}" across active connectors. (Note: Identifier could not be verified against authoritative records. This does not automatically certify the query is safe).`}
            </p>
            {!scanData.is_demo && (
              <button
                onClick={() => navigate('/scan')}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#4f46e5',
                  background: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Try Demo Simulation Mode
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 18px', width: '24%', minWidth: '210px' }}>Candidate Identity</th>
                  <th style={{ padding: '14px 18px', width: '15%', minWidth: '130px', whiteSpace: 'nowrap' }}>Vector</th>
                  <th style={{ padding: '14px 18px', width: '16%', minWidth: '140px', whiteSpace: 'nowrap' }}>Review Priority</th>
                  <th className="cell-wrap" style={{ padding: '14px 18px', width: '33%', minWidth: '280px', whiteSpace: 'normal' }}>Evidence Summary</th>
                  <th style={{ padding: '14px 18px', width: '12%', minWidth: '110px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFindings.map((f, i) => {
                  const cand = f.candidate || {};
                  const cName = f.candidateName || cand.candidate_name || f.candidate_name || 'Candidate Identity';
                  const cHandle = f.candidateHandle || cand.username || cand.package_identifier || f.username || f.package_identifier || 'N/A';
                  const cAvatar = f.avatarUrl || cand.image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96';
                  const isSocial = (f.sourceType || f.source_type) === 'social';
                  const cPlatform = f.platform || cand.platform || (isSocial ? 'Social Media' : 'App Marketplace');
                  const cUrl = f.candidateUrl || cand.source_url || f.source_url || '';
                  const rScore = f.riskScore !== undefined ? f.riskScore : (f.risk_score !== undefined ? f.risk_score : 50);
                  const rLevel = f.riskLevel || f.risk_level || (rScore >= 80 ? 'Critical' : (rScore >= 60 ? 'High' : (rScore >= 30 ? 'Medium' : 'Low')));
                  const cEvidence = (f.reasons && f.reasons[0]) || f.explanation || (f.evidence?.reasons && f.evidence.reasons[0]) || 'Trademark similarity signal triggered.';

                  return (
                    <tr
                      key={f.id || i}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={cAvatar}
                            alt=""
                            style={{ width: '36px', height: '36px', borderRadius: isSocial ? '50%' : '8px', objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cHandle}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '4px', background: '#f1f5f9', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                          {isSocial ? <Share2 size={13} color="#4f46e5" /> : <Smartphone size={13} color="#059669" />}
                          {cPlatform}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <RiskBadge level={rLevel} score={rScore} />
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                            {rScore}/100
                          </span>
                        </div>
                      </td>

                      <td
                        className="cell-wrap"
                        style={{
                          padding: '14px 18px',
                          verticalAlign: 'middle',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          minWidth: '280px',
                          maxWidth: '460px',
                        }}
                      >
                        <div style={{
                          fontSize: '12.5px',
                          color: '#334155',
                          lineHeight: '1.5',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}>
                          {cEvidence}
                        </div>
                        {f.evidence?.name_similarity !== undefined && (
                          <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '4px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            Lexical match: {Math.round(f.evidence.name_similarity)}%
                          </div>
                        )}
                      </td>

                      <td style={{
                        padding: '14px 18px',
                        textAlign: 'right',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                        width: '110px',
                        minWidth: '110px',
                      }}>
                        {cUrl ? (
                          <a
                            href={cUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#4f46e5',
                              background: '#f5f3ff',
                              border: '1px solid #ddd6fe',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            }}
                          >
                            Inspect <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
