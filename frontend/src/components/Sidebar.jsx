import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Share2,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Settings,
  Radar,
  Radio
} from 'lucide-react';

export default function Sidebar({ mobileOpen, onCloseMobile, openFindingsCount = 4 }) {
  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard }
      ]
    },
    {
      title: 'MONITORING',
      items: [
        { label: 'Social Monitoring', path: '/social-monitoring', icon: Share2 },
        { label: 'App Monitoring', path: '/app-monitoring', icon: Smartphone }
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { label: 'Brand Profiles', path: '/brands', icon: ShieldCheck },
        { label: 'Findings', path: '/findings', icon: AlertTriangle, badge: openFindingsCount }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Settings', path: '/settings', icon: Settings }
      ]
    }
  ];

  return (
    <>
      <div
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={onCloseMobile}
      />

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div>
          {/* Logo Brand Header */}
          <div className="sidebar-brand">
            <div className="brand-icon-wrapper">
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} strokeWidth={2.4} />
                <Radar
                  size={12}
                  strokeWidth={2.6}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#ffffff'
                  }}
                />
              </div>
            </div>

            <div className="brand-title-group">
              <h1>SOC 360</h1>
              <span>Digital Risk Protection</span>
            </div>
          </div>

          {/* Grouped Nav Items */}
          <nav className="sidebar-nav">
            {navGroups.map((group) => (
              <div key={group.title} className="nav-group">
                <div className="nav-group-title">{group.title}</div>
                <ul className="nav-group-list">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.path === '/'}
                          className={({ isActive }) =>
                            `nav-link-item ${isActive ? 'active' : ''}`
                          }
                          onClick={onCloseMobile}
                        >
                          <Icon size={18} />
                          <span>{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="nav-item-badge">{item.badge}</span>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Informational Card (Matching Reference Dashboard) */}
        <div className="sidebar-promo-card">
          <div className="promo-icon-badge">
            <Radio size={16} />
          </div>
          <h4 className="promo-title">Stay Ahead of Digital Threats</h4>
          <p className="promo-desc">
            Monitor suspicious profiles and applications from one place.
          </p>
          <div className="promo-tag">
            <span className="pulse-dot" />
            <span>Active Defense Engine</span>
          </div>
        </div>
      </aside>
    </>
  );
}
