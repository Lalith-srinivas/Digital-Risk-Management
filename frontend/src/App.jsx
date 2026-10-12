import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import BrandProfiles from './pages/BrandProfiles';
import SocialMonitoring from './pages/SocialMonitoring';
import AppMonitoring from './pages/AppMonitoring';
import Findings from './pages/Findings';
import FindingDetails from './pages/FindingDetails';
import Settings from './pages/Settings';

// Metadata mapping for Header
const PAGE_META = {
  '/': {
    title: 'SOC 360 Security Overview',
    subtitle: 'Continuous digital risk analysis and candidate impersonation detection'
  },
  '/brands': {
    title: 'Monitored Brand Profiles',
    subtitle: 'Manage protected corporate assets, official handles, and mobile applications'
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
    title: 'Platform & API Settings',
    subtitle: 'Configure backend connections, detection sensitivity, and system preferences'
  }
};

function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dynamic header meta
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
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/brands" element={<BrandProfiles />} />
              <Route path="/social-monitoring" element={<SocialMonitoring />} />
              <Route path="/app-monitoring" element={<AppMonitoring />} />
              <Route path="/findings" element={<Findings />} />
              <Route path="/findings/:id" element={<FindingDetails />} />
              <Route path="/settings" element={<Settings />} />
              {/* Fallback route */}
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
