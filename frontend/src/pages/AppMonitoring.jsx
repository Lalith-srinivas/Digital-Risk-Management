import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Search,
  Filter,
  Play,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Info,
  Sparkles,
  Eye,
  RefreshCw,
  Download
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import DemoBanner from '../components/DemoBanner';
import api from '../services/api';
import { formatRelativeTime } from '../utils/formatters';

export default function AppMonitoring() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(searchParams.get('brandId') || 'all');
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Filters
  const [filterRisk, setFilterRisk] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [appForm, setAppForm] = useState({
    appName: '',
    developer: '',
    storeUrl: '',
    packageId: '',
    storeType: 'APK Mirror / Third-party',
    description: '',
    iconUrl: ''
  });

  // Modal State
  const [inspectCandidate, setInspectCandidate] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [brandsRes, findingsRes] = await Promise.all([
        api.getBrands(),
        api.getFindings({ sourceType: 'app' })
      ]);

      setBrands(brandsRes.data || []);
      setFindings(findingsRes.data || []);
      setIsDemo(findingsRes.isDemoData || false);

      if (searchParams.get('brandId') && brandsRes.data?.length > 0) {
        setSelectedBrandId(searchParams.get('brandId'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFindings = findings.filter(f => {
    if (selectedBrandId !== 'all' && f.brandId !== selectedBrandId) return false;
    if (filterRisk !== 'all' && f.riskLevel?.toLowerCase() !== filterRisk.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.candidateName?.toLowerCase().includes(q);
      const matchPackage = f.packageId?.toLowerCase().includes(q);
      const matchDev = f.developer?.toLowerCase().includes(q);
      const matchBrand = f.brandName?.toLowerCase().includes(q);
      if (!matchName && !matchPackage && !matchDev && !matchBrand) return false;
    }
    return true;
  });

  const handleAnalyzeApp = async (e) => {
    e.preventDefault();
    if (!appForm.appName.trim() || !appForm.storeUrl.trim()) {
      alert('Please specify an app name and marketplace/store URL');
      return;
    }

    const targetBrandId = selectedBrandId !== 'all' ? selectedBrandId : (brands[0]?.id || 'brand-1');

    setIsScanning(true);
    setScanResult(null);

    try {
      const res = await api.scanApps({
        brandId: targetBrandId,
        appName: appForm.appName,
        developer: appForm.developer,
        storeUrl: appForm.storeUrl,
        packageId: appForm.packageId,
        storeType: appForm.storeType,
        description: appForm.description,
        iconUrl: appForm.iconUrl
      });

      setScanResult(res.data);
      const refreshed = await api.getFindings({ sourceType: 'app' });
      setFindings(refreshed.data || []);
    } catch (err) {
      alert(err.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const loadPreset = (type) => {
    if (type === 'trojan') {
      setAppForm({
        appName: 'Apex Mobile Banking Pro - Instant Loan Fast',
        developer: 'Apex Quick Finance LTD',
        storeUrl: 'https://apk-mirror-store-example.org/download/apex-mobile-loan.apk',
        packageId: 'com.apexsec.bankloans',
        storeType: 'APK Mirror / Third-party',
        description: 'Instant mobile credit banking application. Log in with your Apex online banking credentials to unlock $5,000 credit line.',
        iconUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96'
      });
    } else if (type === 'wallet') {
      setAppForm({
        appName: 'NovaPay Fast Multi-Currency Wallet',
        developer: 'Nova Soft Labs',
        storeUrl: 'https://app-host-world.cc/nova-fast-pay',
        packageId: 'com.novafast.paywallet',
        storeType: 'Alternative Android App Store',
        description: 'Send and receive crypto and fiat payments anywhere.',
        iconUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=96'
      });
    }
  };

  const columns = [
    {
      header: 'Application Name & Package',
      key: 'candidateName',
      sortable: true,
      render: (row) => (
        <div className="candidate-cell">
          <img
            src={row.avatarUrl || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=64'}
            alt=""
            className="candidate-avatar square"
          />
          <div className="candidate-info">
            <h4>{row.candidateName}</h4>
            <p>{row.packageId || 'Package ID unlisted'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Developer / Publisher',
      key: 'developer',
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
          {row.developer || 'Unverified Publisher'}
        </span>
      )
    },
    {
      header: 'Target Brand',
      key: 'brandName',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.82rem' }}>
          {row.brandName}
        </span>
      )
    },
    {
      header: 'Name Sim.',
      key: 'nameSimilarity',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 44, height: 6, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${row.nameSimilarity || 0}%`,
              height: '100%',
              backgroundColor: (row.nameSimilarity || 0) > 80 ? '#ef4444' : '#6366f1'
            }} />
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{row.nameSimilarity || 0}%</span>
        </div>
      )
    },
    {
      header: 'Icon Match',
      key: 'logoSimilarity',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 44, height: 6, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${row.logoSimilarity || 0}%`,
              height: '100%',
              backgroundColor: (row.logoSimilarity || 0) > 80 ? '#ef4444' : '#8b5cf6'
            }} />
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{row.logoSimilarity || 0}%</span>
        </div>
      )
    },
    {
      header: 'Risk Score',
      key: 'riskScore',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: row.riskScore >= 75 ? '#dc2626' : row.riskScore >= 45 ? '#d97706' : '#059669' }}>
          {row.riskScore}/100
        </span>
      )
    },
    {
      header: 'Risk Level',
      key: 'riskLevel',
      render: (row) => <RiskBadge level={row.riskLevel} />
    },
    {
      header: 'Status',
      key: 'reviewStatus',
      render: (row) => (
        <span style={{
          fontSize: '0.74rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          backgroundColor: '#f8fafc',
          padding: '3px 8px',
          borderRadius: 999,
          border: '1px solid var(--border-light)'
        }}>
          {row.reviewStatus}
        </span>
      )
    },
    {
      header: 'Action',
      key: 'actions',
      render: (row) => (
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setInspectCandidate(row)}
        >
          <Eye size={13} />
          <span>Inspect</span>
        </button>
      )
    }
  ];

  return (
    <div>
      <DemoBanner isDemo={isDemo} />

      <div className="page-content">
        {/* Top Controls Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 260px) 1fr auto',
          gap: 14,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Brand Selector */}
          <div>
            <select
              className="form-select"
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
            >
              <option value="all">All Monitored Brands ({brands.length})</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search suspect application packages, publishers, or names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Risk Filter */}
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              className="form-select"
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              style={{ width: '130px' }}
            >
              <option value="all">All Risks</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
        </div>

        {/* Candidate Application Submission Form Card */}
        <div className="card card-lavender">
          <div className="card-header">
            <div className="card-title-group">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Smartphone size={18} style={{ color: 'var(--primary)' }} />
                <span>Submit Candidate Application for Deception Analysis</span>
              </h3>
              <p className="card-subtitle">
                Compare mobile application packages, manifest permissions, and icon similarity against official brand apps
              </p>
            </div>

            {/* Quick Test Presets */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Load Demo Sample:</span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => loadPreset('trojan')}
              >
                <Sparkles size={12} style={{ color: '#ef4444' }} />
                <span>Fake Banking APK</span>
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => loadPreset('wallet')}
              >
                <span>Derivative Wallet</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleAnalyzeApp}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label required">Application Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Apex Mobile Banking Pro"
                  value={appForm.appName}
                  onChange={(e) => setAppForm({ ...appForm, appName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Package Identifier</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. com.apexsec.bankloans"
                  value={appForm.packageId}
                  onChange={(e) => setAppForm({ ...appForm, packageId: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Developer / Publisher Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Quick Apex Capital LTD"
                  value={appForm.developer}
                  onChange={(e) => setAppForm({ ...appForm, developer: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Marketplace / Distribution Channel</label>
                <select
                  className="form-select"
                  value={appForm.storeType}
                  onChange={(e) => setAppForm({ ...appForm, storeType: e.target.value })}
                >
                  <option value="APK Mirror / Third-party">APK Mirror / Third-party Store</option>
                  <option value="Google Play Store">Google Play Store</option>
                  <option value="Apple App Store">Apple App Store</option>
                  <option value="Direct Download Website">Direct Download Website</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label required">Store / Download URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://apk-mirror-store-example.org/download/..."
                  value={appForm.storeUrl}
                  onChange={(e) => setAppForm({ ...appForm, storeUrl: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">App Icon URL (optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://.../icon.png"
                  value={appForm.iconUrl}
                  onChange={(e) => setAppForm({ ...appForm, iconUrl: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={14} />
                <span>Notice: Automated global app store scraping requires backend marketplace API connectors configured.</span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <RefreshCw size={14} className="spinner" />
                    <span>Analyzing APK Package...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} fill="#fff" />
                    <span>Run App Impersonation Analysis</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Scan result banner */}
          {scanResult && (
            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              border: '1px solid #c7d2fe',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {scanResult.summary}
                </span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setInspectCandidate(scanResult.finding)}
              >
                Inspect App Finding
              </button>
            </div>
          )}
        </div>

        {/* Results Table Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3 className="card-title">Flagged Application Candidates ({filteredFindings.length})</h3>
              <p className="card-subtitle">
                Mobile applications analyzed against brand registries and official release signatures
              </p>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredFindings}
            loading={loading}
            emptyTitle="No suspect applications detected"
            emptyMessage="No application candidates matched the current search filters."
            pageSize={7}
          />
        </div>
      </div>

      {/* ========================================================
          APP INSPECTION MODAL
         ======================================================== */}
      {inspectCandidate && (
        <Modal
          isOpen={!!inspectCandidate}
          onClose={() => setInspectCandidate(null)}
          title="Mobile Application Threat Inspection"
          size="large"
          footer={
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setInspectCandidate(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setInspectCandidate(null);
                  navigate(`/findings/${inspectCandidate.id}`);
                }}
              >
                Open Full Findings Dossier
              </button>
            </div>
          }
        >
          {/* Header comparison */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
            <img
              src={inspectCandidate.avatarUrl || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=64'}
              alt=""
              style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '2px solid #e2e8f0' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{inspectCandidate.candidateName}</h3>
                <RiskBadge level={inspectCandidate.riskLevel} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Targeting: <strong>{inspectCandidate.brandName}</strong> • Publisher: <strong>{inspectCandidate.developer || 'Unknown'}</strong>
              </p>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Package: <code>{inspectCandidate.packageId || 'Unlisted'}</code>
              </div>
            </div>
          </div>

          {/* Scores Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>OVERALL RISK SCORE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: inspectCandidate.riskScore >= 75 ? '#dc2626' : '#d97706' }}>
                {inspectCandidate.riskScore}/100
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>NAME SIMILARITY</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
                {inspectCandidate.nameSimilarity || 0}%
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ICON VECTOR SIMILARITY</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6' }}>
                {inspectCandidate.logoSimilarity || 0}%
              </div>
            </div>
          </div>

          {/* Reasons */}
          <div>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
              Identified Threat Signals:
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inspectCandidate.reasons?.map((r, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    backgroundColor: '#fafbfc',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}
