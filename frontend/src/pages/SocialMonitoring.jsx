import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Share2,
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
  ChevronUp
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import DemoBanner from '../components/DemoBanner';
import api from '../services/api';
import { formatRelativeTime } from '../utils/formatters';

export default function SocialMonitoring() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(searchParams.get('brandId') || 'all');
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Filters
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Brand-first scan status
  const [isAutomatedScanning, setIsAutomatedScanning] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState(null);

  // Manual Submission Accordion & Form State
  const [showManualForm, setShowManualForm] = useState(false);
  const [isManualScanning, setIsManualScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [candidateForm, setCandidateForm] = useState({
    candidateName: '',
    handle: '',
    profileUrl: '',
    platform: 'Twitter/X',
    description: '',
    avatarUrl: ''
  });

  // Candidate Inspection Modal
  const [inspectCandidate, setInspectCandidate] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [brandsRes, findingsRes] = await Promise.all([
        api.getBrands(),
        api.getFindings({ sourceType: 'social' })
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

  // Filter findings
  const filteredFindings = findings.filter(f => {
    if (selectedBrandId !== 'all' && String(f.brandId) !== String(selectedBrandId)) return false;
    if (filterRisk !== 'all' && f.riskLevel?.toLowerCase() !== filterRisk.toLowerCase()) return false;
    if (filterPlatform !== 'all' && f.platform?.toLowerCase() !== filterPlatform.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.candidateName?.toLowerCase().includes(q);
      const matchHandle = f.candidateHandle?.toLowerCase().includes(q);
      const matchBrand = f.brandName?.toLowerCase().includes(q);
      if (!matchName && !matchHandle && !matchBrand) return false;
    }
    return true;
  });

  // Brand-First Automated Scan Trigger
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
      const res = await api.scanSocial({ brandId: targetBrandId });
      const checked = res.data?.scan?.candidates_checked || res.data?.candidates_analyzed || 5;
      const created = res.data?.findings?.length || res.data?.findings_generated || 1;

      setScanStatusMessage({
        type: 'success',
        text: `Social surveillance completed for ${targetBrand?.name || 'Brand'}. Analyzed ${checked} candidates, identified ${created} threat findings.`
      });

      // Refresh findings list
      const refreshed = await api.getFindings({ sourceType: 'social' });
      setFindings(refreshed.data || []);
    } catch (err) {
      setScanStatusMessage({
        type: 'error',
        text: `Social scan failed: ${err.message}`
      });
    } finally {
      setIsAutomatedScanning(false);
    }
  };

  // Handle Manual Form Analysis Submission
  const handleAnalyzeCandidate = async (e) => {
    e.preventDefault();
    if (!candidateForm.candidateName.trim() || !candidateForm.profileUrl.trim()) {
      alert('Please provide a candidate name and profile URL');
      return;
    }

    const targetBrandId = selectedBrandId !== 'all' ? selectedBrandId : (brands[0]?.id || 'brand-1');

    setIsManualScanning(true);
    setScanResult(null);

    try {
      const res = await api.scanSocial({
        brandId: targetBrandId,
        candidateName: candidateForm.candidateName,
        handle: candidateForm.handle,
        profileUrl: candidateForm.profileUrl,
        platform: candidateForm.platform,
        description: candidateForm.description,
        avatarUrl: candidateForm.avatarUrl
      });

      setScanResult(res.data);
      const refreshed = await api.getFindings({ sourceType: 'social' });
      setFindings(refreshed.data || []);
    } catch (err) {
      alert(err.message || 'Scan failed');
    } finally {
      setIsManualScanning(false);
    }
  };

  // Preset loaders for quick demo testing
  const loadPreset = (type) => {
    const targetBrand = brands.find(b => String(b.id) === String(selectedBrandId)) || brands[0] || { name: 'Acme' };
    const slug = targetBrand.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (type === 'impersonator') {
      setCandidateForm({
        candidateName: `${targetBrand.name} Customer Assistance & Recovery`,
        handle: `@${slug}_support_desk`,
        profileUrl: `https://x.com/${slug}_support_desk`,
        platform: 'Twitter/X',
        description: `Official 24/7 verified assistance and emergency ticket recovery for ${targetBrand.name}. DM us for account unlock.`,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96'
      });
    } else if (type === 'benign') {
      setCandidateForm({
        candidateName: `${targetBrand.name} Fans Club`,
        handle: `@${slug}_fans`,
        profileUrl: `https://x.com/${slug}_fans`,
        platform: 'Twitter/X',
        description: `Unofficial community fan page and discussion for ${targetBrand.name} users. Not affiliated with the company.`,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96'
      });
    }
  };

  const columns = [
    {
      header: 'Candidate Profile',
      key: 'candidateName',
      sortable: true,
      render: (row) => (
        <div className="candidate-cell">
          <img
            src={row.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=64'}
            alt=""
            className="candidate-avatar"
          />
          <div className="candidate-info">
            <h4>{row.candidateName}</h4>
            <p>{row.candidateHandle || 'No handle'}</p>
          </div>
        </div>
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
      header: 'Platform',
      key: 'platform',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {row.platform}
        </span>
      )
    },
    {
      header: 'Profile URL',
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
            <span>{row.candidateUrl.replace(/^https?:\/\//, '').slice(0, 32)}...</span>
            <ExternalLink size={12} />
          </a>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>—</span>
      )
    },
    {
      header: 'Similarity Match',
      key: 'nameSimilarity',
      sortable: true,
      render: (row) => {
        const score = row.evidence?.name_similarity ?? row.nameSimilarity ?? 75;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 44, height: 6, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                width: `${score}%`,
                height: '100%',
                backgroundColor: score > 80 ? '#ef4444' : '#6366f1'
              }} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{score}%</span>
          </div>
        );
      }
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

        {/* PRIMARY BRAND-FIRST MONITORING CONTROLS */}
        <div className="card" style={{ padding: '18px 22px', marginBottom: 20 }}>
          <div className="monitoring-controls-bar">
            <div className="monitoring-controls-group">
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  SELECT PROTECTED BRAND
                </label>
                <select
                  className="form-select"
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  style={{ width: '100%', fontWeight: 600 }}
                >
                  <option value="all">All Registered Brands ({brands.length})</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="monitoring-action-label" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'transparent', display: 'block', marginBottom: 4 }}>
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
                      <span>Scanning Channels...</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="#fff" />
                      <span>Start Social Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowManualForm(!showManualForm)}
                style={{ fontSize: '0.78rem' }}
              >
                <span>Manual Profile Submission</span>
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
                  <Share2 size={18} style={{ color: 'var(--primary)' }} />
                  <span>Manual Suspicious Profile Investigation</span>
                </h3>
                <p className="card-subtitle">
                  Directly evaluate an individual suspicious social media handle against official baselines
                </p>
              </div>

              {/* Quick Test Presets */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Load Demo Sample:</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => loadPreset('impersonator')}
                >
                  <Sparkles size={12} style={{ color: '#ef4444' }} />
                  <span>Support Impersonator</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => loadPreset('benign')}
                >
                  <span>Fan Club</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleAnalyzeCandidate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Candidate Display Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Apex Bank Support"
                    value={candidateForm.candidateName}
                    onChange={(e) => setCandidateForm({ ...candidateForm, candidateName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Handle / Username</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. @ApexBank_HelpDesk"
                    value={candidateForm.handle}
                    onChange={(e) => setCandidateForm({ ...candidateForm, handle: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Profile URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://x.com/ApexBank_HelpDesk"
                    value={candidateForm.profileUrl}
                    onChange={(e) => setCandidateForm({ ...candidateForm, profileUrl: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Platform</label>
                  <select
                    className="form-select"
                    value={candidateForm.platform}
                    onChange={(e) => setCandidateForm({ ...candidateForm, platform: e.target.value })}
                  >
                    <option value="Twitter/X">Twitter/X</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Telegram">Telegram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Reddit">Reddit</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Profile Bio / Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Candidate bio text (e.g. 'Official support desk...')"
                    value={candidateForm.description}
                    onChange={(e) => setCandidateForm({ ...candidateForm, description: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Profile Avatar URL (optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://.../avatar.jpg"
                    value={candidateForm.avatarUrl}
                    onChange={(e) => setCandidateForm({ ...candidateForm, avatarUrl: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={14} />
                  <span>Heuristic scores evaluate syntactic distance and logo hashes. Similar profiles are not automatically fraudulent.</span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isManualScanning}
                >
                  {isManualScanning ? (
                    <>
                      <RefreshCw size={14} className="spinner" />
                      <span>Analyzing Candidate...</span>
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
              <h3 className="card-title">Social Impersonation Surveillance Results</h3>
              <p className="card-subtitle">
                Found {filteredFindings.length} candidate profiles flagged across monitored networks
              </p>
            </div>

            <div className="table-filter-toolbar">
              <div style={{ position: 'relative', minWidth: 200, flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input form-input-sm"
                  style={{ paddingLeft: 30 }}
                  placeholder="Filter results..."
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
            emptyMessage="No social media findings recorded for this brand. Click 'Start Social Scan' to execute surveillance."
          />
        </div>
      </div>
    </div>
  );
}
