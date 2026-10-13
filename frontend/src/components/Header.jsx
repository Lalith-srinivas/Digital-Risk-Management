import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Calendar,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Header({
  title = 'Dashboard',
  subtitle = 'Security Operations Center — Digital Risk Overview',
  onToggleMobile
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Analyst';
  const userInitials = displayName.substring(0, 2).toUpperCase() || 'SA';
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    status: 'checking'
  });

  // Current date formatted cleanly
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  // Check backend connectivity on mount and when window regains focus
  const checkStatus = async () => {
    try {
      const res = await api.checkHealth();
      setConnectionStatus({
        connected: res.connected,
        status: res.status,
        message: res.status === 'healthy' ? 'Backend Live' : 'Demo Mode'
      });
    } catch {
      setConnectionStatus({ connected: false, status: 'offline', message: 'Demo Mode' });
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/findings?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const sampleNotifications = [
    { id: 1, title: 'High-risk clone identified', text: 'Apex Mobile Banking Pro detected on unofficial store.', time: '12m ago', type: 'high' },
    { id: 2, title: 'Social handle spike', text: '3 new handles matching NovaPay keywords registered.', time: '1h ago', type: 'medium' },
    { id: 3, title: 'Scan completed', text: 'Weekly brand surface scan finished with 5 findings.', time: '3h ago', type: 'info' }
  ];

  return (
    <header className="main-header">
      <div className="header-left">
        <button
          className="menu-toggle-btn"
          onClick={onToggleMobile}
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="header-title-group" title={title}>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="header-right">
        {/* Date display */}
        <div className="date-pill">
          <Calendar size={14} style={{ color: 'var(--primary)' }} />
          <span>{todayFormatted}</span>
        </div>

        {/* Backend Connection status indicator */}
        <div
          className={`connection-pill ${connectionStatus.connected ? 'live' : 'demo'}`}
          onClick={() => navigate('/settings')}
          title={connectionStatus.connected ? 'FastAPI Backend Connected' : 'Running with Demo Data Adapter (Click for Settings)'}
        >
          {connectionStatus.connected ? (
            <>
              <Wifi size={13} />
              <span>API Live</span>
            </>
          ) : (
            <>
              <WifiOff size={13} />
              <span>Demo Mode</span>
            </>
          )}
        </div>

        {/* Working Search Form */}
        <form className="header-search" onSubmit={handleSearchSubmit}>
          <Search size={15} />
          <input
            type="text"
            placeholder="Search findings, handles, apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className="header-actions" style={{ position: 'relative' }}>
          {/* Notification Button & Flyout */}
          <button
            className="icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="badge-dot" />
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '48px',
              right: '0',
              width: 'min(320px, calc(100vw - 32px))',
              maxWidth: 'calc(100vw - 32px)',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-color)',
              zIndex: 50,
              padding: '16px',
              animation: 'scaleIn 0.15s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Security Alerts</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sampleNotifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/findings');
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: n.type === 'high' ? '#fef2f2' : '#f8fafc',
                      cursor: 'pointer',
                      border: n.type === 'high' ? '1px solid #fecaca' : '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: n.type === 'high' ? '#b91c1c' : 'var(--text-main)' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{n.time}</span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2 }}>{n.text}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/findings');
                  }}
                >
                  View All Findings
                </button>
              </div>
            </div>
          )}

          {/* Profile Badge */}
          <div
            className="user-profile-badge"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(user ? '/settings' : '/login')}
            title={user ? `${user.email} (Settings)` : 'Guest Analyst (Click to Sign In)'}
          >
            <div className="avatar-placeholder" style={{ background: user ? '#4f46e5' : '#7c3aed' }}>
              <span>{userInitials}</span>
            </div>
            <div className="user-role-text">
              <span className="role-name">{user ? displayName : 'Guest Analyst'}</span>
              <span className="role-title">{user ? 'Verified Account' : 'In-Memory Mode'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
