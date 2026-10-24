import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Eye,
  RefreshCw,
  Share2,
  Smartphone,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Flame,
  FileCheck,
  Layers,
  Sparkles
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import DataTable from '../components/DataTable';
import DemoBanner from '../components/DemoBanner';
import api from '../services/api';
import { formatDate, formatRelativeTime } from '../utils/formatters';

/**
 * Round 2 Prioritized Investigation Queue:
 * - Prioritizes high-risk impersonations so they are seen first (Default sort: Risk Score desc)
 * - Presents complete records: Source, Suspected Asset & Imitated Target, Evidence, Risk Score, Status
 * - Standardized lifecycle statuses: New, Under Review, Confirmed, False Positive, Closed
 */
export default function Findings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [findings, setFindings] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Quick Filter preset: 'all' | 'high_risk' | 'needs_review' | 'confirmed' | 'false_positive'
  const [activeTab, setActiveTab] = useState('all');

  // Toolbar Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filterBrand, setFilterBrand] = useState(searchParams.get('brandId') || 'all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Default sort is Highest Risk Score First (per Round 2 brief requirement)
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'riskScore');

  const loadData = async () => {
    setLoading(true);
    try {
      const [findingsRes, brandsRes] = await Promise.all([
        api.getFindings({
          search: searchQuery,
          brandId: filterBrand,
          riskLevel: filterRisk,
          sourceType: filterSource,
          reviewStatus: filterStatus,
          sortBy
        }),
        api.getBrands()
      ]);

      const allFindings = findingsRes.data || [];
      const allBrands = brandsRes.data || [];

      // Only display candidates that have actual similarity / threat signals (score >= 20)
      // Completely filters out unrelated search noise (e.g. 0-score apps like Beynex, HEX Editor)
      const cleanFindings = allFindings.filter(f => {
        if (filterRisk === 'low') return true;
        return (f.riskScore !== undefined ? f.riskScore : (f.risk_score || 0)) >= 20;
      });

      // Resolve brand name from brands list if finding has generic 'Protected Brand'
      const brandMap = new Map(allBrands.map(b => [String(b.id), b.name]));
      const resolvedFindings = cleanFindings.map(f => {
        let bName = f.brandName;
        if (!bName || bName === 'Protected Brand') {
          bName = brandMap.get(String(f.brandId || f.brand_id)) || (f.brand && f.brand.name) || bName || 'Protected Brand';
        }
        return {
          ...f,
          brandName: bName
        };
      });

      setFindings(resolvedFindings);
      setBrands(allBrands);
      setIsDemo(findingsRes.isDemoData || false);
    } catch (err) {
      console.error('Error loading findings queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterBrand, filterRisk, filterSource, filterStatus, sortBy]);

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'high_risk') {
      setFilterRisk('high');
      setFilterStatus('all');
      setSortBy('riskScore');
    } else if (tab === 'needs_review') {
      setFilterRisk('all');
      setFilterStatus('under review');
    } else if (tab === 'confirmed') {
      setFilterRisk('all');
      setFilterStatus('confirmed');
    } else if (tab === 'false_positive') {
      setFilterRisk('all');
      setFilterStatus('false positive');
    } else {
      setFilterRisk('all');
      setFilterStatus('all');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = findings.length;
    const criticalOrHigh = findings.filter(f => (f.riskScore >= 75) || ['high', 'critical'].includes(f.riskLevel?.toLowerCase())).length;
    const needsReview = findings.filter(f => ['new', 'under review', 'needs review', 'investigating'].includes(f.reviewStatus?.toLowerCase())).length;
    const confirmed = findings.filter(f => f.reviewStatus?.toLowerCase().includes('confirmed')).length;
    const falsePositive = findings.filter(f => f.reviewStatus?.toLowerCase().includes('false')).length;

    return { total, criticalOrHigh, needsReview, confirmed, falsePositive };
  }, [findings]);

  // Table Columns (Conforms strictly to Round 2 Core Scope: Source, Suspected Asset, Evidence, Score, Status)
  const columns = [
    {
      header: 'Suspected Asset & Target',
      key: 'candidateName',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <img
            src={row.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=64'}
            alt=""
            style={{
              width: 38,
              height: 38,
              borderRadius: row.sourceType === 'app' ? 8 : '50%',
              objectFit: 'cover',
              border: '1px solid #cbd5e1',
              flexShrink: 0,
              marginTop: 2
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                {row.candidateName}
              </span>
              {row.candidateUrl && (
                <a
                  href={row.candidateUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: '#94a3b8', display: 'flex' }}
                  title="Open candidate external URL"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {row.candidateHandle || row.packageId || 'No identifier recorded'}
            </div>

            {/* Suspected vs Legitimate Asset Mapping (Round 2 requirement) */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 4,
              fontSize: '0.72rem',
              color: '#4338ca',
              backgroundColor: '#eef2ff',
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid #c7d2fe',
              width: 'fit-content'
            }}>
              <ShieldCheck size={11} style={{ color: '#4f46e5' }} />
              <span>Imitating: <strong>{row.brandName}</strong></span>
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Source Platform',
      key: 'sourceType',
      sortable: true,
      render: (row) => (
        <span className={`source-badge ${row.sourceType}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {row.sourceType === 'social' ? (
            <>
              <Share2 size={12} />
              <span>{row.platform || 'Social Media'}</span>
            </>
          ) : (
            <>
              <Smartphone size={12} />
              <span>{row.platform || 'App Store'}</span>
            </>
          )}
        </span>
      )
    },
    {
      header: 'Evidence Signals',
      key: 'evidence',
      render: (row) => {
        const signals = row.evidenceSignals || [];
        const topSignals = signals.slice(0, 2);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 220 }}>
            {topSignals.length > 0 ? (
              topSignals.map((sig, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    backgroundColor: '#f8fafc',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sig.name}
                  </span>
                  <strong style={{
                    color: sig.score >= 80 ? '#dc2626' : sig.score >= 50 ? '#d97706' : '#059669',
                    marginLeft: 6
                  }}>
                    {sig.score}%
                  </strong>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {row.reasons?.[0]?.slice(0, 35) || 'Heuristic similarity signal'}...
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Risk Score',
      key: 'riskScore',
      sortable: true,
      render: (row) => {
        const isHigh = row.riskScore >= 75;
        const isMed = row.riskScore >= 45 && row.riskScore < 75;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: '0.96rem',
                fontWeight: 800,
                color: isHigh ? '#dc2626' : isMed ? '#d97706' : '#059669'
              }}>
                {row.riskScore}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>/100</span>
            </div>
            <RiskBadge level={row.riskLevel} />
          </div>
        );
      }
    },
    {
      header: 'Review Status',
      key: 'reviewStatus',
      sortable: true,
      render: (row) => {
        const raw = (row.reviewStatus || 'New').toLowerCase();
        let color = '#4338ca';
        let bg = '#eef2ff';
        let border = '#c7d2fe';
        let label = row.reviewStatus || 'New';

        if (raw.includes('confirmed')) {
          color = '#b91c1c';
          bg = '#fef2f2';
          border = '#fecaca';
          label = 'Confirmed';
        } else if (raw.includes('false')) {
          color = '#047857';
          bg = '#ecfdf5';
          border = '#a7f3d0';
          label = 'False Positive';
        } else if (raw.includes('under') || raw.includes('investigating')) {
          color = '#b45309';
          bg = '#fffbeb';
          border = '#fde68a';
          label = 'Under Review';
        } else if (raw.includes('resolved') || raw.includes('closed')) {
          color = '#15803d';
          bg = '#f0fdf4';
          border = '#bbf7d0';
          label = 'Closed';
        }

        return (
          <span style={{
            padding: '3px 9px',
            borderRadius: 999,
            fontSize: '0.74rem',
            fontWeight: 700,
            color,
            backgroundColor: bg,
            border: `1px solid ${border}`,
            display: 'inline-block'
          }}>
            {label}
          </span>
        );
      }
    },
    {
      header: 'Detected',
      key: 'detectionDate',
      sortable: true,
      render: (row) => (
        <div style={{ fontSize: '0.76rem' }}>
          <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatDate(row.detectionDate)}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.70rem' }}>{formatRelativeTime(row.detectionDate)}</div>
        </div>
      )
    },
    {
      header: 'Action',
      key: 'actions',
      render: (row) => (
        <button
          className="btn btn-primary btn-sm"
          style={{
            fontSize: '0.76rem',
            padding: '5px 12px',
            gap: 4
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/findings/${row.id}`);
          }}
        >
          <span>Investigate</span>
          <ChevronRight size={13} />
        </button>
      )
    }
  ];

  return (
    <div>
      <DemoBanner isDemo={isDemo} />

      <div className="page-content">
        {/* KPI Metrics Ribbon */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 16
        }}>
          <div
            onClick={() => handleTabChange('all')}
            style={{
              padding: '14px 16px',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'all' ? '2px solid #6366f1' : '1px solid var(--border-light)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Total Findings Queue</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{metrics.total}</div>
          </div>

          <div
            onClick={() => handleTabChange('high_risk')}
            style={{
              padding: '14px 16px',
              backgroundColor: activeTab === 'high_risk' ? '#fff1f2' : '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'high_risk' ? '2px solid #ef4444' : '1px solid var(--border-light)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flame size={14} />
              <span>Critical & High Risk</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b91c1c', marginTop: 2 }}>{metrics.criticalOrHigh}</div>
          </div>

          <div
            onClick={() => handleTabChange('needs_review')}
            style={{
              padding: '14px 16px',
              backgroundColor: activeTab === 'needs_review' ? '#fefce8' : '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'needs_review' ? '2px solid #eab308' : '1px solid var(--border-light)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} />
              <span>Needs Review</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: 2 }}>{metrics.needsReview}</div>
          </div>

          <div
            onClick={() => handleTabChange('confirmed')}
            style={{
              padding: '14px 16px',
              backgroundColor: activeTab === 'confirmed' ? '#fef2f2' : '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'confirmed' ? '2px solid #dc2626' : '1px solid var(--border-light)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#991b1b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={14} />
              <span>Confirmed Impersonations</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#991b1b', marginTop: 2 }}>{metrics.confirmed}</div>
          </div>

          <div
            onClick={() => handleTabChange('false_positive')}
            style={{
              padding: '14px 16px',
              backgroundColor: activeTab === 'false_positive' ? '#f0fdf4' : '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'false_positive' ? '2px solid #22c55e' : '1px solid var(--border-light)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={14} />
              <span>False Positives</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', marginTop: 2 }}>{metrics.falsePositive}</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          marginBottom: 16
        }}>
          <div className="findings-filter-grid">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="Search candidates, handles, brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            {/* Brand Filter */}
            <select
              className="form-select"
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
            >
              <option value="all">All Protected Brands ({brands.length})</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Risk Level Filter */}
            <select
              className="form-select"
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical Risk (≥ 85)</option>
              <option value="high">High Risk (70 - 84)</option>
              <option value="medium">Medium Risk (40 - 69)</option>
              <option value="low">Low Risk (&lt; 40)</option>
            </select>

            {/* Source Vector Filter */}
            <select
              className="form-select"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all">All Vectors</option>
              <option value="social">Social Media Profiles</option>
              <option value="app">Mobile Applications</option>
            </select>

            {/* Standardized Review Status Filter (Round 2 terms) */}
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Review Statuses</option>
              <option value="new">New</option>
              <option value="under review">Under Review</option>
              <option value="confirmed">Confirmed</option>
              <option value="false positive">False Positive</option>
              <option value="closed">Closed</option>
            </select>

            {/* Sort Filter (Prioritized by risk score first) */}
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="riskScore">Sort: Highest Risk Score First (Priority)</option>
              <option value="date">Sort: Most Recent Detection First</option>
            </select>
          </div>
        </div>

        {/* Findings Table Card */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="card-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 className="card-title">Prioritized Investigation Queue ({findings.length})</h3>
                <span style={{
                  fontSize: '0.72rem',
                  color: '#4f46e5',
                  backgroundColor: '#eef2ff',
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontWeight: 700
                }}>
                  Ranked by Threat Level
                </span>
              </div>
              <p className="card-subtitle">
                Evidence-backed brand impersonation records prioritized for analyst review and takedown triage
              </p>
            </div>

            <button
              className="btn btn-outline btn-sm"
              onClick={loadData}
              title="Refresh Findings Queue"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          <DataTable
            columns={columns}
            data={findings}
            loading={loading}
            emptyTitle="No detections match filter"
            emptyMessage="Try broadening your filter criteria or run a new surface scan."
            onRowClick={(row) => navigate(`/findings/${row.id}`)}
            pageSize={10}
          />
        </div>
      </div>
    </div>
  );
}
