import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Smartphone,
  Share2,
  FileText,
  ArrowRight,
  Lock,
  CheckCircle2,
  Sparkles,
  Zap,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import XylophoneHelix from '../components/XylophoneHelix';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .floating-navbar {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          width: min(1140px, calc(100% - 32px));
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 22px;
          border-radius: 9999px;
          background: rgba(7, 10, 24, 0.76);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45), 0 1px 1px rgba(255, 255, 255, 0.1) inset;
          transition: all 0.25s ease;
        }

        .nav-protection-badge {
          display: inline-block;
          font-size: 11px;
          color: #c7d2fe;
          font-weight: 600;
          margin-left: 8px;
          background: rgba(99, 102, 241, 0.25);
          border: 1px solid rgba(129, 140, 248, 0.3);
          padding: 2px 8px;
          border-radius: 12px;
          white-space: nowrap;
        }

        .nav-signin-btn {
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .nav-signin-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #ffffff;
        }

        .nav-start-btn {
          padding: 7px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          border: none;
          border-radius: 9999px;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .nav-start-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(79, 70, 229, 0.55);
        }

        .nav-start-text-full {
          display: inline;
        }
        .nav-start-text-mobile {
          display: none;
        }

        @media (max-width: 640px) {
          .floating-navbar {
            top: 10px;
            width: calc(100% - 20px);
            padding: 8px 12px;
            border-radius: 9999px;
          }
          .nav-protection-badge {
            display: none !important;
          }
          .nav-signin-btn {
            padding: 6px 12px;
            font-size: 12px;
          }
          .nav-start-btn {
            padding: 6px 13px;
            font-size: 12px;
            gap: 4px;
          }
          .nav-start-text-full {
            display: none;
          }
          .nav-start-text-mobile {
            display: inline;
          }
          .hero-content-box {
            padding: 105px 16px 50px !important;
          }
          .hero-title-main {
            font-size: 34px !important;
            line-height: 1.15 !important;
          }
          .hero-desc-main {
            font-size: 15px !important;
            margin-bottom: 24px !important;
          }
        }

        /* Mind Map / Hub-and-Spoke Workflow Design */
        .mindmap-section {
          background: #fbfbfa;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          padding: 68px 24px 60px;
          position: relative;
          overflow: hidden;
        }

        .mindmap-bg-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(148, 163, 184, 0.22) 1px, transparent 1px);
          background-size: 26px 26px;
          pointer-events: none;
        }

        .mindmap-container {
          max-width: 1080px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .mindmap-desktop {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0px;
          margin-top: 36px;
        }

        .mindmap-col {
          width: 320px;
          display: flex;
          flex-direction: column;
          gap: 48px;
        }

        .mindmap-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left;
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 4px rgba(15, 23, 42, 0.03);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          cursor: default;
        }

        .mindmap-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.1), 0 4px 8px rgba(15, 23, 42, 0.04);
          border-color: #cbd5e1;
        }

        .mindmap-card-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          transition: transform 0.25s ease;
        }

        .mindmap-card:hover .mindmap-card-icon-wrap {
          transform: scale(1.08);
        }

        .mindmap-icon-orange-1 {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        }

        .mindmap-icon-green-1 {
          background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%);
        }

        .mindmap-icon-green-2 {
          background: linear-gradient(135deg, #65a30d 0%, #15803d 100%);
        }

        .mindmap-icon-orange-2 {
          background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
        }

        .mindmap-card-content {
          flex: 1;
          min-width: 0;
        }

        .mindmap-card-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mindmap-card-step-badge {
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 6px;
          letter-spacing: 0.5px;
        }

        .mindmap-card-desc {
          font-size: 12.5px;
          color: #64748b;
          line-height: 1.45;
          margin: 0;
        }

        /* Center Stage with Connectors and Hub */
        .mindmap-center-stage {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 320px;
          flex-shrink: 0;
        }

        .mindmap-svg-connector {
          width: 85px;
          height: 270px;
          display: block;
          overflow: visible;
        }

        @keyframes dashFlow {
          to {
            stroke-dashoffset: -16;
          }
        }

        .mindmap-path {
          animation: dashFlow 2.4s linear infinite;
        }

        .mindmap-hub-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
        }

        .mindmap-hexagon-wrap {
          width: 140px;
          height: 154px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 10px 24px rgba(234, 88, 12, 0.28));
          animation: hexPulse 3.5s ease-in-out infinite;
        }

        @keyframes hexPulse {
          0%, 100% {
            filter: drop-shadow(0 8px 18px rgba(234, 88, 12, 0.22));
          }
          50% {
            filter: drop-shadow(0 14px 30px rgba(234, 88, 12, 0.45));
          }
        }

        .mindmap-radar-ring {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          border: 1px dashed rgba(234, 88, 12, 0.28);
          pointer-events: none;
          animation: radarRotate 24s linear infinite;
        }

        @keyframes radarRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .mindmap-hub-badge {
          margin-top: 12px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 9999px;
          padding: 4px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .mindmap-hub-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
        }

        .mindmap-hub-badge-text {
          font-size: 11px;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: 0.5px;
        }

        /* Mobile Mind Map Layout */
        .mindmap-mobile {
          display: none;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          margin-top: 28px;
        }

        @media (max-width: 900px) {
          .mindmap-desktop {
            display: none;
          }
          .mindmap-mobile {
            display: flex;
          }
        }
      `}</style>

      {/* Floating Navbar */}
      <header className="floating-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '36px',
            height: '36px',
            minWidth: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
          }}>
            <ShieldAlert size={20} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <span style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '-0.5px', color: '#ffffff', whiteSpace: 'nowrap' }}>SOC 360</span>
            <span className="nav-protection-badge">
              Digital Risk Protection
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/login')}
            className="nav-signin-btn"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/scan')}
            className="nav-start-btn"
          >
            <span className="nav-start-text-full">Start Monitoring</span>
            <span className="nav-start-text-mobile">Start</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Hero Section with Interactive Xylophone Helix Background */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#03050c',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        {/* Interactive 3D Xylophone Helix Canvas Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'auto',
        }}>
          <XylophoneHelix
            background="#03050c"
            baseColor="#FFF3F3"
            bars={44}
            shape="helix"
            torusRadius={1.38}
            tubeRadius={0.64}
            speed={100}
            drag={100}
            scale={420}
            hover={{
              glow: 48,
              tint: 47,
              colors: ["#FFF9F9", "#0012FF", "#060146"],
              strength: 184,
            }}
            camera={{ tilt: 54, sideTilt: 78 }}
            width="100%"
            height="100%"
          />
        </div>

        {/* Ambient Radial Vignette for Content Contrast */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(3, 5, 12, 0.38) 0%, rgba(3, 5, 12, 0.88) 88%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />


        {/* Hero Content Container */}
        <div
          className="hero-content-box"
          style={{
            position: 'relative',
            zIndex: 3,
            maxWidth: '1100px',
            width: '100%',
            margin: 'auto 0',
            padding: '120px 24px 64px',
            textAlign: 'center',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99, 102, 241, 0.18)',
            border: '1px solid rgba(129, 140, 248, 0.35)',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#c7d2fe',
            marginBottom: '24px',
            backdropFilter: 'blur(8px)',
          }}>
            <Sparkles size={16} /> Autonomous Brand Surveillance & Threat Detection
          </div>

          <h1
            className="hero-title-main"
            style={{
              fontSize: '54px',
              fontWeight: '800',
              lineHeight: '1.15',
              letterSpacing: '-1px',
              color: '#ffffff',
              marginBottom: '20px',
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.7)',
            }}
          >
            Protect Your Brand Across the <br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Digital World
            </span>
          </h1>

          <p
            className="hero-desc-main"
            style={{
              fontSize: '19px',
              color: '#cbd5e1',
              maxWidth: '720px',
              margin: '0 auto 36px',
              lineHeight: '1.6',
              textShadow: '0 1px 10px rgba(0, 0, 0, 0.6)',
            }}
          >
            Identify potential brand impersonation across social media and application marketplaces using explainable risk analysis.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', pointerEvents: 'auto' }}>
            <button
              onClick={() => navigate('/scan')}
              style={{
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: '700',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              Start Monitoring <ArrowRight size={18} />
            </button>

            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#f8fafc',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(8px)',
                transition: 'background 0.15s ease',
              }}
            >
              <Lock size={16} /> Sign In
            </button>
          </div>

          <div style={{ marginTop: '20px', fontSize: '13px', color: '#94a3b8' }}>
            <span style={{ fontWeight: '600', color: '#a5b4fc' }}>No account required</span> for guest brand scans • In-memory privacy guaranteed
          </div>
        </div>

        {/* Subtle Scroll Down Indicator */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '5px',
          color: '#94a3b8',
          fontSize: '10px',
          fontWeight: '700',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          zIndex: 3,
          opacity: 0.7,
        }}>
          <span>Scroll</span>
          <div style={{
            width: '16px',
            height: '24px',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '3px',
          }}>
            <div style={{
              width: '2px',
              height: '5px',
              background: '#818cf8',
              borderRadius: '2px',
            }} />
          </div>
        </div>
      </section>

      {/* Primary Feature Grid */}
      <section style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '32px 24px 64px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
        }}>
          {/* Card 1 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            textAlign: 'left',
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: '#e0e7ff',
              color: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <Share2 size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
              Social Impersonation Detection
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Detect rogue handles, typosquats, unicode homoglyphs, and fake VIP profiles across X, Telegram, and Instagram using RapidFuzz lexical matching.
            </p>
          </div>

          {/* Card 2 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            textAlign: 'left',
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: '#fdf4ff',
              color: '#a21caf',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <Smartphone size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
              Application Store Surveillance
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Uncover deceptive app listings, cloned APKs, publisher mismatches, and repackaged trojans mimicking your brand on mobile marketplaces.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            textAlign: 'left',
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: '#fef3c7',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
              Explainable Risk Scoring
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Transparent review priorities (0–100) based on perceptual ImageHash visual marks, token ratios, and developer verification—no black-box guesswork.
            </p>
          </div>

          {/* Card 4 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            textAlign: 'left',
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: '#ecfdf5',
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <FileText size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
              Downloadable Scan Reports
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Instantly export audit-ready PDF Threat Dossiers and CSV spreadsheets for takedown requests, brand legal teams, and executive briefings.
            </p>
          </div>
        </div>
      </section>

      {/* Monitoring Workflow Steps - Mind Map / Hub-and-Spoke Design */}
      <section className="mindmap-section">
        <div className="mindmap-bg-grid" />
        <div className="mindmap-container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.5px' }}>
              Brand-First Monitoring Workflow
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6' }}>
              No manual URL submission required. Register or select your brand, and SOC 360 handles the entire reconnaissance cycle.
            </p>
          </div>

          {/* Desktop Mind Map View */}
          <div className="mindmap-desktop">
            {/* Left Column (Steps 01 & 02) */}
            <div className="mindmap-col">
              {/* Card 01 - Register Brand */}
              <div className="mindmap-card">
                <div className="mindmap-card-icon-wrap mindmap-icon-orange-1">
                  <Eye size={22} />
                </div>
                <div className="mindmap-card-content">
                  <div className="mindmap-card-title">
                    <span>Register Brand</span>
                    <span className="mindmap-card-step-badge" style={{ background: '#ffedd5', color: '#c2410c' }}>01</span>
                  </div>
                  <p className="mindmap-card-desc">
                    Enter trademark name & official domains to anchor the ground-truth baseline without manual URLs.
                  </p>
                </div>
              </div>

              {/* Card 02 - Auto-Scan Vectors */}
              <div className="mindmap-card">
                <div className="mindmap-card-icon-wrap mindmap-icon-green-1">
                  <Zap size={22} />
                </div>
                <div className="mindmap-card-content">
                  <div className="mindmap-card-title">
                    <span>Auto-Scan Vectors</span>
                    <span className="mindmap-card-step-badge" style={{ background: '#ecfccb', color: '#4d7c0f' }}>02</span>
                  </div>
                  <p className="mindmap-card-desc">
                    Simultaneous automated discovery across social handles (X, Telegram, IG) and mobile app stores.
                  </p>
                </div>
              </div>
            </div>

            {/* Center Stage with SVG Connectors & Central Hexagon Hub */}
            <div className="mindmap-center-stage">
              {/* Left Connector SVG */}
              <svg className="mindmap-svg-connector" viewBox="0 0 85 270" fill="none">
                {/* Top-Left Curve */}
                <path
                  d="M 0 58 L 12 58 C 48 58, 62 98, 85 98"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  className="mindmap-path"
                />
                {/* Anchor dot for Card 01 */}
                <circle cx="12" cy="58" r="4.5" fill="#0f172a" />
                <circle cx="12" cy="58" r="2" fill="#ffffff" />

                {/* Bottom-Left Curve */}
                <path
                  d="M 0 212 L 12 212 C 48 212, 62 172, 85 172"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  className="mindmap-path"
                />
                {/* Anchor dot for Card 02 */}
                <circle cx="12" cy="212" r="4.5" fill="#0f172a" />
                <circle cx="12" cy="212" r="2" fill="#ffffff" />
              </svg>

              {/* Central Hexagon Hub */}
              <div className="mindmap-hub-container">
                <div className="mindmap-hexagon-wrap">
                  <div className="mindmap-radar-ring" />
                  <svg width="140" height="154" viewBox="0 0 140 154" fill="none">
                    <defs>
                      <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#111827" />
                        <stop offset="100%" stopColor="#070a12" />
                      </linearGradient>
                      <linearGradient id="orangeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#ea580c" />
                      </linearGradient>
                    </defs>

                    {/* Outer Hexagon */}
                    <polygon
                      points="70,5 135,40 135,114 70,149 5,114 5,40"
                      fill="url(#hexGrad)"
                      stroke="url(#orangeGlow)"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />

                    {/* Inner Dashed Hexagon */}
                    <polygon
                      points="70,14 126,45 126,109 70,140 14,109 14,45"
                      fill="none"
                      stroke="rgba(249, 115, 22, 0.35)"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      strokeLinejoin="round"
                    />

                    {/* Stylized Cyber Shield / Core Emblem */}
                    <g transform="translate(42, 48)">
                      <path
                        d="M 28 6 L 48 18 L 48 40 L 28 52 L 8 40 L 8 18 Z"
                        fill="none"
                        stroke="#ea580c"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 17 26 L 28 20 L 39 26 L 39 34 L 28 40 L 17 34 Z"
                        fill="rgba(249, 115, 22, 0.2)"
                        stroke="#fb923c"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="28" cy="30" r="3" fill="#ffffff" />
                    </g>
                  </svg>
                </div>
                <div className="mindmap-hub-badge">
                  <div className="mindmap-hub-badge-dot" />
                  <span className="mindmap-hub-badge-text">SOC 360 CORE</span>
                </div>
              </div>

              {/* Right Connector SVG */}
              <svg className="mindmap-svg-connector" viewBox="0 0 85 270" fill="none">
                {/* Top-Right Curve */}
                <path
                  d="M 0 98 C 23 98, 37 58, 73 58 L 85 58"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  className="mindmap-path"
                />
                {/* Anchor dot for Card 03 */}
                <circle cx="73" cy="58" r="4.5" fill="#0f172a" />
                <circle cx="73" cy="58" r="2" fill="#ffffff" />

                {/* Bottom-Right Curve */}
                <path
                  d="M 0 172 C 23 172, 37 212, 73 212 L 85 212"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  className="mindmap-path"
                />
                {/* Anchor dot for Card 04 */}
                <circle cx="73" cy="212" r="4.5" fill="#0f172a" />
                <circle cx="73" cy="212" r="2" fill="#ffffff" />
              </svg>
            </div>

            {/* Right Column (Steps 03 & 04) */}
            <div className="mindmap-col">
              {/* Card 03 - Similarity Analysis */}
              <div className="mindmap-card">
                <div className="mindmap-card-icon-wrap mindmap-icon-green-2">
                  <Search size={22} />
                </div>
                <div className="mindmap-card-content">
                  <div className="mindmap-card-title">
                    <span>Similarity Analysis</span>
                    <span className="mindmap-card-step-badge" style={{ background: '#dcfce7', color: '#15803d' }}>03</span>
                  </div>
                  <p className="mindmap-card-desc">
                    Deep algorithmic matching with RapidFuzz lexical analysis and ImageHash perceptual logo comparison.
                  </p>
                </div>
              </div>

              {/* Card 04 - Triage Findings */}
              <div className="mindmap-card">
                <div className="mindmap-card-icon-wrap mindmap-icon-orange-2">
                  <ShieldCheck size={22} />
                </div>
                <div className="mindmap-card-content">
                  <div className="mindmap-card-title">
                    <span>Triage Findings</span>
                    <span className="mindmap-card-step-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>04</span>
                  </div>
                  <p className="mindmap-card-desc">
                    Review evidence dossiers, confirm suspicious threats, and export audit-ready PDF/CSV reports.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Mind Map View */}
          <div className="mindmap-mobile">
            <div className="mindmap-hub-container" style={{ marginBottom: '8px' }}>
              <div className="mindmap-hexagon-wrap" style={{ transform: 'scale(0.85)' }}>
                <svg width="140" height="154" viewBox="0 0 140 154" fill="none">
                  <polygon
                    points="70,5 135,40 135,114 70,149 5,114 5,40"
                    fill="#0c1017"
                    stroke="#ea580c"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  <g transform="translate(42, 48)">
                    <path
                      d="M 28 6 L 48 18 L 48 40 L 28 52 L 8 40 L 8 18 Z"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="3.2"
                    />
                    <circle cx="28" cy="30" r="3" fill="#ffffff" />
                  </g>
                </svg>
              </div>
              <div className="mindmap-hub-badge">
                <div className="mindmap-hub-badge-dot" />
                <span className="mindmap-hub-badge-text">SOC 360 CORE ENGINE</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              width: '100%',
              maxWidth: '420px',
              position: 'relative',
              paddingLeft: '20px',
              borderLeft: '2px dashed #cbd5e1',
            }}>
              {[
                {
                  step: '01',
                  title: 'Register Brand',
                  desc: 'Enter trademark name & official domains to anchor the ground-truth baseline without manual URLs.',
                  icon: <Eye size={20} />,
                  cls: 'mindmap-icon-orange-1',
                  badgeBg: '#ffedd5',
                  badgeColor: '#c2410c',
                },
                {
                  step: '02',
                  title: 'Auto-Scan Vectors',
                  desc: 'Simultaneous automated discovery across social handles (X, Telegram, IG) and mobile app stores.',
                  icon: <Zap size={20} />,
                  cls: 'mindmap-icon-green-1',
                  badgeBg: '#ecfccb',
                  badgeColor: '#4d7c0f',
                },
                {
                  step: '03',
                  title: 'Similarity Analysis',
                  desc: 'Deep algorithmic matching with RapidFuzz lexical analysis and ImageHash perceptual logo comparison.',
                  icon: <Search size={20} />,
                  cls: 'mindmap-icon-green-2',
                  badgeBg: '#dcfce7',
                  badgeColor: '#15803d',
                },
                {
                  step: '04',
                  title: 'Triage Findings',
                  desc: 'Review evidence dossiers, confirm suspicious threats, and export audit-ready PDF/CSV reports.',
                  icon: <ShieldCheck size={20} />,
                  cls: 'mindmap-icon-orange-2',
                  badgeBg: '#fee2e2',
                  badgeColor: '#b91c1c',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="mindmap-card"
                  style={{ width: '100%', maxWidth: '100%' }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '-26px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#0f172a',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 0 1px #cbd5e1',
                    }}
                  />
                  <div className={`mindmap-card-icon-wrap ${item.cls}`} style={{ width: '42px', height: '42px' }}>
                    {item.icon}
                  </div>
                  <div className="mindmap-card-content">
                    <div className="mindmap-card-title">
                      <span>{item.title}</span>
                      <span className="mindmap-card-step-badge" style={{ background: item.badgeBg, color: item.badgeColor }}>
                        {item.step}
                      </span>
                    </div>
                    <p className="mindmap-card-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer & Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '36px 24px',
        textAlign: 'center',
        background: '#ffffff',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto 20px',
          padding: '14px 20px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#64748b',
          lineHeight: '1.6',
        }}>
          <strong>Legal & Technical Disclaimer:</strong> Scan coverage depends strictly on configured data sources. Algorithmic similarity scores represent heuristic review priorities and do not establish definitive legal proof of fraud or malicious intent.
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
          © {new Date().getFullYear()} SOC 360 Digital Risk Protection Platform • Hackathon Edition
        </div>
      </footer>
    </div>
  );
}
