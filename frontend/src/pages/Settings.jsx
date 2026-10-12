import React, { useState, useEffect } from 'react';
import {
  Server,
  Wifi,
  WifiOff,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Save,
  Sliders,
  Shield,
  Code2,
  ExternalLink
} from 'lucide-react';
import DemoBanner from '../components/DemoBanner';
import api from '../services/api';

export default function Settings() {
  const [baseUrl, setBaseUrl] = useState(api.getBaseUrl());
  const [forcedDemo, setForcedDemo] = useState(api.isForcedDemoMode());
  const [healthStatus, setHealthStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // Interface preferences
  const [refreshInterval, setRefreshInterval] = useState('30');
  const [riskThreshold, setRiskThreshold] = useState('75');

  const testConnection = async () => {
    setIsChecking(true);
    setHealthStatus(null);
    try {
      const res = await api.checkHealth();
      setHealthStatus(res);
    } catch (err) {
      setHealthStatus({ connected: false, status: 'error', error: err.message });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const handleSaveApiSettings = (e) => {
    e.preventDefault();
    api.setBaseUrl(baseUrl);
    api.setForcedDemoMode(forcedDemo);
    setSavedNotice(true);
    testConnection();
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleResetDemoData = () => {
    if (window.confirm('Reset all demo brands, findings, and scans back to factory defaults?')) {
      api.resetDemoDataToDefaults();
      alert('Demo data has been reset to defaults.');
      window.location.reload();
    }
  };

  return (
    <div>
      <DemoBanner isDemo={!healthStatus?.connected} />

      <div className="page-content">
        {/* Saved confirmation */}
        {savedNotice && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#ecfdf5',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #a7f3d0',
            color: '#047857',
            fontSize: '0.84rem'
          }}>
            <CheckCircle2 size={18} />
            <span>API configuration saved successfully. Re-evaluating backend health...</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22 }}>
          {/* LEFT: API & Backend Connectivity Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Server size={18} style={{ color: 'var(--primary)' }} />
                    <span>FastAPI Backend Connection</span>
                  </h3>
                  <p className="card-subtitle">
                    Configure the target API base URL where the detection engine is running
                  </p>
                </div>
              </div>

              {/* Real-time Health Status Card */}
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: healthStatus?.connected ? '#ecfdf5' : '#fffbeb',
                border: `1px solid ${healthStatus?.connected ? '#a7f3d0' : '#fde68a'}`,
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {healthStatus?.connected ? (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wifi size={18} />
                    </div>
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <WifiOff size={18} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: healthStatus?.connected ? '#065f46' : '#92400e' }}>
                      {healthStatus?.connected ? 'Backend Server Online & Connected' : 'Backend Server Offline (Demo Adapter Active)'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: healthStatus?.connected ? '#047857' : '#b45309' }}>
                      {healthStatus?.connected
                        ? `Endpoint ${baseUrl}/health responded with HTTP 200 OK`
                        : forcedDemo ? 'Demo Mode is manually forced on' : `Could not reach ${baseUrl}/health. Using demo datasets.`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={testConnection}
                  disabled={isChecking}
                >
                  <RotateCcw size={13} className={isChecking ? 'spinner' : ''} />
                  <span>{isChecking ? 'Testing...' : 'Test Ping'}</span>
                </button>
              </div>

              {/* API Configuration Form */}
              <form onSubmit={handleSaveApiSettings}>
                <div className="form-group">
                  <label className="form-label">Backend API Base URL</label>
                  <input
                    type="url"
                    className="form-input"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    required
                  />
                  <span className="form-hint">
                    Default comes from <code>VITE_API_BASE_URL</code> in <code>.env</code>. You can override it here dynamically.
                  </span>
                </div>

                <div className="form-group" style={{ marginTop: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={forcedDemo}
                      onChange={(e) => setForcedDemo(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Force Demo Data Mode (offline presentation mode)
                    </span>
                  </label>
                  <span className="form-hint" style={{ marginLeft: 26 }}>
                    When enabled, mock datasets will be served even if a backend server is detected.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ color: '#ef4444', borderColor: '#fecaca' }}
                    onClick={handleResetDemoData}
                  >
                    Reset Demo Storage
                  </button>

                  <button type="submit" className="btn btn-primary btn-sm">
                    <Save size={14} />
                    <span>Save API Settings</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Interface Preferences */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sliders size={18} style={{ color: 'var(--accent-purple)' }} />
                    <span>SOC Interface Preferences</span>
                  </h3>
                  <p className="card-subtitle">Local dashboard refresh intervals and alert sensitivities</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Auto-Refresh Interval</label>
                  <select
                    className="form-select"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(e.target.value)}
                  >
                    <option value="15">Every 15 seconds</option>
                    <option value="30">Every 30 seconds</option>
                    <option value="60">Every 1 minute</option>
                    <option value="0">Manual Refresh Only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">High-Risk Severity Cutoff</label>
                  <select
                    className="form-select"
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(e.target.value)}
                  >
                    <option value="70">Score ≥ 70 / 100</option>
                    <option value="75">Score ≥ 75 / 100 (Standard)</option>
                    <option value="80">Score ≥ 80 / 100 (Strict)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Architecture Specs & Endpoints Guide */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div className="card card-lavender">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Code2 size={18} style={{ color: 'var(--primary)' }} />
                    <span>Planned Backend API Contracts</span>
                  </h3>
                  <p className="card-subtitle">Endpoints expected from the FastAPI service</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.78rem' }}>
                <div style={{ padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid #ebe4ff' }}>
                  <span style={{ fontWeight: 700, color: '#047857' }}>GET</span> <code>/health</code>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Service health & pipeline availability</div>
                </div>

                <div style={{ padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid #ebe4ff' }}>
                  <span style={{ fontWeight: 700, color: '#047857' }}>GET</span> / <span style={{ fontWeight: 700, color: '#4338ca' }}>POST</span> <code>/brands</code>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Brand profile CRUD operations</div>
                </div>

                <div style={{ padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid #ebe4ff' }}>
                  <span style={{ fontWeight: 700, color: '#4338ca' }}>POST</span> <code>/scan/social</code>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Submit candidate social profile for analysis</div>
                </div>

                <div style={{ padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid #ebe4ff' }}>
                  <span style={{ fontWeight: 700, color: '#4338ca' }}>POST</span> <code>/scan/apps</code>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Submit candidate mobile app package for analysis</div>
                </div>

                <div style={{ padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid #ebe4ff' }}>
                  <span style={{ fontWeight: 700, color: '#047857' }}>GET</span> <code>/findings</code>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Query flagged threat findings with filters</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <h3 className="card-title">About SOC 360</h3>
                  <p className="card-subtitle">System build and compliance disclosure</p>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <strong>Platform:</strong> SOC 360 Digital Risk Protection (DRP)
                </div>
                <div>
                  <strong>Version:</strong> 1.0.0 (Hackathon Edition)
                </div>
                <div>
                  <strong>Architecture:</strong> React 19 + Vite frontend paired with asynchronous FastAPI detection backend.
                </div>
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-muted)',
                  lineHeight: 1.4
                }}>
                  SOC 360 complies with zero-credential surveillance policies: all scanned records represent public web and store metadata.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
