import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadCsvReport, downloadPdfReport } from '../utils/reports';
import RiskBadge from '../components/RiskBadge';

export default function ScanResults() {
  const navigate = useNavigate();
  const { user, isGuest, guestScanResults } = useAuth();

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'social', 'app'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [guestModeDismissed, setGuestModeDismissed] = useState(false);

  // If no in-memory results exist, provide an empty or redirect state
  const scanData = guestScanResults || {
    brand_name: 'Target Enterprise Brand',
    candidates_analyzed: 8,
    findings_generated: 4,
    social_analyzed: 5,
    apps_analyzed: 3,
    sources_checked: ['Twitter/X', 'Telegram', 'Instagram', 'Google Play Store', 'Apple App Store'],
    findings: [],
    is_demo: true,
    is_guest: true,
  };

  const findings = scanData.findings || [];

  // Metrics computation
  const highRiskCount = findings.filter(
    (f) => (f.riskLevel || f.risk_level || '').toLowerCase() === 'high' || (f.riskLevel || f.risk_level || '').toLowerCase() === 'critical'
  ).length;

  const medRiskCount = findings.filter(
    (f) => (f.riskLevel || f.risk_level || '').toLowerCase() === 'medium'
  ).length;

  const lowRiskCount = findings.filter(
    (f) => (f.riskLevel || f.risk_level || '').toLowerCase() === 'low'
  ).length;

  // Filtered findings
  const filteredFindings = findings.filter((f) => {
    // Vector tab
    if (activeTab === 'social' && (f.sourceType || f.source_type) !== 'social') return false;
    if (activeTab === 'app' && (f.sourceType || f.source_type) !== 'app') return false;

    // Risk severity
    if (selectedRisk !== 'ALL') {
      const rLevel = (f.riskLevel || f.risk_level || '').toUpperCase();
      if (rLevel !== selectedRisk) return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const name = (f.candidateName || f.candidate_name || '').toLowerCase();
      const handle = (f.candidateHandle || f.username || f.package_identifier || '').toLowerCase();
      const platform = (f.platform || '').toLowerCase();
      return name.includes(q) || handle.includes(q) || platform.includes(q);
    }

    return true;
  });

  const handleDownloadCsv = () => {
    downloadCsvReport(scanData.brand_name, findings, {
      candidatesAnalyzed: scanData.candidates_analyzed,
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
            {scanData.is_demo && (
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
            )}
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
            Surveillance complete across social handles and application marketplaces.
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Candidates Scanned</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>
            {scanData.candidates_analyzed || findings.length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {scanData.social_analyzed || 5} social • {scanData.apps_analyzed || 3} apps
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
        <div style={{ display: 'flex', gap: '6px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
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
                width: '200px',
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
              background: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <CheckCircle2 size={24} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
              No Impersonation Candidates Found
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
              No matches met the filter criteria across the configured discovery sources.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Candidate Identity</th>
                  <th style={{ padding: '12px 18px' }}>Vector</th>
                  <th style={{ padding: '12px 18px' }}>Review Priority</th>
                  <th style={{ padding: '12px 18px' }}>Evidence Summary</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFindings.map((f, i) => {
                  const rScore = f.riskScore !== undefined ? f.riskScore : (f.risk_score || 0);
                  const rLevel = f.riskLevel || f.risk_level || 'Low';
                  const isSocial = (f.sourceType || f.source_type) === 'social';

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
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={f.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96'}
                            alt=""
                            style={{ width: '36px', height: '36px', borderRadius: isSocial ? '50%' : '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                          />
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>
                              {f.candidateName || f.candidate_name || 'Candidate'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {f.candidateHandle || f.username || f.package_identifier || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '4px', background: '#f1f5f9', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                          {isSocial ? <Share2 size={13} color="#4f46e5" /> : <Smartphone size={13} color="#059669" />}
                          {f.platform || (isSocial ? 'Social' : 'App Marketplace')}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <RiskBadge level={rLevel} score={rScore} />
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                            {rScore}/100
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', maxWidth: '320px' }}>
                        <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                          {(f.reasons && f.reasons[0]) || f.explanation || 'Trademark similarity signal triggered.'}
                        </div>
                        {f.evidence?.name_similarity !== undefined && (
                          <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px', fontWeight: '600' }}>
                            Lexical match: {Math.round(f.evidence.name_similarity)}%
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {(f.candidateUrl || f.source_url) ? (
                          <a
                            href={f.candidateUrl || f.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#4f46e5',
                              background: '#f5f3ff',
                              border: '1px solid #ddd6fe',
                              borderRadius: '6px',
                              textDecoration: 'none',
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
