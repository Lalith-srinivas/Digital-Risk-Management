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
} from 'lucide-react';
import XylophoneHelix from '../components/XylophoneHelix';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(3, 5, 12, 0.85)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
          }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px', color: '#ffffff' }}>SOC 360</span>
            <span style={{ fontSize: '11px', color: '#c7d2fe', fontWeight: '600', marginLeft: '8px', background: 'rgba(99, 102, 241, 0.25)', border: '1px solid rgba(129, 140, 248, 0.3)', padding: '2px 8px', borderRadius: '12px' }}>
              Digital Risk Protection
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 18px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#f8fafc',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/scan')}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Start Monitoring <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* Hero Section with Interactive Xylophone Helix Background */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#03050c',
        minHeight: '620px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
            scale={380}
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
          background: 'radial-gradient(circle at 50% 45%, rgba(3, 5, 12, 0.42) 0%, rgba(3, 5, 12, 0.88) 88%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* Smooth Bottom Fade Transition into White Features Section */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'linear-gradient(to bottom, transparent, #ffffff)',
          pointerEvents: 'none',
          zIndex: 2,
        }} />

        {/* Hero Content Container */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '80px 24px 64px',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
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

          <h1 style={{
            fontSize: '54px',
            fontWeight: '800',
            lineHeight: '1.15',
            letterSpacing: '-1px',
            color: '#ffffff',
            marginBottom: '20px',
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.7)',
          }}>
            Protect Your Brand Across the <br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Digital World
            </span>
          </h1>

          <p style={{
            fontSize: '19px',
            color: '#cbd5e1',
            maxWidth: '720px',
            margin: '0 auto 36px',
            lineHeight: '1.6',
            textShadow: '0 1px 10px rgba(0, 0, 0, 0.6)',
          }}>
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

      {/* Monitoring Workflow Steps */}
      <section style={{
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
        padding: '56px 24px',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
            Brand-First Monitoring Workflow
          </h2>
          <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '600px', margin: '0 auto 40px' }}>
            No manual URL submission required. Register or select your brand, and SOC 360 handles the entire reconnaissance cycle.
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            {[
              { step: '01', title: 'Register Brand', desc: 'Enter trademark name & official domains' },
              { step: '02', title: 'Auto-Scan Vectors', desc: 'Simultaneous social & app discovery' },
              { step: '03', title: 'Similarity Analysis', desc: 'RapidFuzz & ImageHash perceptual scoring' },
              { step: '04', title: 'Triage Findings', desc: 'Review evidence & export audit reports' },
            ].map((st, i) => (
              <div
                key={i}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '20px',
                  width: '210px',
                  textAlign: 'left',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#6366f1', marginBottom: '6px' }}>{st.step}</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>{st.title}</div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{st.desc}</div>
              </div>
            ))}
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
