import React, { useState, useEffect } from 'react';
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
  Smartphone
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import DataTable from '../components/DataTable';
import DemoBanner from '../components/DemoBanner';
import api from '../services/api';
import { formatDate, formatRelativeTime } from '../utils/formatters';

export default function Findings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [findings, setFindings] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filterBrand, setFilterBrand] = useState(searchParams.get('brandId') || 'all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'riskScore'

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

      setFindings(findingsRes.data || []);
      setBrands(brandsRes.data || []);
      setIsDemo(findingsRes.isDemoData || false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterBrand, filterRisk, filterSource, filterStatus, sortBy]);

  const loadFindings = () => loadData();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const columns = [
    {
      header: 'Candidate / Target',
      key: 'candidateName',
      sortable: true,
      render: (row) => (
        <div className="candidate-cell">
          <img
            src={row.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=64'}
            alt=""
            className={`candidate-avatar ${row.sourceType === 'app' ? 'square' : ''}`}
          />
          <div className="candidate-info">
            <h4>{row.candidateName}</h4>
            <p>{row.candidateHandle || row.packageId || 'No identifier'}</p>
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
      header: 'Vector Source',
      key: 'sourceType',
      sortable: true,
      render: (row) => (
        <span className={`source-badge ${row.sourceType}`}>
          {row.sourceType === 'social' ? (
            <>
              <Share2 size={12} />
              <span>{row.platform || 'Social'}</span>
            </>
          ) : (
            <>
              <Smartphone size={12} />
              <span>Mobile App</span>
            </>
          )}
        </span>
      )
    },
    {
      header: 'Risk Score',
      key: 'riskScore',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: 800,
            color: row.riskScore >= 75 ? '#dc2626' : row.riskScore >= 45 ? '#d97706' : '#059669'
          }}>
            {row.riskScore}/100
          </span>
        </div>
      )
    },
    {
      header: 'Risk Level',
      key: 'riskLevel',
      sortable: true,
      render: (row) => <RiskBadge level={row.riskLevel} />
    },
    {
      header: 'Detection Date',
      key: 'detectionDate',
      sortable: true,
      render: (row) => (
        <div style={{ fontSize: '0.78rem' }}>
          <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>{formatDate(row.detectionDate)}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{formatRelativeTime(row.detectionDate)}</div>
        </div>
      )
    },
    {
      header: 'Review Status',
      key: 'reviewStatus',
      sortable: true,
      render: (row) => {
        const status = (row.reviewStatus || 'Needs Review').toLowerCase();
        let color = '#4338ca';
        let bg = '#eef2ff';
        let border = '#c7d2fe';

        if (status.includes('confirmed')) {
          color = '#b91c1c';
          bg = '#fef2f2';
          border = '#fecaca';
        } else if (status.includes('false')) {
          color = '#047857';
          bg = '#ecfdf5';
          border = '#a7f3d0';
        } else if (status.includes('investigating')) {
          color = '#b45309';
          bg = '#fffbeb';
          border = '#fde68a';
        }

        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: 999,
            fontSize: '0.74rem',
            fontWeight: 700,
            color,
            backgroundColor: bg,
            border: `1px solid ${border}`
          }}>
            {row.reviewStatus}
          </span>
        );
      }
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
          <span>Details</span>
        </button>
      )
    }
  ];

  return (
    <div>
      <DemoBanner isDemo={isDemo} />

      <div className="page-content">
        {/* Filter Toolbar */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14
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
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
              <option value="needs review">Needs Review</option>
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

            {/* Review Status Filter */}
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Review Statuses</option>
              <option value="open">Open</option>
              <option value="needs review">Needs Review</option>
              <option value="investigating">Investigating</option>
              <option value="confirmed impersonation">Confirmed Impersonation</option>
              <option value="false positive">False Positive</option>
            </select>

            {/* Sort Filter */}
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Sort: Most Recent First</option>
              <option value="riskScore">Sort: Highest Risk Score First</option>
            </select>
          </div>
        </div>

        {/* Findings Table Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3 className="card-title">Digital Impersonation Findings Management ({findings.length})</h3>
              <p className="card-subtitle">
                Centralized registry of suspicious brand impersonation records with analyst triage actions
              </p>
            </div>

            <button
              className="btn btn-outline btn-sm"
              onClick={loadFindings}
              title="Refresh Findings"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          <DataTable
            columns={columns}
            data={findings}
            loading={loading}
            emptyTitle="No findings match filter"
            emptyMessage="Try broadening your filter criteria or search query."
            onRowClick={(row) => navigate(`/findings/${row.id}`)}
            pageSize={8}
          />
        </div>
      </div>
    </div>
  );
}
