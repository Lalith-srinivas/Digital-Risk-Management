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
  RefreshCw
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

  // Submission Form State
  const [isScanning, setIsScanning] = useState(false);
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

  // Filter findings
  const filteredFindings = findings.filter(f => {
    if (selectedBrandId !== 'all' && f.brandId !== selectedBrandId) return false;
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

  // Handle Form Analysis Submission
  const handleAnalyzeCandidate = async (e) => {
    e.preventDefault();
    if (!candidateForm.candidateName.trim() || !candidateForm.profileUrl.trim()) {
      alert('Please provide a candidate name and profile URL');
      return;
    }

    const targetBrandId = selectedBrandId !== 'all' ? selectedBrandId : (brands[0]?.id || 'brand-1');

    setIsScanning(true);
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
      // Refresh findings
      const refreshed = await api.getFindings({ sourceType: 'social' });
      setFindings(refreshed.data || []);
    } catch (err) {
      alert(err.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  // Preset loaders for quick demo testing
  const loadPreset = (type) => {
    if (type === 'impersonator') {
      setCandidateForm({
        candidateName: 'Apex Bank Support Official Assistance',
        handle: '@ApexBank_OfficialHelp',
        profileUrl: 'https://x.com/ApexBank_OfficialHelp',
        platform: 'Twitter/X',
        description: 'Official 24/7 Apex Bank Emergency Resolution Desk. DM us for account unlock & verification.',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96'
      });
    } else if (type === 'benign') {
      setCandidateForm({
        candidateName: 'Apex Banking Enthusiasts Club',
        handle: '@ApexBankingFans',
        profileUrl: 'https://x.com/ApexBankingFans',
        platform: 'Twitter/X',
        description: 'Independent user community and fintech discussion forum. Not affiliated with Apex Secure Bank.',
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
            src={row.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64'}
            alt=""
            className="candidate-avatar"
          />
          <div className="candidate-info">
            <h4>{row.candidateName}</h4>
            <p>{row.candidateHandle} • {row.platform}</p>
          </div>
        </div>
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
      header: 'Name Similarity',
      key: 'nameSimilarity',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 44, height: 6, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${row.nameSimilarity || 0}%`,
              height: '100%',
              backgroundColor: (row.nameSimilarity || 0) > 85 ? '#ef4444' : '#6366f1'
            }} />
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{row.nameSimilarity || 0}%</span>
        </div>
      )
    },
    {
      header: 'Visual Match',
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
              placeholder="Search suspect handles, URLs, or candidate names..."
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

        {/* Candidate Submission Form Card */}
        <div className="card card-lavender">
          <div className="card-header">
            <div className="card-title-group">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Share2 size={18} style={{ color: 'var(--primary)' }} />
                <span>Submit Candidate Profile for Impersonation Analysis</span>
              </h3>
              <p className="card-subtitle">
                Evaluate a suspicious social media profile against official brand baselines using similarity heuristics
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
                <span>Suspect Phisher</span>
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => loadPreset('benign')}
              >
                <span>Fan Community</span>
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
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <RefreshCw size={14} className="spinner" />
                    <span>Analyzing Candidate...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} fill="#fff" />
                    <span>Run Impersonation Analysis</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Result Feedback Banner */}
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
                Inspect Finding Evidence
              </button>
            </div>
          )}
        </div>

        {/* Results Table Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3 className="card-title">Detected Social Impersonation Candidates ({filteredFindings.length})</h3>
              <p className="card-subtitle">
                Profiles flagged across social platforms ranked by combined threat severity
              </p>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredFindings}
            loading={loading}
            emptyTitle="No suspect social profiles detected"
            emptyMessage="No candidates matched the current search filters."
            pageSize={7}
          />
        </div>
      </div>

      {/* ========================================================
          CANDIDATE INSPECT MODAL
         ======================================================== */}
      {inspectCandidate && (
        <Modal
          isOpen={!!inspectCandidate}
          onClose={() => setInspectCandidate(null)}
          title="Candidate Profile Threat Inspection"
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
                Full Evidence Dossier
              </button>
            </div>
          }
        >
          {/* Header comparison */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
            <img
              src={inspectCandidate.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64'}
              alt=""
              style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{inspectCandidate.candidateName}</h3>
                <RiskBadge level={inspectCandidate.riskLevel} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Targeting: <strong>{inspectCandidate.brandName}</strong> • {inspectCandidate.platform} • {inspectCandidate.candidateHandle}
              </p>
              <a
                href={inspectCandidate.candidateUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.76rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
              >
                <span>{inspectCandidate.candidateUrl}</span>
                <ExternalLink size={12} />
              </a>
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
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>VISUAL/LOGO HASH MATCH</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6' }}>
                {inspectCandidate.logoSimilarity || 0}%
              </div>
            </div>
          </div>

          {/* Reasons for Flagging */}
          <div>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
              Detection Engine Heuristic Reasons:
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
