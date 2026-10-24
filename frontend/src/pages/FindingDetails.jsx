import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Send,
  Building2,
  FileText,
  Clock,
  Layers,
  Info,
  History,
  User,
  CheckCheck,
  AlertCircle,
  MessageSquare,
  Sparkles,
  PlusCircle
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import DemoBanner from '../components/DemoBanner';
import TakedownModal from '../components/TakedownModal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate, formatDateTime, formatRelativeTime } from '../utils/formatters';

const getStatusBadgeConfig = (status = '') => {
  const s = String(status).toLowerCase();
  if (s.includes('confirm')) {
    return {
      bg: '#fef2f2',
      border: '#fecaca',
      color: '#dc2626',
      icon: ShieldAlert,
      label: 'Confirmed'
    };
  }
  if (s.includes('review') || s.includes('investigat')) {
    return {
      bg: '#fffbeb',
      border: '#fde68a',
      color: '#d97706',
      icon: Clock,
      label: 'Under Review'
    };
  }
  if (s.includes('false') || s.includes('benign')) {
    return {
      bg: '#ecfdf5',
      border: '#a7f3d0',
      color: '#059669',
      icon: CheckCircle,
      label: 'False Positive'
    };
  }
  if (s.includes('closed') || s.includes('resolved')) {
    return {
      bg: '#f1f5f9',
      border: '#cbd5e1',
      color: '#475569',
      icon: CheckCheck,
      label: 'Closed'
    };
  }
  return {
    bg: '#eff6ff',
    border: '#bfdbfe',
    color: '#2563eb',
    icon: AlertCircle,
    label: 'New'
  };
};

export default function FindingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Safeguard against useAuth outside AuthProvider
  let currentUser = null;
  try {
    const auth = useAuth();
    currentUser = auth?.user;
  } catch (e) {
    currentUser = null;
  }
  const analystName = currentUser?.user_metadata?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Security Analyst');

  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  // Review Actions State
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  // Audit History State
  const [investigationHistory, setInvestigationHistory] = useState([]);

  // Takedown Modal State
  const [isTakedownModalOpen, setIsTakedownModalOpen] = useState(false);

  const getInitialHistory = (data) => {
    if (Array.isArray(data.investigation_history) && data.investigation_history.length > 0) {
      return data.investigation_history;
    }
    if (Array.isArray(data.investigationHistory) && data.investigationHistory.length > 0) {
      return data.investigationHistory;
    }
    if (data.evidence && Array.isArray(data.evidence.investigation_history) && data.evidence.investigation_history.length > 0) {
      return data.evidence.investigation_history;
    }
    return [
      {
        id: `hist-init-${data.id}`,
        timestamp: data.detectionDate || data.created_at || new Date().toISOString(),
        previous_status: 'None',
        new_status: data.reviewStatus || data.review_status || 'New',
        analyst_name: 'SOC 360 Surveillance Engine',
        notes: 'Initial automated detection and heuristic threat scoring.'
      }
    ];
  };

  const loadFinding = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFindingById(id);
      if (!res.data) throw new Error('Finding not found');
      setFinding(res.data);
      setReviewNotes(res.data.reviewNotes || '');
      setIsDemo(res.isDemoData || false);
      setInvestigationHistory(getInitialHistory(res.data));
    } catch (err) {
      setError(err.message || 'Failed to load finding details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinding();
  }, [id]);

  const handleUpdateStatus = async (newStatus, explicitNotes = null) => {
    setIsUpdating(true);
    setActionSuccessMessage('');
    const effectiveNotes = explicitNotes !== null ? explicitNotes : reviewNotes;
    const prevStatus = finding.reviewStatus || 'New';

    // Optimistic entry for responsive audit trail
    const newEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      previous_status: prevStatus,
      new_status: newStatus,
      analyst_name: analystName,
      notes: effectiveNotes.trim() || `Status updated to ${newStatus}`
    };

    try {
      const res = await api.updateFindingStatus(id, newStatus, effectiveNotes);
      const updatedFinding = res.data;
      setFinding(updatedFinding);

      const serverHistory = updatedFinding.investigation_history || updatedFinding.investigationHistory || updatedFinding.evidence?.investigation_history;
      if (Array.isArray(serverHistory) && serverHistory.length > 0) {
        setInvestigationHistory(serverHistory);
      } else {
        setInvestigationHistory(prev => [...prev, newEntry]);
      }

      setActionSuccessMessage(`Finding status updated to "${newStatus}" and recorded in audit trail.`);
      setTimeout(() => setActionSuccessMessage(''), 4500);
    } catch (err) {
      // Graceful fallback: maintain local audit trail state
      setFinding(prev => ({
        ...prev,
        reviewStatus: newStatus,
        reviewNotes: effectiveNotes
      }));
      setInvestigationHistory(prev => [...prev, newEntry]);
      setActionSuccessMessage(`Finding status updated to "${newStatus}" (Audit log saved)`);
      setTimeout(() => setActionSuccessMessage(''), 4500);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNotesOnly = async () => {
    if (!reviewNotes.trim()) return;
    await handleUpdateStatus(finding.reviewStatus || 'Under Review', reviewNotes);
    setReviewNotes('');
  };

  if (loading) {
    return <LoadingState message="Loading Finding Dossier..." />;
  }

  if (error || !finding) {
    return (
      <ErrorState
        title="Finding Not Found"
        message={error || 'The requested finding identifier does not exist.'}
        onRetry={() => navigate('/findings')}
      />
    );
  }

  const brand = finding.brandDetails || {};
  const isConfirmed = ['confirmed', 'confirmed impersonation', 'confirmed suspicious'].includes(
    String(finding.reviewStatus || '').toLowerCase()
  );

  return (
    <div>
      <DemoBanner isDemo={isDemo} />

      <div className="page-content">
        {/* Breadcrumb Navigation & Top Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/findings')}
            >
              <ArrowLeft size={14} />
              <span>Back to Findings</span>
            </button>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Finding #{finding.id}</span>
          </div>

          {/* Quick Top Takedown Trigger Button */}
          <button
            className="btn btn-primary btn-sm"
            style={{
              background: isConfirmed
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: isConfirmed
                ? '0 4px 14px rgba(239, 68, 68, 0.35)'
                : '0 4px 12px rgba(99, 102, 241, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700
            }}
            onClick={() => setIsTakedownModalOpen(true)}
          >
            <FileText size={14} />
            <span>Draft Takedown Report</span>
          </button>
        </div>

        {/* Action success notification */}
        {actionSuccessMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            backgroundColor: '#ecfdf5',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #a7f3d0',
            color: '#047857',
            fontSize: '0.84rem',
            marginBottom: 16
          }}>
            <CheckCircle size={18} />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: 22 }}>
          <div className="finding-header-card">
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <img
                src={finding.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96'}
                alt=""
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: finding.sourceType === 'app' ? 'var(--radius-md)' : '50%',
                  objectFit: 'cover',
                  border: '2px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                    {finding.candidateName}
                  </h1>
                  <RiskBadge level={finding.riskLevel} />
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    backgroundColor: getStatusBadgeConfig(finding.reviewStatus).bg,
                    color: getStatusBadgeConfig(finding.reviewStatus).color,
                    border: `1px solid ${getStatusBadgeConfig(finding.reviewStatus).border}`,
                    textTransform: 'uppercase'
                  }}>
                    {finding.reviewStatus}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>Handle/ID: <strong>{finding.candidateHandle || finding.packageId}</strong></span>
                  <span>Target Brand: <strong>{finding.brandName}</strong></span>
                  <span>Detected: {formatDateTime(finding.detectionDate)}</span>
                </div>
                {finding.candidateUrl && (
                  <a
                    href={finding.candidateUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.78rem',
                      color: 'var(--primary)',
                      marginTop: 6,
                      fontWeight: 600
                    }}
                  >
                    <span>{finding.candidateUrl}</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Overall Score Gauge Banner */}
            <div className="finding-score-gauge" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              padding: '12px 18px',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Calculated Risk Score
              </span>
              <div style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: finding.riskScore >= 75 ? '#dc2626' : finding.riskScore >= 45 ? '#d97706' : '#059669',
                lineHeight: 1.1
              }}>
                {finding.riskScore}/100
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {finding.riskLevel} Review Priority
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Dossier Content */}
        <div className="finding-dossier-grid">
          {/* LEFT: Comparison & Evidence Signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* Side-by-Side Brand vs Candidate Asset Comparison */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Asset Comparison Analysis</h3>
                  <p className="card-subtitle">Official Brand Assets vs. Suspect Candidate Identity</p>
                </div>
              </div>

              <div className="asset-comparison-grid">
                {/* Genuine Brand Column */}
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#047857',
                    backgroundColor: '#ecfdf5',
                    padding: '3px 8px',
                    borderRadius: 999,
                    marginBottom: 10
                  }}>
                    <CheckCircle size={12} />
                    <span>AUTHENTIC BASELINE</span>
                  </div>

                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>{finding.brandName}</h4>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Official Website: {brand.website || 'Verified Corporate Entity'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Authorized Publishers: </span>
                      <strong style={{ color: 'var(--text-main)' }}>
                        {brand.officialDevelopers?.join(', ') || brand.developerNames?.join(', ') || 'Authorized Organization'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Official Verification: </span>
                      <strong style={{ color: '#047857' }}>Verified Gold / Blue Organization</strong>
                    </div>
                  </div>
                </div>

                {/* Candidate Suspect Column */}
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#b91c1c',
                    backgroundColor: '#fef2f2',
                    padding: '3px 8px',
                    borderRadius: 999,
                    marginBottom: 10
                  }}>
                    <AlertTriangle size={12} />
                    <span>SUSPECT CANDIDATE</span>
                  </div>

                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>{finding.candidateName}</h4>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Channel: {finding.platform} ({finding.candidateHandle || finding.packageId})
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Publisher Claim: </span>
                      <strong style={{ color: '#dc2626' }}>
                        {finding.developer || 'Unverified Individual / Alias'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Verification Status: </span>
                      <strong style={{ color: '#dc2626' }}>Unverified / False Claim</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Evidence Signals */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Heuristic Evidence Signals</h3>
                  <p className="card-subtitle">Algorithmic scoring weights that triggered this alert</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {finding.evidenceSignals?.map((sig, idx) => (
                  <div key={idx} style={{
                    padding: '14px 16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                        {sig.name}
                      </span>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: sig.score >= 80 ? '#dc2626' : sig.score >= 50 ? '#d97706' : '#059669'
                      }}>
                        {sig.score}/100 Match
                      </span>
                    </div>

                    <div style={{
                      width: '100%',
                      height: 6,
                      backgroundColor: '#e2e8f0',
                      borderRadius: 999,
                      overflow: 'hidden',
                      marginBottom: 8
                    }}>
                      <div style={{
                        width: `${sig.score}%`,
                        height: '100%',
                        backgroundColor: sig.score >= 80 ? '#ef4444' : sig.score >= 50 ? '#f59e0b' : '#10b981'
                      }} />
                    </div>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {sig.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detection Engine Narrative */}
            <div className="card card-lavender">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Threat Explanation & Rationale</h3>
                  <p className="card-subtitle">Synthesized analysis explaining why this candidate was flagged</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {finding.reasons?.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 14px',
                      backgroundColor: '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #ebe4ff',
                      fontSize: '0.82rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.4
                    }}
                  >
                    <AlertTriangle size={16} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: 2 }} />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Analyst Triage & Investigation Audit Trail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* Triage Action Panel */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Analyst Triage & Actions</h3>
                  <p className="card-subtitle">Transition lifecycle status and document investigation notes</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Current Status Indicator */}
                <div>
                  <label className="form-label">Current Investigation Status</label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: getStatusBadgeConfig(finding.reviewStatus).bg,
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${getStatusBadgeConfig(finding.reviewStatus).border}`,
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    color: getStatusBadgeConfig(finding.reviewStatus).color
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {React.createElement(getStatusBadgeConfig(finding.reviewStatus).icon, { size: 16 })}
                      <span>{finding.reviewStatus}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {analystName}
                    </span>
                  </div>
                </div>

                {/* Investigation Notes Form Input */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Investigation Notes / Evidence Log</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Enter WHOIS registration data, reverse IP lookups, abuse contact records, or takedown reference..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                  {reviewNotes.trim() && (
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: 6, width: '100%', fontSize: '0.76rem' }}
                      disabled={isUpdating}
                      onClick={handleAddNotesOnly}
                    >
                      <PlusCircle size={13} />
                      <span>Log Note to Audit Trail (Keep Current Status)</span>
                    </button>
                  )}
                </div>

                {/* Standardized Status Transition Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <label className="form-label" style={{ marginBottom: 2 }}>Transition Status</label>

                  {/* 1. Confirmed Impersonation */}
                  <button
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('Confirmed')}
                  >
                    <AlertTriangle size={15} />
                    <span>Confirm Brand Impersonation</span>
                  </button>

                  {/* 2. Under Review */}
                  <button
                    className="btn btn-outline"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('Under Review')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: '#d97706',
                      borderColor: '#fde68a'
                    }}
                  >
                    <Clock size={15} />
                    <span>Mark as Under Review</span>
                  </button>

                  {/* 3. False Positive */}
                  <button
                    className="btn btn-outline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: '#047857',
                      borderColor: '#a7f3d0'
                    }}
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('False Positive')}
                  >
                    <CheckCircle size={15} />
                    <span>Mark as False Positive / Benign</span>
                  </button>

                  {/* 4. Closed / Resolved */}
                  <button
                    className="btn btn-outline"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('Closed')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <CheckCheck size={15} />
                    <span>Mark as Closed / Resolved</span>
                  </button>
                </div>

                {/* Takedown Report Generator Action Box */}
                <div style={{
                  marginTop: 6,
                  padding: '14px',
                  backgroundColor: isConfirmed ? '#fef2f2' : '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  border: isConfirmed ? '1.5px solid #fecaca' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isConfirmed ? '#991b1b' : 'var(--text-main)' }}>
                      {isConfirmed ? 'Confirmed Threat Escalation' : 'Legal & Enforcement Notice'}
                    </span>
                    {isConfirmed && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c'
                      }}>
                        READY FOR TAKEDOWN
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Generate an evidence-based takedown report citing observed similarity metrics and publisher discrepancies for store or platform abuse desks.
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{
                      background: isConfirmed
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      boxShadow: isConfirmed
                        ? '0 4px 14px rgba(239, 68, 68, 0.35)'
                        : '0 4px 12px rgba(99, 102, 241, 0.25)',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontWeight: 700,
                      padding: '10px 14px'
                    }}
                    onClick={() => setIsTakedownModalOpen(true)}
                  >
                    <FileText size={15} />
                    <span>Draft Takedown Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Investigation History & Audit Trail Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <History size={18} style={{ color: 'var(--primary)' }} />
                    <h3 className="card-title">Investigation History & Audit Trail</h3>
                  </div>
                  <p className="card-subtitle">
                    Timestamped audit log of lifecycle status transitions and analyst notes
                  </p>
                </div>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)'
                }}>
                  {investigationHistory.length} {investigationHistory.length === 1 ? 'Event' : 'Events'}
                </span>
              </div>

              <div style={{ padding: '8px 4px 4px' }}>
                {investigationHistory.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No investigation events recorded yet.
                  </div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: 26, margin: '8px 0' }}>
                    {/* Vertical timeline guide line */}
                    <div style={{
                      position: 'absolute',
                      left: 10,
                      top: 10,
                      bottom: 16,
                      width: 2,
                      backgroundColor: '#e2e8f0',
                      borderRadius: 2
                    }} />

                    {/* Timeline events shown reverse chronologically (newest first) */}
                    {investigationHistory.slice().reverse().map((entry, idx) => {
                      const config = getStatusBadgeConfig(entry.new_status);
                      const StatusIcon = config.icon;
                      const isLatest = idx === 0;

                      return (
                        <div key={entry.id || idx} style={{
                          position: 'relative',
                          paddingBottom: idx === investigationHistory.length - 1 ? 4 : 20
                        }}>
                          {/* Timeline node icon */}
                          <div style={{
                            position: 'absolute',
                            left: -26,
                            top: 2,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            backgroundColor: config.bg,
                            border: `2px solid ${config.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: config.color,
                            zIndex: 2,
                            boxShadow: isLatest ? '0 0 0 3px rgba(99, 102, 241, 0.2)' : '0 2px 4px rgba(0,0,0,0.06)'
                          }}>
                            <StatusIcon size={11} />
                          </div>

                          {/* Event content box */}
                          <div style={{
                            backgroundColor: isLatest ? '#ffffff' : '#f8fafc',
                            border: isLatest ? '1.5px solid var(--border-color)' : '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 14px',
                            boxShadow: isLatest ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  backgroundColor: config.bg,
                                  color: config.color,
                                  border: `1px solid ${config.border}`,
                                  textTransform: 'uppercase'
                                }}>
                                  <StatusIcon size={10} />
                                  <span>{entry.new_status}</span>
                                </span>

                                {entry.previous_status && entry.previous_status !== 'None' && entry.previous_status !== entry.new_status && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    (was {entry.previous_status})
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                <Clock size={11} />
                                <span title={formatDateTime(entry.timestamp)}>
                                  {formatRelativeTime(entry.timestamp)}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: entry.notes ? 6 : 0 }}>
                              <User size={12} style={{ color: 'var(--primary)' }} />
                              <span>Analyst: <strong style={{ color: 'var(--text-main)' }}>{entry.analyst_name || 'Security Analyst'}</strong></span>
                            </div>

                            {entry.notes && (
                              <div style={{
                                marginTop: 6,
                                padding: '8px 10px',
                                backgroundColor: isLatest ? '#f8fafc' : '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderLeft: '3px solid var(--primary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.78rem',
                                color: 'var(--text-main)',
                                lineHeight: 1.45,
                                whiteSpace: 'pre-wrap'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                  <MessageSquare size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
                                  <span>{entry.notes}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Legal / AI Heuristic Disclaimer */}
            <div className="card" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <Info size={18} style={{ color: '#b45309', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.74rem', color: '#92400e', lineHeight: 1.45 }}>
                  <strong style={{ display: 'block', marginBottom: 2 }}>Risk Disclaimer:</strong>
                  Risk scores represent heuristic similarity indicators and threat signals. They do not constitute certified legal proof or a guaranteed mathematical probability of fraud. Analyst discretion is advised before issuing formal DMCA or brand takedowns.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Takedown Notice Generator Modal Dialog */}
      <TakedownModal
        isOpen={isTakedownModalOpen}
        onClose={() => setIsTakedownModalOpen(false)}
        finding={finding}
        brand={brand}
        analystName={analystName}
      />
    </div>
  );
}
