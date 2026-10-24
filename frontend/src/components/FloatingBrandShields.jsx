import React from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Lock,
  Zap,
  Globe,
  Smartphone,
  Share2,
  Sparkles,
  Eye,
  CheckCircle2,
  Fingerprint,
  Activity,
  Layers,
} from 'lucide-react';

export default function FloatingBrandShields() {
  return (
    <div className="floating-brand-decor-container" aria-hidden="true">
      {/* ================= LEFT SIDE FLOATING ELEMENTS ================= */}
      <div className="floating-side-group floating-left-group">
        {/* Shield 1: Primary SOC 360 Luminous Brand Shield */}
        <div className="floating-brand-orb orb-shield-primary float-anim-1">
          <div className="orb-glass-inner">
            <div className="orb-icon-glow">
              <ShieldCheck size={28} className="icon-shield-check" />
            </div>
            <div className="orb-badge-text">
              <span className="orb-title">SOC 360</span>
              <span className="orb-sub">Protected Brand</span>
            </div>
          </div>
          <div className="orb-orbit-ring" />
        </div>

        {/* Floating Element 2: Threat Radar Beacon */}
        <div className="floating-brand-orb orb-radar float-anim-2">
          <div className="orb-glass-inner">
            <div className="radar-ping-container">
              <Radio size={20} color="#4f46e5" />
              <span className="beacon-dot" />
            </div>
            <div className="orb-badge-text">
              <span className="orb-title">Active Radar</span>
              <span className="orb-sub">360° Surveillance</span>
            </div>
          </div>
        </div>

        {/* Floating Element 3: Multi-Vector Monitoring Pill */}
        <div className="floating-brand-pill float-anim-3">
          <div className="pill-icon-circle bg-cyan">
            <Smartphone size={14} color="#0891b2" />
          </div>
          <span className="pill-label">App Store & APK Vigilance</span>
        </div>

        {/* Floating Element 4: Zero-Persistence Privacy Shield */}
        <div className="floating-brand-orb orb-privacy float-anim-4">
          <div className="orb-glass-inner">
            <div className="orb-icon-circle bg-emerald">
              <Lock size={18} color="#059669" />
            </div>
            <div className="orb-badge-text">
              <span className="orb-title">Zero Persistence</span>
              <span className="orb-sub">In-Memory Privacy</span>
            </div>
          </div>
        </div>

        {/* Floating Element 5: Social Vector Pill */}
        <div className="floating-brand-pill float-anim-5">
          <div className="pill-icon-circle bg-indigo">
            <Share2 size={13} color="#4f46e5" />
          </div>
          <span className="pill-label">X · Telegram · Instagram</span>
        </div>
      </div>

      {/* ================= RIGHT SIDE FLOATING ELEMENTS ================= */}
      <div className="floating-side-group floating-right-group">
        {/* Shield 2: Threat Alert & Impersonation Defense Shield */}
        <div className="floating-brand-orb orb-shield-alert float-anim-2">
          <div className="orb-glass-inner">
            <div className="orb-icon-glow glow-red">
              <ShieldAlert size={26} className="icon-shield-alert" />
            </div>
            <div className="orb-badge-text">
              <span className="orb-title">Impersonation Shield</span>
              <span className="orb-sub">Rapid Threat Defense</span>
            </div>
          </div>
          <div className="orb-orbit-ring ring-cyan" />
        </div>

        {/* Floating Element 6: RapidFuzz & ImageHash Detection Engine */}
        <div className="floating-brand-orb orb-engine float-anim-1">
          <div className="orb-glass-inner">
            <div className="orb-icon-circle bg-purple">
              <Zap size={18} color="#7c3aed" />
            </div>
            <div className="orb-badge-text">
              <span className="orb-title">AI Detection</span>
              <span className="orb-sub">RapidFuzz + ImageHash</span>
            </div>
          </div>
        </div>

        {/* Floating Element 7: Precision Metric Pill */}
        <div className="floating-brand-pill float-anim-4">
          <div className="pill-icon-circle bg-emerald">
            <Activity size={14} color="#059669" />
          </div>
          <span className="pill-label">99.8% Detection Accuracy</span>
        </div>

        {/* Floating Element 8: Global Domain Surveillance */}
        <div className="floating-brand-orb orb-global float-anim-3">
          <div className="orb-glass-inner">
            <div className="orb-icon-circle bg-blue">
              <Globe size={18} color="#2563eb" />
            </div>
            <div className="orb-badge-text">
              <span className="orb-title">Look-alike Typosquats</span>
              <span className="orb-sub">Phishing Interception</span>
            </div>
          </div>
        </div>

        {/* Floating Element 9: Evidence & Legal Takedown Pill */}
        <div className="floating-brand-pill float-anim-5">
          <div className="pill-icon-circle bg-violet">
            <Sparkles size={13} color="#7c3aed" />
          </div>
          <span className="pill-label">One-Click DMCA Dossiers</span>
        </div>
      </div>
    </div>
  );
}
