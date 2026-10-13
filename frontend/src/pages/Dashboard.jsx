import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Share2,
  Smartphone,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  Server,
  Plus,
  Play,
  Building2,
  ShieldAlert,
  Search,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import DemoBanner from '../components/DemoBanner';
import Modal from '../components/Modal';
import api from '../services/api';
import { formatNumber, formatDate, formatRelativeTime } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);
  const [connectorsStatus, setConnectorsStatus] = useState(null);

  // First-time onboarding state
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({
    name: '',
    website: '',
    logo: '',
    officialSocials: '',
    officialApps: '',
    developerNames: '',
    aliases: '',
  });
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, healthRes, connectorsRes] = await Promise.all([
        api.getDashboardStats(),
        api.checkHealth(),
        api.getConnectorsStatus().catch(() => ({ data: null }))
      ]);

      setStatsData(statsRes.data);
      setIsDemo(statsRes.isDemoData || !healthRes.connected);
      setBackendHealth(healthRes);
      if (connectorsRes?.data) {
        setConnectorsStatus(connectorsRes.data);
      }

      if (statsRes.data?.recentScans?.length > 0) {
        setLastScanTime(statsRes.data.recentScans[0].timestamp);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!onboardingForm.name.trim()) {
      setOnboardingError('Brand name is required.');
      return;
    }

    setOnboardingSubmitting(true);
    setOnboardingError('');

    try {
      const payload = {
        name: onboardingForm.name.trim(),
        website: onboardingForm.website.trim() || undefined,
        logo: onboardingForm.logo.trim() || undefined,
        aliases: onboardingForm.aliases ? onboardingForm.aliases.split(',').map(s => s.trim()).filter(Boolean) : [],
        officialSocials: onboardingForm.officialSocials ? onboardingForm.officialSocials.split(',').map(s => s.trim()).filter(Boolean) : [],
        officialApps: onboardingForm.officialApps ? onboardingForm.officialApps.split(',').map(s => s.trim()).filter(Boolean) : [],
        developerNames: onboardingForm.developerNames ? onboardingForm.developerNames.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      const brandRes = await api.createBrand(payload);
      const newBrandId = brandRes.data?.id;

      if (newBrandId) {
        // Trigger immediate combined monitoring workflow
        await api.scanBrand(newBrandId);
      }

      setShowAddBrandModal(false);
      setOnboardingForm({
        name: '',
        website: '',
        logo: '',
        officialSocials: '',
        officialApps: '',
        developerNames: '',
        aliases: '',
      });
      await loadDashboardData();
    } catch (err) {
      setOnboardingError(err.message || 'Failed to register brand and initiate monitoring.');
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading SOC 360 Risk Intelligence..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDashboardData} />;
  }

  const totalBrands = statsData?.totalBrands ?? 0;
  const isFirstTimeUser = totalBrands === 0;

  // Threat activity timeline data
  const threatTimeline = [
    { name: 'Mon', high: 1, medium: 1, low: 0 },
    { name: 'Tue', high: 2, medium: 1, low: 1 },
    { name: 'Wed', high: 1, medium: 2, low: 0 },
    { name: 'Thu', high: 2, medium: 1, low: 2 },
    { name: 'Fri', high: 3, medium: 2, low: 1 },
    { name: 'Sat', high: 2, medium: 1, low: 1 },
    {
      name: 'Sun',
      high: statsData?.riskCounts?.High ?? 0,
      medium: statsData?.riskCounts?.Medium ?? 0,
      low: statsData?.riskCounts?.Low ?? 0
    },
  ];

  // Risk Distribution Donut Data
  const riskDonutData = [
    { name: 'High Risk', value: statsData?.riskCounts?.High ?? 0, color: '#ef4444' },
    { name: 'Medium Risk', value: statsData?.riskCounts?.Medium ?? 0, color: '#f59e0b' },
    { name: 'Low Risk', value: statsData?.riskCounts?.Low ?? 0, color: '#10b981' },
  ];

  const totalRiskCount = riskDonutData.reduce((acc, curr) => acc + curr.value, 0);

  // Threat Sources Data
  const totalFindings = (statsData?.sourceCounts?.social ?? 0) + (statsData?.sourceCounts?.apps ?? 0);
  const socialPct = totalFindings > 0 ? Math.round(((statsData?.sourceCounts?.social ?? 0) / totalFindings) * 100) : 0;
  const appPct = totalFindings > 0 ? 100 - socialPct : 0;

  const sourceBreakdown = [
    { name: 'Social Media Profiles', count: statsData?.sourceCounts?.social ?? 0, percent: socialPct, color: '#6366f1' },
    { name: 'Mobile Applications (APKs)', count: statsData?.sourceCounts?.apps ?? 0, percent: appPct, color: '#8b5cf6' },
  ];

  return (
    <div>
      <DemoBanner isDemo={isDemo} />

      {/* Monitor New Brand Modal Dialog */}
      <Modal
        isOpen={showAddBrandModal}
        onClose={() => setShowAddBrandModal(false)}
        title="Monitor New Brand"
        size="large"
      >
        <div style={{ padding: '4px 0' }}>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
            Register a brand entity under active surveillance. SOC 360 will continuously monitor social media channels and application marketplaces for impersonators and malicious clones.
          </p>

          {onboardingError && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-sm)',
              color: '#b91c1c',
              fontSize: '0.8rem',
              marginBottom: 16
            }}>
              {onboardingError}
            </div>
          )}

          <form onSubmit={handleOnboardingSubmit}>
            <div className="form-grid-2col">
              <div className="form-group">
                <label className="form-label">
                  Brand Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acme Corp"
                  value={onboardingForm.name}
                  onChange={(e) => setOnboardingForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <span className="form-hint">Required. Core trademark name to monitor.</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Official Website <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://acmecorp.com"
                  value={onboardingForm.website}
                  onChange={(e) => setOnboardingForm(prev => ({ ...prev, website: e.target.value }))}
                />
                <span className="form-hint">Used as authoritative baseline to exclude genuine domains.</span>
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label className="form-label">
                  Official Logo URL <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://example.com/logo.png"
                  value={onboardingForm.logo}
                  onChange={(e) => setOnboardingForm(prev => ({ ...prev, logo: e.target.value }))}
                />
                <span className="form-hint">Used for ImageHash logo comparison.</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Brand Aliases & Alternative Spellings <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Acme, AcmeApp, Acme Global (comma-separated)"
                  value={onboardingForm.aliases}
                  onChange={(e) => setOnboardingForm(prev => ({ ...prev, aliases: e.target.value }))}
                />
                <span className="form-hint">Secondary brand representations.</span>
              </div>
            </div>

            <div className="form-grid-2col" style={{ marginBottom: 20 }}>
              <div className="form-group">
                <label className="form-label">
                  Known Official Social URLs <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://x.com/acme, https://instagram.com/acme"
                  value={onboardingForm.officialSocials}
                  onChange={(e) => setOnboardingForm(prev => ({ ...prev, officialSocials: e.target.value }))}
                />
                <span className="form-hint">Legitimate accounts to exclude from threat scoring.</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Authorized Publisher / Developer Names <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Acme Technologies Inc."
                  value={onboardingForm.developerNames}
                  onChange={(e) => setOnboardingForm(prev => ({ ...prev, developerNames: e.target.value }))}
                />
                <span className="form-hint">Authorized store publisher identities.</span>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowAddBrandModal(false);
                  navigate('/scan');
                }}
              >
                <span>Or Run Quick Ad-hoc Scan →</span>
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddBrandModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={onboardingSubmitting}
                >
                  <Play size={14} />
                  <span>{onboardingSubmitting ? 'Registering & Scanning...' : 'Start Monitoring Brand'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      <div className="page-content">
        {/* Top Actions Bar */}
        <div className="dashboard-action-bar">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Executive Risk Dashboard
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Continuous trademark impersonation & rogue application surveillance
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={loadDashboardData}
              title="Refresh telemetry"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddBrandModal(true)}
            >
              <Plus size={14} />
              <span>Monitor New Brand</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            FIRST-TIME ONBOARDING EXPERIENCE (If 0 brands registered)
           ======================================================== */}
        {isFirstTimeUser && (
          <div className="card" style={{
            border: '2px solid var(--primary)',
            background: 'linear-gradient(135deg, #ffffff 0%, #fbf9ff 100%)',
            padding: '28px 32px',
            marginBottom: 24,
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.08)'
          }}>
            <div style={{ maxWidth: 840 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: '0.72rem',
                fontWeight: 700,
                marginBottom: 12
              }}>
                <ShieldCheck size={13} />
                <span>FIRST-TIME BRAND ONBOARDING</span>
              </div>

              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
                Protect Your Brand with SOC 360
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Monitor potential impersonation across social media and application marketplaces from one dashboard.
              </p>

              {onboardingError && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-sm)',
                  color: '#b91c1c',
                  fontSize: '0.8rem',
                  marginBottom: 16
                }}>
                  {onboardingError}
                </div>
              )}

              <form onSubmit={handleOnboardingSubmit}>
                <div className="form-grid-2col">
                  <div className="form-group">
                    <label className="form-label">
                      Brand Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Acme Corp"
                      value={onboardingForm.name}
                      onChange={(e) => setOnboardingForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                    <span className="form-hint">Required. The core trademark name to monitor.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Official Website <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                    </label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://acmecorp.com"
                      value={onboardingForm.website}
                      onChange={(e) => setOnboardingForm(prev => ({ ...prev, website: e.target.value }))}
                    />
                    <span className="form-hint">Optional baseline domain used to exclude official pages.</span>
                  </div>
                </div>

                <div className="form-grid-2col">
                  <div className="form-group">
                    <label className="form-label">
                      Official Logo URL <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                    </label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://example.com/logo.png"
                      value={onboardingForm.logo}
                      onChange={(e) => setOnboardingForm(prev => ({ ...prev, logo: e.target.value }))}
                    />
                    <span className="form-hint">Optional logo URL for perceptual image hash comparison.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Brand Aliases & Alternative Spellings <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Acme, AcmeApp, Acme Global (comma separated)"
                      value={onboardingForm.aliases}
                      onChange={(e) => setOnboardingForm(prev => ({ ...prev, aliases: e.target.value }))}
                    />
                    <span className="form-hint">Optional secondary brand representations.</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <div className="form-group">
                    <label className="form-label">
                      Known Official Social URLs <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="https://x.com/acme, https://instagram.com/acme"
                      value={onboardingForm.officialSocials}
                      onChange={(e) => setOnboardingForm(prev => ({ ...prev, officialSocials: e.target.value }))}
                    />
                    <span className="form-hint">Comma separated list of legitimate handles.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Official Publisher / Developer Names <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Acme Technologies Inc."
                      value={onboardingForm.developerNames}
                      onChange={(e) => setOnboardingForm(prev => ({ ...prev, developerNames: e.target.value }))}
                    />
                    <span className="form-hint">Authorized store publisher identities.</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={onboardingSubmitting}
                  style={{ padding: '10px 22px', fontSize: '0.9rem' }}
                >
                  <Play size={15} />
                  <span>{onboardingSubmitting ? 'Registering & Initiating Monitoring...' : 'Save Brand & Start Monitoring'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ROW 1: 4 STATISTIC CARDS */}
        <section className="stat-cards-grid" aria-label="Key Performance Statistics">
          <StatCard
            icon={ShieldCheck}
            iconColor="indigo"
            label="Brands Monitored"
            value={formatNumber(statsData?.totalBrands ?? 0)}
            subtext="Active corporate entities under surveillance"
            trend={{ value: totalBrands > 0 ? `${totalBrands} active` : '0 registered', type: 'positive' }}
            onClick={() => navigate('/brands')}
          />

          <StatCard
            icon={Share2}
            iconColor="purple"
            label="Social Profiles Scanned"
            value={formatNumber(statsData?.socialScanned ?? 0)}
            subtext="Targeting handle impersonation & typosquats"
            trend={{ value: 'Multi-vector', type: 'positive' }}
            onClick={() => navigate('/social-monitoring')}
          />

          <StatCard
            icon={Smartphone}
            iconColor="cyan"
            label="Applications Scanned"
            value={formatNumber(statsData?.appsScanned ?? 0)}
            subtext="Analyzing package signatures & store clones"
            trend={{ value: 'App Stores', type: 'positive' }}
            onClick={() => navigate('/app-monitoring')}
          />

          <StatCard
            icon={AlertTriangle}
            iconColor="rose"
            label="Suspicious Findings"
            value={formatNumber(statsData?.suspiciousFindings ?? 0)}
            subtext="Candidate profiles requiring analyst review"
            trend={{ value: (statsData?.suspiciousFindings ?? 0) > 0 ? 'Requires Action' : 'All Clear', type: (statsData?.suspiciousFindings ?? 0) > 0 ? 'warning' : 'positive' }}
            onClick={() => navigate('/findings')}
          />
        </section>

        {/* TWO-COLUMN DASHBOARD LAYOUT */}
        <div className="dashboard-columns">
          {/* ========================================================
              LEFT COLUMN
             ======================================================== */}
          <div className="col-left">
            {/* A. Threat Activity Chart */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Threat Activity Timeline</h3>
                  <p className="card-subtitle">Weekly distribution of detected impersonation signals by severity</p>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.74rem', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} /> High
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} /> Medium
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} /> Low
                  </span>
                </div>
              </div>

              <div className="chart-container-threat">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={threatTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                      }}
                    />
                    <Area type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorHigh)" name="High Risk" />
                    <Area type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorMedium)" name="Medium Risk" />
                    <Area type="monotone" dataKey="low" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLow)" name="Low Risk" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* B. Recent Findings Table */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Recent Impersonation Findings</h3>
                  <p className="card-subtitle">Highest severity candidates flagged by similarity heuristics</p>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate('/findings')}
                >
                  <span>View All Findings</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {statsData?.recentFindings?.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Source Type</th>
                        <th>Risk Score</th>
                        <th>Risk Level</th>
                        <th>Detected</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.recentFindings.map((finding) => (
                        <tr key={finding.id}>
                          <td>
                            <div className="candidate-cell">
                              <img
                                src={finding.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=64'}
                                alt=""
                                className={`candidate-avatar ${finding.sourceType === 'app' ? 'square' : ''}`}
                              />
                              <div className="candidate-info">
                                <h4>{finding.candidateName}</h4>
                                <p>{finding.candidateHandle || finding.packageId || 'No identifier'}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`source-badge ${finding.sourceType}`}>
                              {finding.sourceType === 'social' ? 'Social Profile' : 'Mobile App'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                              {finding.riskScore}/100
                            </span>
                          </td>
                          <td>
                            <RiskBadge level={finding.riskLevel} />
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {formatRelativeTime(finding.detectionDate)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => navigate(`/findings/${finding.id}`)}
                              title="Inspect Finding Evidence"
                            >
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <ShieldCheck size={36} style={{ color: '#10b981', margin: '0 auto 10px' }} />
                  <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px' }}>
                    No Impersonation Findings Detected
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                    Select or register a brand and trigger monitoring to begin scanning.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => isFirstTimeUser ? setShowAddBrandModal(true) : navigate('/brands')}
                  >
                    <Play size={13} />
                    <span>Run Brand Surveillance</span>
                  </button>
                </div>
              )}
            </div>

            {/* C. Scan Activity */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Recent Scan Activity</h3>
                  <p className="card-subtitle">Automated and on-demand brand surface scan executions</p>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={loadDashboardData}
                  title="Refresh Scan Status"
                >
                  <RefreshCw size={13} />
                  <span>Refresh</span>
                </button>
              </div>

              {statsData?.recentScans?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {statsData.recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--border-light)',
                        flexWrap: 'wrap',
                        gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          backgroundColor: '#eef2ff',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {scan.brandName} — {scan.type}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            Target: {scan.target} • Scanned {scan.candidatesAnalyzed} candidates
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ textAlign: 'right', fontSize: '0.74rem' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{scan.findingsGenerated} findings</span>
                          <div style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(scan.timestamp)}</div>
                        </div>
                        <span className="risk-badge low" style={{ fontSize: '0.7rem' }}>
                          {scan.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No historical scan records available. Initiate your first brand scan to view telemetry.
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN
             ======================================================== */}
          <div className="col-right">
            {/* A. Risk Distribution Donut Chart */}
            <div className="card card-lavender">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Risk Severity Distribution</h3>
                  <p className="card-subtitle">Aggregate breakdown of current open findings</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: '100%', height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDonutData}
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {riskDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.76rem'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Center text in Donut */}
                <div style={{
                  position: 'absolute',
                  top: '90px',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                    {totalRiskCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Total Flagged
                  </div>
                </div>

                {/* Donut Legend */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 16,
                  marginTop: 12,
                  width: '100%',
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: 12
                }}>
                  {riskDonutData.map(item => (
                    <div key={item.name} style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* B. Threat Sources */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Threat Sources Breakdown</h3>
                  <p className="card-subtitle">Candidate findings origin across monitored vectors</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {sourceBreakdown.map((src) => (
                  <div key={src.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{src.name}</span>
                      <span style={{ fontWeight: 700, color: src.color }}>{src.count} findings ({src.percent}%)</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: 8,
                      backgroundColor: '#f1f5f9',
                      borderRadius: 999,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${src.percent}%`,
                        height: '100%',
                        backgroundColor: src.color,
                        borderRadius: 999
                      }} />
                    </div>
                  </div>
                ))}

                <div style={{
                  marginTop: 8,
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.4
                }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Surveillance Surface:</strong> Live RapidFuzz lexical analysis and ImageHash logo perceptual comparison.
                </div>
              </div>
            </div>

            {/* C. Monitoring Status */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Monitoring Engine Status</h3>
                  <p className="card-subtitle">API health & detection pipeline status</p>
                </div>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: backendHealth?.connected ? '#10b981' : '#f59e0b'
                }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.78rem'
                }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Server size={14} /> Backend Connector
                  </span>
                  <span style={{ fontWeight: 700, color: backendHealth?.connected ? '#047857' : '#b45309' }}>
                    {backendHealth?.connected ? 'FastAPI Connected' : 'Demo Adapter Active'}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.78rem'
                }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} /> Last Scan Completed
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {formatRelativeTime(lastScanTime)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.78rem'
                }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} /> Monitored Brands
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {totalBrands} Active Targets
                  </span>
                </div>

                {/* External Data Connectors Status */}
                <div style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-light)',
                  marginTop: 2,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Database size={13} color="#6366f1" /> External Data Connectors
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Live Status
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.74rem' }}>
                    {Object.entries(connectorsStatus || {
                      apple_app_store: { name: 'Apple App Store', status: 'active' },
                      github: { name: 'GitHub Public Search', status: 'active' },
                      twitter: { name: 'Twitter/X API v2', status: 'unconfigured' },
                      google_play: { name: 'Google Play Store', status: 'unconfigured' },
                      telegram: { name: 'Telegram Bot API', status: 'unconfigured' },
                    }).map(([key, info]) => {
                      const isActive = info.status === 'active';
                      return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{info.name || key.replace(/_/g, ' ')}</span>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            backgroundColor: isActive ? '#ecfdf5' : '#f1f5f9',
                            color: isActive ? '#059669' : '#64748b',
                            border: `1px solid ${isActive ? '#a7f3d0' : '#e2e8f0'}`,
                          }}>
                            {isActive ? 'Active' : 'Key Required'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: 4 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => navigate('/settings')}
                  >
                    Configure API & Connectors
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
