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

import NotificationDrawer from './NotificationDrawer';

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
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
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
          {/* Notification Button & Flyout with Deduplicated Alerts */}
          <button
            className="icon-btn"
            style={{ position: 'relative' }}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="High-Risk Alerts"
            title={unreadAlertsCount > 0 ? `${unreadAlertsCount} unread high-risk alerts` : 'High-Risk Alerts'}
          >
            <Bell size={18} />
            {unreadAlertsCount > 0 ? (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 800,
                minWidth: '16px',
                height: '16px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                boxShadow: '0 0 0 2px #ffffff',
                lineHeight: 1
              }}>
                {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
              </span>
            ) : (
              <span className="badge-dot" style={{ opacity: 0.3 }} />
            )}
          </button>

          <NotificationDrawer
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            onUnreadCountChange={setUnreadAlertsCount}
          />

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
