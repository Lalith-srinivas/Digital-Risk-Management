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
  Shield,
} from 'lucide-react';
import XylophoneHelix from '../components/XylophoneHelix';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik+Glitch&display=swap');

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

        .mindmap-heading {
          font-size: 30px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .mindmap-subheading {
          font-size: 15px;
          color: #64748b;
          max-width: 640px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Unified Board Layout for Laptop & Mobile */
        .mindmap-board {
          display: flex;
          align-items: stretch;
          justify-content: center;
          gap: 0px;
          margin-top: 36px;
          width: 100%;
        }

        .mindmap-col {
          width: 320px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 40px;
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

        /* Anchor dots on cards connecting to the lines */
        .mindmap-col-left .mindmap-card::after {
          content: '';
          position: absolute;
          right: -5px;
          top: 50%;
          transform: translateY(-50%);
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #0f172a;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px #94a3b8;
          z-index: 3;
        }

        .mindmap-col-right .mindmap-card::after {
          content: '';
          position: absolute;
          left: -5px;
          top: 50%;
          transform: translateY(-50%);
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #0f172a;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px #94a3b8;
          z-index: 3;
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
          gap: 6px;
        }

        .mindmap-card-step-badge {
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 6px;
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }

        .mindmap-card-desc {
          font-size: 12.5px;
          color: #64748b;
          line-height: 1.5;
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

        .mindmap-hex-svg {
          width: 140px;
          height: 154px;
          display: block;
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
          white-space: nowrap;
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

        /* Tablet Responsive (641px to 960px) */
        @media (max-width: 960px) and (min-width: 641px) {
          .mindmap-col {
            flex: 1;
            max-width: 270px;
            gap: 28px;
          }
          .mindmap-card {
            padding: 12px 14px;
            gap: 12px;
            border-radius: 14px;
          }
          .mindmap-card-icon-wrap {
            width: 38px;
            height: 38px;
          }
          .mindmap-card-title {
            font-size: 13px;
          }
          .mindmap-card-desc {
            font-size: 11px;
            line-height: 1.35;
          }
          .mindmap-center-stage {
            width: 170px;
          }
          .mindmap-svg-connector {
            width: 45px;
            height: 220px;
          }
          .mindmap-hexagon-wrap, .mindmap-hex-svg {
            width: 80px;
            height: 88px;
          }
          .mindmap-radar-ring {
            width: 105px;
            height: 105px;
          }
          .mindmap-hub-badge {
            margin-top: 8px;
            padding: 3px 8px;
          }
          .mindmap-hub-badge-text {
            font-size: 9.5px;
          }
        }

        /* Mobile Responsive (<= 640px): Keeps exact Mind Map layout */
        @media (max-width: 640px) {
          .mindmap-section {
            padding: 36px 8px 32px;
          }
          .mindmap-heading {
            font-size: 20px !important;
            letter-spacing: -0.3px;
            margin-bottom: 6px !important;
          }
          .mindmap-subheading {
            font-size: 12px !important;
            line-height: 1.4 !important;
            margin-bottom: 14px !important;
            padding: 0 8px;
          }
          .mindmap-board {
            margin-top: 12px;
            display: flex;
            align-items: stretch;
            justify-content: space-between;
          }
          .mindmap-col {
            width: auto;
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 12px;
          }
          .mindmap-card {
            padding: 8px 8px;
            border-radius: 11px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
            min-height: 56px;
          }
          .mindmap-card-icon-wrap {
            width: 22px;
            height: 22px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          }
          .mindmap-card-icon-wrap svg {
            width: 12px;
            height: 12px;
          }
          .mindmap-card-title {
            font-size: 10.5px;
            font-weight: 700;
            line-height: 1.15;
            margin-bottom: 2px;
            width: 100%;
          }
          .mindmap-card-step-badge {
            font-size: 8px;
            padding: 1px 4px;
            border-radius: 4px;
          }
          .mindmap-card-desc {
            font-size: 9.5px;
            line-height: 1.4;
            color: #64748b;
            margin: 0;
          }
          .mindmap-col-left .mindmap-card::after {
            width: 5px;
            height: 5px;
            right: -3px;
            border-width: 1px;
          }
          .mindmap-col-right .mindmap-card::after {
            width: 5px;
            height: 5px;
            left: -3px;
            border-width: 1px;
          }
          .mindmap-center-stage {
            width: 76px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          .mindmap-svg-connector {
            width: 16px;
            height: 100% !important;
            display: block;
            flex-shrink: 0;
          }
          .mindmap-hexagon-wrap, .mindmap-hex-svg {
            width: 44px;
            height: 49px;
          }
          .mindmap-radar-ring {
            width: 58px;
            height: 58px;
          }
          .mindmap-hub-badge {
            margin-top: 5px;
            padding: 2px 6px;
            gap: 3.5px;
            border-radius: 6px;
          }
          .mindmap-hub-badge-dot {
            width: 4px;
            height: 4px;
          }
          .mindmap-hub-badge-text {
            font-size: 7px;
            letter-spacing: 0.2px;
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
              fontFamily: "'Rubik Glitch', system-ui, -apple-system, sans-serif",
              fontSize: '54px',
              fontWeight: '400',
              lineHeight: '1.2',
              letterSpacing: '1px',
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

      {/* Primary Feature Bento Grid */}
      <section style={{ background: '#0a0a0f', padding: '80px 24px 90px' }}>
        <style>{`
          .bento-section-label {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(99,102,241,0.12);
            border: 1px solid rgba(129,140,248,0.25);
            color: #818cf8;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            padding: 5px 14px;
            border-radius: 9999px;
            margin-bottom: 20px;
          }
          .bento-grid {
            max-width: 1120px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: auto auto;
            gap: 18px;
          }
          .bento-card {
            border-radius: 20px;
            overflow: hidden;
            position: relative;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }
          .bento-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          }

          /* Card 1 – spans 2 cols, horizontal text+image */
          .bento-card-1 {
            grid-column: 1 / 3;
            grid-row: 1 / 2;
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            border: 1px solid rgba(129,140,248,0.2);
            display: flex;
            flex-direction: row;
            min-height: 320px;
          }

          /* Card 2 – right col top */
          .bento-card-2 {
            grid-column: 3 / 4;
            grid-row: 1 / 2;
            background: linear-gradient(135deg, #1a0a2e 0%, #3d1050 100%);
            border: 1px solid rgba(192,132,252,0.2);
            display: flex;
            flex-direction: column;
            min-height: 320px;
          }

          /* Card 3 – left col bottom */
          .bento-card-3 {
            grid-column: 1 / 2;
            grid-row: 2 / 3;
            background: linear-gradient(135deg, #0d1117 0%, #1a2535 100%);
            border: 1px solid rgba(251,191,36,0.2);
            display: flex;
            flex-direction: column;
            min-height: 300px;
          }

          /* Card 4 – spans 2 cols bottom right, horizontal text+image */
          .bento-card-4 {
            grid-column: 2 / 4;
            grid-row: 2 / 3;
            background: linear-gradient(135deg, #021c12 0%, #042a1c 50%, #062415 100%);
            border: 1px solid rgba(52,211,153,0.2);
            display: flex;
            flex-direction: row-reverse;
            min-height: 300px;
          }

          .bento-text-block {
            padding: 32px 28px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            flex-shrink: 0;
            max-width: 340px;
          }

          .bento-text-block-full {
            padding: 26px 24px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            flex: 1;
          }

          .bento-img-block {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            display: flex;
            align-items: flex-end;
            justify-content: flex-end;
          }

          .bento-img-block img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: top left;
            border-radius: 0 16px 16px 0;
            opacity: 0.92;
            transition: opacity 0.25s ease, transform 0.35s ease;
          }
          .bento-card-4 .bento-img-block img {
            border-radius: 16px 0 0 16px;
            object-position: top right;
          }
          .bento-card:hover .bento-img-block img {
            opacity: 1;
            transform: scale(1.03);
          }

          .bento-step-num {
            font-size: 42px;
            font-weight: 900;
            line-height: 1;
            margin-bottom: 4px;
            font-variant-numeric: tabular-nums;
            opacity: 0.18;
          }
          .bento-cat-tag {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-bottom: 12px;
            opacity: 0.85;
          }
          .bento-title {
            font-size: 20px;
            font-weight: 800;
            line-height: 1.25;
            margin-bottom: 10px;
            color: #f8fafc;
          }
          .bento-desc {
            font-size: 13px;
            line-height: 1.65;
            color: rgba(248,250,252,0.6);
          }

          /* Mobile: single column */
          @media (max-width: 768px) {
            .bento-grid {
              grid-template-columns: 1fr;
              grid-template-rows: auto;
            }
            .bento-card-1, .bento-card-2, .bento-card-3, .bento-card-4 {
              grid-column: 1 / 2;
              grid-row: auto;
              flex-direction: column;
              min-height: unset;
            }
            .bento-text-block {
              max-width: 100%;
            }
            .bento-img-block {
              height: 200px;
            }
            .bento-img-block img {
              border-radius: 0 0 16px 16px !important;
              object-position: top center;
            }
            .bento-card-4 .bento-img-block img {
              border-radius: 0 0 16px 16px !important;
            }
          }
        `}</style>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="bento-section-label">
            <Shield size={12} /> Core Capabilities
          </div>
          <h2 style={{
            fontSize: 'clamp(26px, 4vw, 38px)',
            fontWeight: '800',
            color: '#f8fafc',
            letterSpacing: '-0.5px',
            marginBottom: '12px',
          }}>
            Everything You Need to Protect Your Brand
          </h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '540px', margin: '0 auto', lineHeight: '1.6' }}>
            Four interconnected capabilities that turn raw digital signals into clear, actionable brand intelligence.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid">

          {/* Card 1 – Social Impersonation (2-col wide) */}
          <div className="bento-card bento-card-1">
            <div className="bento-text-block">
              <div className="bento-step-num" style={{ color: '#818cf8' }}>01</div>
              <div className="bento-cat-tag" style={{ color: '#818cf8' }}>DETECT</div>
              <h3 className="bento-title">Social Impersonation Detection</h3>
              <p className="bento-desc">
                Detect rogue handles, typosquats, unicode homoglyphs, and fake VIP profiles across X, Telegram, and Instagram using RapidFuzz lexical matching.
              </p>
            </div>
            <div className="bento-img-block">
              <img src="/social_card.jpg" alt="Social threat monitor dashboard" />
            </div>
          </div>

          {/* Card 2 – App Store (right col top) */}
          <div className="bento-card bento-card-2">
            <div className="bento-text-block-full">
              <div className="bento-step-num" style={{ color: '#c084fc' }}>02</div>
              <div className="bento-cat-tag" style={{ color: '#c084fc' }}>SURVEIL</div>
              <h3 className="bento-title">Application Store Surveillance</h3>
              <p className="bento-desc">
                Uncover deceptive app listings, cloned APKs, publisher mismatches, and repackaged trojans mimicking your brand on mobile marketplaces.
              </p>
            </div>
            <div style={{ padding: '0 16px 20px', flex: 'none' }}>
              <img
                src="/appstore_card.jpg"
                alt="App store surveillance dashboard"
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  height: '140px',
                  opacity: 0.88,
                  transition: 'opacity 0.25s ease, transform 0.35s ease',
                }}
              />
            </div>
          </div>

          {/* Card 3 – Risk Scoring (left col bottom) */}
          <div className="bento-card bento-card-3">
            <div className="bento-text-block-full">
              <div className="bento-step-num" style={{ color: '#fbbf24' }}>03</div>
              <div className="bento-cat-tag" style={{ color: '#fbbf24' }}>ANALYZE</div>
              <h3 className="bento-title">Explainable Risk Scoring</h3>
              <p className="bento-desc">
                Transparent priorities (0–100) based on perceptual ImageHash visual marks, token ratios, and developer verification—no black-box guesswork.
              </p>
            </div>
            <div style={{ padding: '0 16px 20px', flex: 'none' }}>
              <img
                src="/risk_card.jpg"
                alt="Risk scoring analytics dashboard"
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  height: '120px',
                  opacity: 0.88,
                  transition: 'opacity 0.25s ease, transform 0.35s ease',
                }}
              />
            </div>
          </div>

          {/* Card 4 – Reports (2-col wide, flipped) */}
          <div className="bento-card bento-card-4">
            <div className="bento-text-block">
              <div className="bento-step-num" style={{ color: '#34d399' }}>04</div>
              <div className="bento-cat-tag" style={{ color: '#34d399' }}>EXPORT</div>
              <h3 className="bento-title">Downloadable Scan Reports</h3>
              <p className="bento-desc">
                Instantly export audit-ready PDF Threat Dossiers and CSV spreadsheets for takedown requests, brand legal teams, and executive briefings.
              </p>
            </div>
            <div className="bento-img-block">
              <img src="/reports_card.jpg" alt="Brand threat dossier report" />
            </div>
          </div>

        </div>
      </section>

      {/* Monitoring Workflow Steps - Unified Mind Map / Hub-and-Spoke Design */}
      <section className="mindmap-section">
        <div className="mindmap-bg-grid" />
        <div className="mindmap-container">
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 className="mindmap-heading">
              Brand-First Monitoring Workflow
            </h2>
            <p className="mindmap-subheading">
              No manual URL submission required. Register or select your brand, and SOC 360 handles the entire reconnaissance cycle.
            </p>
          </div>

          {/* Unified Board: 2 Left Cards, Center Hexagon, 2 Right Cards */}
          <div className="mindmap-board">
            {/* Left Column (Steps 01 & 02) */}
            <div className="mindmap-col mindmap-col-left">
              {/* Card 01 - Register Brand */}
              <div className="mindmap-card">
                <div className="mindmap-card-icon-wrap mindmap-icon-orange-1">
                  <Eye size={22} className="mindmap-card-icon" />
                </div>
                <div className="mindmap-card-content">
                  <div className="mindmap-card-title">
                    <span>Register Brand</span>
                    <span className="mindmap-card-step-badge" style={{ background: '#ffedd5', color: '#c2410c' }}>01</span>
                  </div>
                  <p className="mindmap-card-desc">
                    Enter trademark name &amp; official domains to anchor the authentic ground-truth baseline without manual URLs.
                  </p>
                </div>
              </div>

              {/* Card 02 - Auto-Scan Vectors */}
              <div className="mindmap-card">
                <div className="mindmap-card-icon-wrap mindmap-icon-green-1">
                  <Zap size={22} className="mindmap-card-icon" />
                </div>
                <div className="mindmap-card-content">
                  <div className="mindmap-card-title">
                    <span>Auto-Scan Vectors</span>
                    <span className="mindmap-card-step-badge" style={{ background: '#ecfccb', color: '#4d7c0f' }}>02</span>
                  </div>
                  <p className="mindmap-card-desc">
                    Simultaneous automated surveillance across social platforms (X, Telegram, IG) and mobile app stores.
                  </p>
                </div>
              </div>
            </div>

            {/* Center Stage with SVG Connectors & Central Hexagon Hub */}
            <div className="mindmap-center-stage">
              {/* Left Connector SVG */}
              <svg className="mindmap-svg-connector" viewBox="0 0 100 280" preserveAspectRatio="none" fill="none">
                <path
                  d="M 0 70 C 45 70, 65 115, 100 115"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                  className="mindmap-path"
                />
                <path
                  d="M 0 210 C 45 210, 65 165, 100 165"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                  className="mindmap-path"
                />
              </svg>

              {/* Central Hexagon Hub */}
              <div className="mindmap-hub-container">
                <div className="mindmap-hexagon-wrap">
                  <div className="mindmap-radar-ring" />
                  <svg className="mindmap-hex-svg" viewBox="0 0 140 154" fill="none">
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

                    <polygon
                      points="70,5 135,40 135,114 70,149 5,114 5,40"
                      fill="url(#hexGrad)"
                      stroke="url(#orangeGlow)"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />

                    <polygon
                      points="70,14 126,45 126,109 70,140 14,109 14,45"
                      fill="none"
                      stroke="rgba(249, 115, 22, 0.35)"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      strokeLinejoin="round"
                    />

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
              <svg className="mindmap-svg-connector" viewBox="0 0 100 280" preserveAspectRatio="none" fill="none">
                <path
                  d="M 0 115 C 35 115, 55 70, 100 70"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                  className="mindmap-path"
                />
                <path
                  d="M 0 165 C 35 165, 55 210, 100 210"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                  className="mindmap-path"
                />
              </svg>
            </div>

            {/* Right Column (Steps 03 & 04) */}
            <div className="mindmap-col mindmap-col-right">
              {/* Card 03 - Similarity Analysis */}
              <div className="mindmap-card">
                <div className="mindmap-card-icon-wrap mindmap-icon-green-2">
                  <Search size={22} className="mindmap-card-icon" />
                </div>
                <div className="mindmap-card-content">
                  <div className="mindmap-card-title">
                    <span>Similarity Analysis</span>
                    <span className="mindmap-card-step-badge" style={{ background: '#dcfce7', color: '#15803d' }}>03</span>
                  </div>
                  <p className="mindmap-card-desc">
                    Deep algorithmic scoring with RapidFuzz lexical analysis and ImageHash perceptual logo comparison.
                  </p>
                </div>
              </div>

              {/* Card 04 - Triage Findings */}
              <div className="mindmap-card">
                <div className="mindmap-card-icon-wrap mindmap-icon-orange-2">
                  <ShieldCheck size={22} className="mindmap-card-icon" />
                </div>
                <div className="mindmap-card-content">
                  <div className="mindmap-card-title">
                    <span>Triage Findings</span>
                    <span className="mindmap-card-step-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>04</span>
                  </div>
                  <p className="mindmap-card-desc">
                    Review explainable evidence dossiers, confirm suspicious threats, and export audit-ready PDF/CSV reports.
                  </p>
                </div>
              </div>
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
