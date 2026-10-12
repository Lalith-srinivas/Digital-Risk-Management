import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import BrandScan from './pages/BrandScan';
import ScanResults from './pages/ScanResults';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import BrandProfiles from './pages/BrandProfiles';
import SocialMonitoring from './pages/SocialMonitoring';
import AppMonitoring from './pages/AppMonitoring';
import Findings from './pages/Findings';
import FindingDetails from './pages/FindingDetails';
import Settings from './pages/Settings';

// Metadata mapping for Header
const PAGE_META = {
  '/dashboard': {
    title: 'SOC 360 Security Overview',
    subtitle: 'Continuous digital risk analysis and candidate impersonation detection'
  },
  '/brands': {
    title: 'Monitored Brand Profiles',
    subtitle: 'Manage protected corporate assets, official handles, and mobile applications'
  },
  '/scan': {
    title: 'Brand Surveillance Scan',
    subtitle: 'Initiate automated multi-channel brand impersonation discovery'
  },
  '/scan-results': {
    title: 'Threat Surveillance Results',
    subtitle: 'Review detected candidate profiles, similarity scores, and evidence signals'
  },
  '/social-monitoring': {
    title: 'Social Media Impersonation Monitoring',
    subtitle: 'Discover and evaluate deceptive social handles mimicking brand trademarks'
  },
  '/app-monitoring': {
    title: 'Application Marketplace Monitoring',
    subtitle: 'Identify fake mobile applications, trojans, and trademark infringement'
  },
  '/findings': {
    title: 'Security Findings Registry',
    subtitle: 'Review, triage, and escalate detected digital brand impersonation alerts'
  },
  '/settings': {
    title: 'Profile & Account Settings',
    subtitle: 'Manage analyst identity, security credentials, and platform preferences'
  }
};

/**
 * Main Authenticated Platform Layout
 */
function AppLayout({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  let meta = PAGE_META[location.pathname];
  if (!meta) {
    if (location.pathname.startsWith('/findings/')) {
      meta = {
        title: 'Finding Threat Dossier',
        subtitle: 'Comprehensive evidence signals and analyst triage records'
      };
    } else {
      meta = {
        title: 'SOC 360 Security Platform',
        subtitle: 'Digital Risk Protection Operations'
      };
    }
  }

  return (
    <div className="app-shell">
      <div className="app-container">
        {/* Left Sidebar */}
        <Sidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Content Area */}
        <div className="main-wrapper">
          <Header
            title={meta.title}
            subtitle={meta.subtitle}
            onToggleMobile={() => setMobileOpen(prev => !prev)}
          />

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * Root Route Component:
 * Unauthenticated visitors see the public Landing Page.
 * Authenticated users see the security Dashboard.
 */
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading SOC 360...</div>;
  }
  if (!user) {
    return <LandingPage />;
  }
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}

/**
 * Protected Route wrapper:
 * Redirects to /login if unauthenticated.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
}

/**
 * Scan Flow wrapper:
 * Accessible to both Guests and Authenticated users.
 */
function ScanFlowLayout({ children }) {
  const { user } = useAuth();
  if (user) {
    return <AppLayout>{children}</AppLayout>;
  }
  // Guest view: clean standalone layout with floating navbar
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .guest-floating-navbar {
          position: sticky;
          top: 14px;
          margin: 14px auto 10px;
          width: min(1140px, calc(100% - 32px));
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 22px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05), 0 1px 1px rgba(255, 255, 255, 0.8) inset;
          transition: all 0.25s ease;
        }
        @media (max-width: 640px) {
          .guest-floating-navbar {
            top: 10px;
            margin: 10px auto 6px;
            width: calc(100% - 20px);
            padding: 8px 14px;
          }
          .guest-scan-badge {
            display: none !important;
          }
          .guest-nav-btn {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
      <header className="guest-floating-navbar">
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
          }}>
            <ShieldAlert size={18} />
          </div>
          <span style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>SOC 360</span>
          <span className="guest-scan-badge" style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '700', background: '#e0e7ff', border: '1px solid #c7d2fe', padding: '2px 8px', borderRadius: '12px' }}>
            Guest Scan
          </span>
        </a>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a
            href="/login"
            className="guest-nav-btn"
            style={{ fontSize: '13px', fontWeight: '600', color: '#475569', textDecoration: 'none', padding: '7px 16px', borderRadius: 9999, background: 'rgba(241, 245, 249, 0.85)', border: '1px solid #e2e8f0', transition: 'all 0.15s ease' }}
          >
            Sign In
          </a>
          <a
            href="/register"
            className="guest-nav-btn"
            style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', textDecoration: 'none', padding: '7px 18px', borderRadius: 9999, background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)', transition: 'all 0.15s ease' }}
          >
            Create Account
          </a>
        </div>
      </header>
      <main style={{ flex: 1, padding: '16px' }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Root: Landing Page for guests, Dashboard for auth users */}
          <Route path="/" element={<RootRoute />} />

          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Brand Scan & Results (Available to both Guest and Authenticated users) */}
          <Route path="/scan" element={<ScanFlowLayout><BrandScan /></ScanFlowLayout>} />
          <Route path="/scan-results" element={<ScanFlowLayout><ScanResults /></ScanFlowLayout>} />

          {/* Protected Account-Mode Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/brands" element={<ProtectedRoute><BrandProfiles /></ProtectedRoute>} />
          <Route path="/social-monitoring" element={<ProtectedRoute><SocialMonitoring /></ProtectedRoute>} />
          <Route path="/app-monitoring" element={<ProtectedRoute><AppMonitoring /></ProtectedRoute>} />
          <Route path="/findings" element={<ProtectedRoute><Findings /></ProtectedRoute>} />
          <Route path="/findings/:id" element={<ProtectedRoute><FindingDetails /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
