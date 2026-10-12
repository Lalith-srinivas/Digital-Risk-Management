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
  Info
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import DemoBanner from '../components/DemoBanner';
import api from '../services/api';
import { formatDate, formatDateTime, formatRelativeTime } from '../utils/formatters';

export default function FindingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  // Review Actions State
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const loadFinding = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFindingById(id);
      if (!res.data) throw new Error('Finding not found');
      setFinding(res.data);
      setReviewNotes(res.data.reviewNotes || '');
      setIsDemo(res.isDemoData || false);
    } catch (err) {
      setError(err.message || 'Failed to load finding details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinding();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    setIsUpdating(true);
    setActionSuccessMessage('');
    try {
      const res = await api.updateFindingStatus(id, newStatus, reviewNotes);
      setFinding(res.data);
      setActionSuccessMessage(`Finding status successfully updated to "${newStatus}"`);
      setTimeout(() => setActionSuccessMessage(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to update review status');
    } finally {
      setIsUpdating(false);
    }
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

  return (
    <div>
      <DemoBanner isDemo={isDemo} />

      <div className="page-content">
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
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
            fontSize: '0.84rem'
          }}>
            <CheckCircle size={18} />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 18
          }}>
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
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              padding: '12px 18px',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Composite Threat Score
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
                {finding.riskLevel} Impersonation Probability
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Dossier Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 22 }}>
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

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)'
              }}>
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
                        {brand.developerNames?.join(', ') || 'Apex Financial Technologies LLC'}
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

          {/* RIGHT: Analyst Triage & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* Triage Action Panel */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">Analyst Triage & Actions</h3>
                  <p className="card-subtitle">Take action or adjust investigation lifecycle</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Current Status</label>
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: 'var(--text-main)'
                  }}>
                    {finding.reviewStatus}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Investigation Notes / Evidence Log</label>
                  <textarea
                    rows={4}
                    className="form-textarea"
                    placeholder="Enter analyst review remarks, WHOIS lookups, or takedown ticket reference..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <button
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('Confirmed Impersonation')}
                  >
                    <AlertTriangle size={15} />
                    <span>Confirm Brand Impersonation</span>
                  </button>

                  <button
                    className="btn btn-outline"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('Investigating')}
                  >
                    <Clock size={15} />
                    <span>Mark as Under Investigation</span>
                  </button>

                  <button
                    className="btn btn-outline"
                    style={{ color: '#047857', borderColor: '#a7f3d0' }}
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('False Positive')}
                  >
                    <CheckCircle size={15} />
                    <span>Mark as Benign / False Positive</span>
                  </button>

                  <button
                    className="btn btn-outline"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('Resolved')}
                  >
                    <CheckCircle size={15} />
                    <span>Mark as Resolved / Takedown Issued</span>
                  </button>
                </div>
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
    </div>
  );
}
