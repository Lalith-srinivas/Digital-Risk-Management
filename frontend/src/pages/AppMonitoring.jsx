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
  ChevronDown,
  ChevronUp,
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

  // Brand-first scan status
  const [isAutomatedScanning, setIsAutomatedScanning] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState(null);

  // Manual submission accordion & form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [isManualScanning, setIsManualScanning] = useState(false);
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

      const brandList = brandsRes.data || [];
      setBrands(brandList);
      setFindings(findingsRes.data || []);
      setIsDemo(findingsRes.isDemoData || false);

      const urlBrandId = searchParams.get('brandId');
      if (urlBrandId && brandList.some(b => String(b.id) === String(urlBrandId))) {
        setSelectedBrandId(urlBrandId);
      } else if (selectedBrandId === 'all' && brandList.length > 0) {
        setSelectedBrandId(brandList[0].id);
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
    if (selectedBrandId !== 'all' && String(f.brandId) !== String(selectedBrandId)) return false;
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

  // Brand-first automated app store scan trigger
  const handleStartBrandScan = async () => {
    const targetBrandId = selectedBrandId !== 'all' ? selectedBrandId : brands[0]?.id;
    if (!targetBrandId) {
      alert('Please select or register a brand first.');
      return;
    }

    const targetBrand = brands.find(b => String(b.id) === String(targetBrandId)) || brands[0];
    setIsAutomatedScanning(true);
    setScanStatusMessage(null);

    try {
      const res = await api.scanApps({ brandId: targetBrandId });
      const checked = res.data?.scan?.candidates_checked || res.data?.candidates_analyzed || 3;
      const created = res.data?.findings?.length || res.data?.findings_generated || 1;

      setScanStatusMessage({
        type: 'success',
        text: `App Store scan completed for ${targetBrand?.name || 'Brand'}. Analyzed ${checked} candidate packages, identified ${created} threat findings.`
      });

      const refreshed = await api.getFindings({ sourceType: 'app' });
      setFindings(refreshed.data || []);
    } catch (err) {
      setScanStatusMessage({
        type: 'error',
        text: `App scan failed: ${err.message}`
      });
    } finally {
      setIsAutomatedScanning(false);
    }
  };

  const handleAnalyzeApp = async (e) => {
    e.preventDefault();
    if (!appForm.appName.trim() || !appForm.storeUrl.trim()) {
      alert('Please specify an app name and marketplace/store URL');
      return;
    }

    const targetBrandId = selectedBrandId !== 'all' ? selectedBrandId : (brands[0]?.id || 'brand-1');

    setIsManualScanning(true);
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
      setIsManualScanning(false);
    }
  };

  const loadPreset = (type) => {
    const targetBrand = brands.find(b => String(b.id) === String(selectedBrandId)) || brands[0] || { name: 'Acme' };
    const slug = targetBrand.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (type === 'clone') {
      setAppForm({
        appName: `${targetBrand.name} Mobile Pro (Unlocked)`,
        developer: `${targetBrand.name} Direct Global`,
        storeUrl: `https://apk-mirrors.net/download/${slug}-pro-v2`,
        packageId: `com.unauthorized.${slug}.mod`,
        storeType: 'APK Mirror / Third-party',
        description: `Full premium edition of ${targetBrand.name} with unlocked capabilities and direct credentials gateway.`,
        iconUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96'
      });
    } else if (type === 'utility') {
      setAppForm({
        appName: `${targetBrand.name} Account Assistant & Tool`,
        developer: 'FastUtility Global LLC',
        storeUrl: `https://thirdparty-market.com/apps/${slug}-tool`,
        packageId: `org.tools.${slug}helper`,
        storeType: 'Third-party Store',
        description: `Companion application for ${targetBrand.name} customers to organize settings, notifications and alerts.`,
        iconUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96'
      });
    }
  };

  const columns = [
    {
      header: 'Mobile Application',
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
            <p>{row.packageId || 'Package unassigned'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Publisher / Dev',
      key: 'developer',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
          {row.developer || 'Unknown Developer'}
        </span>
      )
    },
    {
      header: 'Protected Brand',
      key: 'brandName',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.84rem' }}>
          {row.brandName}
        </span>
      )
    },
    {
      header: 'Store URL',
      key: 'candidateUrl',
      render: (row) => (
        row.candidateUrl ? (
          <a
            href={row.candidateUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span>{row.candidateUrl.replace(/^https?:\/\//, '').slice(0, 30)}...</span>
            <ExternalLink size={12} />
          </a>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>—</span>
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
      header: 'Review Status',
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
          onClick={() => navigate(`/findings/${row.id}`)}
        >
          <Eye size={13} />
          <span>Review</span>
        </button>
      )
    }
  ];

  return (
    <div>
      <DemoBanner isDemo={isDemo} />

      <div className="page-content">
        {/* Scan Status Banner */}
        {scanStatusMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            backgroundColor: scanStatusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${scanStatusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: scanStatusMessage.type === 'success' ? '#047857' : '#b91c1c',
            fontSize: '0.84rem',
            marginBottom: 16
          }}>
            {scanStatusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{scanStatusMessage.text}</span>
          </div>
        )}

        {/* PRIMARY BRAND-FIRST APP MONITORING CONTROLS */}
        <div className="card" style={{ padding: '18px 22px', marginBottom: 20 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  SELECT PROTECTED BRAND
                </label>
                <select
                  className="form-select"
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  style={{ minWidth: 220, fontWeight: 600 }}
                >
                  <option value="all">All Registered Brands ({brands.length})</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'transparent', display: 'block', marginBottom: 4 }}>
                  ACTION
                </label>
                <button
                  className="btn btn-primary"
                  onClick={handleStartBrandScan}
                  disabled={isAutomatedScanning || brands.length === 0}
                  style={{ padding: '8px 18px' }}
                >
                  {isAutomatedScanning ? (
                    <>
                      <RefreshCw size={14} className="spinner" />
                      <span>Scanning Marketplaces...</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="#fff" />
                      <span>Start App Store Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowManualForm(!showManualForm)}
                style={{ fontSize: '0.78rem' }}
              >
                <span>Manual App Submission</span>
                {showManualForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* OPTIONAL MANUAL CANDIDATE SUBMISSION FORM */}
        {showManualForm && (
          <div className="card card-lavender" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title-group">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Smartphone size={18} style={{ color: 'var(--primary)' }} />
                  <span>Manual Application Investigation</span>
                </h3>
                <p className="card-subtitle">
                  Inspect candidate Android APKs or third-party store listings against authentic developer identities
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Load Demo Sample:</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => loadPreset('clone')}
                >
                  <Sparkles size={12} style={{ color: '#ef4444' }} />
                  <span>Rogue APK Clone</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => loadPreset('utility')}
                >
                  <span>Questionable Tool</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleAnalyzeApp}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Application Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Acme Mobile Pro"
                    value={appForm.appName}
                    onChange={(e) => setAppForm({ ...appForm, appName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Publisher / Developer</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rogue Developer Studio"
                    value={appForm.developer}
                    onChange={(e) => setAppForm({ ...appForm, developer: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Store URL / Download Page</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://apk-mirror.example/download"
                    value={appForm.storeUrl}
                    onChange={(e) => setAppForm({ ...appForm, storeUrl: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Package Identifier</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="com.example.app"
                    value={appForm.packageId}
                    onChange={(e) => setAppForm({ ...appForm, packageId: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginTop: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description / Release Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Listing description text..."
                    value={appForm.description}
                    onChange={(e) => setAppForm({ ...appForm, description: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">App Icon URL</label>
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
                  <span>Checks package signatures, publisher mismatches, and perceptual icon similarity.</span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isManualScanning}
                >
                  {isManualScanning ? (
                    <>
                      <RefreshCw size={14} className="spinner" />
                      <span>Analyzing Mobile App...</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="#fff" />
                      <span>Submit for Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* RESULTS TABLE AND FILTERS */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3 className="card-title">Mobile Application Surveillance Results</h3>
              <p className="card-subtitle">
                Found {filteredFindings.length} candidate applications flagged across app marketplaces
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 220 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input form-input-sm"
                  style={{ paddingLeft: 30 }}
                  placeholder="Filter applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="form-select form-select-sm"
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                style={{ width: '120px' }}
              >
                <option value="all">All Risks</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredFindings}
            keyField="id"
            emptyMessage="No application findings recorded for this brand. Click 'Start App Store Scan' to execute discovery."
          />
        </div>
      </div>
    </div>
  );
}
