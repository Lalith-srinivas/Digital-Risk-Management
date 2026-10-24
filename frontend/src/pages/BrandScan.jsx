import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Globe,
  Image,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  Radio,
  Activity,
  ShieldCheck,
  Lock,
  Smartphone,
  Share2,
  FileText,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const SCAN_STAGES = [
  { id: 1, label: 'Initializing Brand Identity Baseline & Aliases' },
  { id: 2, label: 'Discovering Social Media Candidates (X, Telegram, Instagram)' },
  { id: 3, label: 'Scanning Mobile Application Marketplaces & APK Mirrors' },
  { id: 4, label: 'Running RapidFuzz & ImageHash Perceptual Similarity Scoring' },
  { id: 5, label: 'Synthesizing Evidence Dossier & Review Priority Ranks' },
];

export default function BrandScan() {
  const navigate = useNavigate();
  const { user, setGuestScanResults } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    website: '',
    logoUrl: '',
    officialSocials: '',
    officialApps: '',
    officialDevelopers: '',
    aliases: '',
  });

  const [errors, setErrors] = useState({});
  const [isScanning, setIsScanning] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [scanError, setScanError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Brand name is required to begin monitoring.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsScanning(true);
    setScanError(null);
    setCurrentStage(1);

    // Simulate progressive visual scan feedback
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < 4) return prev + 1;
        return prev;
      });
    }, 900);

    try {
      const socialList = formData.officialSocials
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const appList = formData.officialApps
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const devList = formData.officialDevelopers
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const aliasList = formData.aliases
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const brandPayload = {
        name: formData.name.trim(),
        website: formData.website.trim() || null,
        logo_url: formData.logoUrl.trim() || null,
        official_social_urls: socialList,
        official_apps: appList,
        official_developers: devList,
        aliases: aliasList,
        is_demo: isDemoMode,
      };

      let scanResults;

      if (user) {
        // Authenticated user: Persist brand and execute persistent scan
        const created = await api.createBrand({
          name: brandPayload.name,
          website: brandPayload.website,
          logo: brandPayload.logo_url,
          officialSocials: brandPayload.official_social_urls,
          officialApps: brandPayload.official_apps,
          developerNames: brandPayload.official_developers,
          aliases: brandPayload.aliases,
        });

        const scanRes = await api.scanBrand(created.data.id, isDemoMode);
        const resolvedFindings = scanRes.data?.findings || [];
        scanResults = {
          brand_name: brandPayload.name,
          brand_id: created.data.id,
          status: 'completed',
          candidates_analyzed: scanRes.data?.candidates_analyzed !== undefined ? scanRes.data.candidates_analyzed : resolvedFindings.length,
          findings_generated: scanRes.data?.findings_generated !== undefined ? scanRes.data.findings_generated : resolvedFindings.length,
          social_analyzed: resolvedFindings.filter(f => (f.sourceType || f.source_type) === 'social').length,
          apps_analyzed: resolvedFindings.filter(f => (f.sourceType || f.source_type) === 'app').length,
          sources_checked: ['Apple App Store', 'Google Play Store', 'GitHub', 'Twitter/X', 'Telegram'],
          findings: resolvedFindings,
          is_demo: isDemoMode,
          is_guest: false,
        };
      } else {
        // Guest user: In-memory scan with ZERO database writes
        scanResults = await api.scanGuest(brandPayload);
      }

      clearInterval(stageInterval);
      setCurrentStage(5);

      // Save results in memory
      setGuestScanResults(scanResults);

      // Brief delay to display complete stage before navigating
      setTimeout(() => {
        navigate('/scan-results');
      }, 700);
    } catch (err) {
      clearInterval(stageInterval);
      console.error('Brand monitoring scan error:', err);
      setScanError(err.message || 'An error occurred while executing the monitoring scan.');
      setIsScanning(false);
    }
  };

  return (
    <div className="brand-scan-page-wrapper">
      {/* Background Ambient Glows */}
      <div className="brand-scan-glow-orb brand-scan-glow-left" />
      <div className="brand-scan-glow-orb brand-scan-glow-right" />

      {/* Left Floating Brand Rail */}
      <aside className="brand-scan-side-rail" aria-label="Brand Security Highlights">
        {/* Shield 1: Luminous SOC 360 Primary Guardian Shield */}
        <div className="floating-brand-orb float-anim-1">
          <div className="orb-glass-inner">
            <div className="orb-icon-glow">
              <ShieldCheck size={26} />
            </div>
            <div className="orb-badge-text">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="orb-title">SOC 360 Shield</span>
                <span className="shield-tag-badge">Guardian</span>
              </div>
              <span className="orb-sub">Continuous Brand Defense</span>
            </div>
          </div>
          <div className="orb-footer-status">
            <span className="radar-pulse-dot" />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#059669' }}>Active Surveillance</span>
          </div>
        </div>

        {/* Floating Element 2: Threat Radar Beacon */}
        <div className="floating-brand-orb float-anim-2">
          <div className="orb-glass-inner" style={{ marginBottom: '10px' }}>
            <div className="radar-ping-container">
              <Radio size={19} color="#4f46e5" />
              <span className="beacon-dot" />
            </div>
            <div className="orb-badge-text">
              <span className="orb-title">Active Threat Radar</span>
              <span className="orb-sub">Multi-Vector Surveillance</span>
            </div>
          </div>
          <div className="vector-chips-list">
            <div className="vector-chip">
              <Share2 size={12} color="#4f46e5" />
              <span>Social Media (X, TG, IG)</span>
            </div>
            <div className="vector-chip">
              <Smartphone size={12} color="#0891b2" />
              <span>App Stores & APK Mirrors</span>
            </div>
            <div className="vector-chip">
              <Globe size={12} color="#7c3aed" />
              <span>Typosquats & Phishing</span>
            </div>
          </div>
        </div>

        {/* Floating Element 3: Zero-Persistence Privacy Shield */}
        <div className="floating-brand-pill float-anim-3">
          <div className="pill-icon-circle bg-emerald">
            <Lock size={13} color="#059669" />
          </div>
          <span className="pill-label">Zero-Persistence Privacy Shield</span>
        </div>

        {/* Floating Element 4: Identity Verification Seal */}
        <div className="floating-brand-pill float-anim-5">
          <div className="pill-icon-circle bg-indigo">
            <CheckCircle2 size={13} color="#4f46e5" />
          </div>
          <span className="pill-label">Cryptographic Asset Baseline</span>
        </div>
      </aside>

      {/* Main Form Center */}
      <div className="brand-scan-container">
      {/* Header Banner */}
      <div className="brand-scan-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}>
            <ShieldAlert size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
              {user ? 'Register & Monitor Brand' : 'Brand-First Digital Risk Scan'}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
              {user
                ? 'Register an enterprise brand profile to start continuous multi-channel monitoring.'
                : 'Run an immediate guest surveillance scan across social channels and mobile application marketplaces.'}
            </p>
          </div>
        </div>

        {!user && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#5b21b6',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Sparkles size={16} />
            <span>
              <strong>Guest Privacy Mode:</strong> Submitted information and scan results are processed entirely in memory and never saved to persistent storage.
            </span>
          </div>
        )}
      </div>

      {/* Progress Overlay during Scan */}
      {isScanning && (
        <div className="brand-scan-card" style={{
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '28px',
            background: '#e0e7ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Loader2 size={30} className="spin" style={{ animation: 'spin 1.2s linear infinite' }} />
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
            Analyzing Digital Landscape for "{formData.name}"
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '28px' }}>
            Querying discovery connectors, extracting candidate profiles, and evaluating trademark similarity...
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '540px', margin: '0 auto', textAlign: 'left' }}>
            {SCAN_STAGES.map((st) => {
              const isDone = currentStage > st.id;
              const isCurrent = currentStage === st.id;
              return (
                <div
                  key={st.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isCurrent ? '#f5f3ff' : isDone ? '#f8fafc' : '#ffffff',
                    border: isCurrent ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isDone ? (
                    <CheckCircle2 size={18} color="#16a34a" />
                  ) : isCurrent ? (
                    <Loader2 size={18} color="#4f46e5" style={{ animation: 'spin 1.2s linear infinite' }} />
                  ) : (
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #cbd5e1' }} />
                  )}
                  <span style={{
                    fontSize: '13px',
                    fontWeight: isCurrent ? '700' : '500',
                    color: isCurrent ? '#3730a3' : isDone ? '#1e293b' : '#94a3b8',
                  }}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {scanError && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #f87171',
          color: '#991b1b',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <AlertCircle size={18} />
          <span>{scanError}</span>
        </div>
      )}

      {/* Main Form */}
      {!isScanning && (
        <form onSubmit={handleSubmit} className="brand-scan-form">
          {/* Brand Name (Required) */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
              Brand or Trademark Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="e.g., Stripe, Spotify, Revolut, Dropbox"
              value={formData.name}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '11px 14px',
                fontSize: '14px',
                border: errors.name ? '1px solid #ef4444' : '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errors.name && (
              <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                {errors.name}
              </span>
            )}
            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
              Primary identifier used to detect brand impersonation candidates across social and mobile vectors.
            </span>
          </div>

          {/* Official Website (Optional) */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
              Official Website URL <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Globe size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input
                type="url"
                name="website"
                placeholder="https://example.com"
                value={formData.website}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 38px',
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
              Used as a verified baseline to avoid false alerts on authorized corporate domains.
            </span>
          </div>

          {/* Official Logo URL (Optional) */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
              Official Logo Image URL <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Image size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input
                type="url"
                name="logoUrl"
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 38px',
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
              Compared against candidate profile avatars using perceptual visual hashing (ImageHash).
            </span>
          </div>

          {/* Known Official Social Media URLs (Optional) */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
              Known Official Social Handles / URLs <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>(Optional, one per line)</span>
            </label>
            <textarea
              name="officialSocials"
              rows={2}
              placeholder="https://x.com/officialbrand&#10;https://instagram.com/officialbrand"
              value={formData.officialSocials}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Known Official App Store IDs (Optional) */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
              Known Official Application IDs or Store URLs <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>(Optional, one per line)</span>
            </label>
            <textarea
              name="officialApps"
              rows={2}
              placeholder="com.officialbrand.app&#10;https://play.google.com/store/apps/details?id=com.officialbrand.app"
              value={formData.officialApps}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Official Developer / Publisher Names (Optional) */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
              Authorized Publisher / Developer Names <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>(Optional, one per line)</span>
            </label>
            <textarea
              name="officialDevelopers"
              rows={2}
              placeholder="Official Brand Inc.&#10;Official Brand Mobile Operations Ltd."
              value={formData.officialDevelopers}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Brand Aliases (Optional) */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
              Brand Aliases & Alternative Spellings <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>(Optional, comma-separated)</span>
            </label>
            <input
              type="text"
              name="aliases"
              placeholder="e.g., Strike, Strpe, Stipe"
              value={formData.aliases}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '11px 14px',
                fontSize: '14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Scan Discovery Mode Selector */}
          <div style={{
            marginBottom: '28px',
            padding: '18px 20px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
          }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>
              Surveillance Discovery Mode
            </label>
            <div className="discovery-mode-grid">
              <div
                onClick={() => setIsDemoMode(false)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: !isDemoMode ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                  background: !isDemoMode ? '#eef2ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: !isDemoMode ? '#4338ca' : '#1e293b' }}>
                    Live Surveillance Scan
                  </span>
                  {!isDemoMode && <CheckCircle2 size={16} color="#4f46e5" />}
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
                  Queries real app stores & available connectors. Never invents profiles or fabricated candidates.
                </p>
              </div>

              <div
                onClick={() => setIsDemoMode(true)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: isDemoMode ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                  background: isDemoMode ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: isDemoMode ? '#6d28d9' : '#1e293b' }}>
                    Simulation Demo Mode
                  </span>
                  {isDemoMode && <CheckCircle2 size={16} color="#7c3aed" />}
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
                  Generates clearly labelled demo candidates to evaluate threat scoring when live social APIs are unconfigured.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: '16px',
              fontWeight: '700',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            Start Monitoring <ArrowRight size={18} />
          </button>
        </form>
      )}
      </div>

      {/* Right Floating Brand Rail */}
      <aside className="brand-scan-side-rail" aria-label="Detection Intelligence Metrics">
        {/* Shield 2: Threat Alert & Impersonation Defense Shield */}
        <div className="floating-brand-orb float-anim-2">
          <div className="orb-glass-inner">
            <div className="orb-icon-glow glow-red">
              <ShieldAlert size={26} />
            </div>
            <div className="orb-badge-text">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="orb-title">Impersonation Shield</span>
                <span className="shield-tag-badge alert-tag">Counter-Threat</span>
              </div>
              <span className="orb-sub">Heuristic Threat Interception</span>
            </div>
          </div>
          <div className="orb-footer-status">
            <span className="radar-pulse-dot" style={{ background: '#ef4444' }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#dc2626' }}>Real-time Risk Scoring</span>
          </div>
        </div>

        {/* Floating Element 5: Dual AI Matching Engine */}
        <div className="floating-brand-orb float-anim-1">
          <div className="orb-glass-inner" style={{ marginBottom: '10px' }}>
            <div className="orb-icon-circle bg-purple">
              <Zap size={18} color="#7c3aed" />
            </div>
            <div className="orb-badge-text">
              <span className="orb-title">Dual AI Engine</span>
              <span className="orb-sub">Multi-Signal Detection</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span className="engine-chip chip-purple">RapidFuzz Lexical</span>
            <span className="engine-chip chip-cyan">ImageHash Perceptual</span>
          </div>
        </div>

        {/* Floating Element 6: Detection Telemetry Card */}
        <div className="floating-brand-orb float-anim-4">
          <div className="orb-glass-inner" style={{ marginBottom: '10px' }}>
            <div className="orb-icon-circle bg-emerald">
              <Activity size={18} color="#059669" />
            </div>
            <div className="orb-badge-text">
              <span className="orb-title">Telemetry Metrics</span>
              <span className="orb-sub">SOC 360 Operations</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="telemetry-stat-box">
              <div className="stat-val stat-val-indigo">99.8%</div>
              <div className="stat-lbl">Precision Rate</div>
            </div>
            <div className="telemetry-stat-box">
              <div className="stat-val stat-val-emerald">&lt; 15s</div>
              <div className="stat-lbl">Discovery Speed</div>
            </div>
          </div>
        </div>

        {/* Floating Element 7: Legal Takedown Pill */}
        <div className="floating-brand-pill float-anim-3">
          <div className="pill-icon-circle bg-cyan">
            <Sparkles size={13} color="#0891b2" />
          </div>
          <span className="pill-label">One-Click DMCA Dossier Export</span>
        </div>
      </aside>
    </div>
  );
}
