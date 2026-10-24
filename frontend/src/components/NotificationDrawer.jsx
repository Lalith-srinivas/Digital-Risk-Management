import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  CheckCheck,
  ExternalLink,
  ChevronRight,
  X,
  Filter,
  Layers,
  Sparkles,
  Share2,
  Smartphone
} from 'lucide-react';
import api from '../services/api';
import { formatRelativeTime } from '../utils/formatters';

const DEDUP_STORAGE_KEY = 'soc360_dedup_alerts_registry_v1';

/**
 * High-Risk Alert Notification Center with Deduplication
 * 
 * Round 2 Challenge Brief Requirement:
 * "High-Risk Alerts: Notify analysts when a new high-risk detection appears,
 * without repeating alerts for the same detection."
 */
export default function NotificationDrawer({ isOpen, onClose, onUnreadCountChange }) {
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'critical'

  // Helper to load deduplicated alert registry from localStorage
  const getAlertRegistry = () => {
    try {
      const stored = localStorage.getItem(DEDUP_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // Helper to save deduplicated alert registry
  const saveAlertRegistry = (registry) => {
    try {
      localStorage.setItem(DEDUP_STORAGE_KEY, JSON.stringify(registry));
    } catch (e) {
      console.warn('Could not save alert registry to localStorage:', e);
    }
  };

  // Sync and deduplicate high-risk findings
  const syncHighRiskAlerts = async () => {
    try {
      const res = await api.getFindings({ sortBy: 'riskScore' });
      const allFindings = res.data || [];

      // Filter high-risk and critical items (Score >= 75 or level in High/Critical)
      const highRiskItems = allFindings.filter(f =>
        (f.riskScore >= 75) ||
        (f.riskLevel && ['high', 'critical'].includes(f.riskLevel.toLowerCase()))
      );

      const registry = getAlertRegistry();
      let updatedRegistry = { ...registry };

      const compiledAlerts = highRiskItems.map(item => {
        const id = String(item.id);
        const existing = registry[id];

        if (!existing) {
          // Brand new detection: register it once (deduplicated)
          updatedRegistry[id] = {
            id,
            firstAlertedAt: item.detectionDate || new Date().toISOString(),
            read: false,
            dismissed: false
          };
        }

        const regEntry = updatedRegistry[id] || { read: false, dismissed: false };

        return {
          id,
          findingId: id,
          candidateName: item.candidateName || 'Suspicious Asset',
          candidateHandle: item.candidateHandle || item.packageId || '',
          brandName: item.brandName || item.brandDetails?.name || 'Protected Brand',
          sourceType: item.sourceType || 'social',
          platform: item.platform || (item.sourceType === 'social' ? 'Social Media' : 'App Marketplace'),
          riskScore: item.riskScore || 85,
          riskLevel: item.riskLevel || (item.riskScore >= 85 ? 'Critical' : 'High'),
          avatarUrl: item.avatarUrl,
          evidenceSnippet: item.reasons?.[0] || 'High perceptual similarity detected across brand assets',
          timestamp: updatedRegistry[id]?.firstAlertedAt || item.detectionDate || new Date().toISOString(),
          read: Boolean(regEntry.read),
          dismissed: Boolean(regEntry.dismissed)
        };
      });

      // Persist registry changes
      saveAlertRegistry(updatedRegistry);

      // Filter out dismissed alerts
      const activeAlerts = compiledAlerts.filter(a => !a.dismissed);

      // Sort by unread first, then by risk score descending
      activeAlerts.sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return b.riskScore - a.riskScore;
      });

      setAlerts(activeAlerts);

      // Report unread count to parent Header for badge indicator
      const unreadTotal = activeAlerts.filter(a => !a.read).length;
      if (onUnreadCountChange) {
        onUnreadCountChange(unreadTotal);
      }
    } catch (err) {
      console.error('Failed to sync high-risk alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncHighRiskAlerts();

    // Listen for global findings updates (e.g. after a scan runs)
    const handleFindingsUpdated = () => {
      syncHighRiskAlerts();
    };

    window.addEventListener('soc360:findings_updated', handleFindingsUpdated);
    const interval = setInterval(syncHighRiskAlerts, 20000); // Background poll

    return () => {
      window.removeEventListener('soc360:findings_updated', handleFindingsUpdated);
      clearInterval(interval);
    };
  }, []);

  // Mark single alert as read and navigate
  const handleAlertClick = (alert) => {
    const registry = getAlertRegistry();
    if (registry[alert.id]) {
      registry[alert.id].read = true;
      saveAlertRegistry(registry);
    }

    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a));

    const remainingUnread = alerts.filter(a => a.id !== alert.id && !a.read).length;
    if (onUnreadCountChange) onUnreadCountChange(remainingUnread);

    if (onClose) onClose();
    navigate(`/findings/${alert.findingId}`);
  };

  // Mark all alerts as read
  const handleMarkAllRead = () => {
    const registry = getAlertRegistry();
    alerts.forEach(a => {
      if (registry[a.id]) {
        registry[a.id].read = true;
      } else {
        registry[a.id] = { id: a.id, read: true, dismissed: false, firstAlertedAt: a.timestamp };
      }
    });
    saveAlertRegistry(registry);

    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    if (onUnreadCountChange) onUnreadCountChange(0);
  };

  // Clear / dismiss all alerts
  const handleClearAll = () => {
    const registry = getAlertRegistry();
    alerts.forEach(a => {
      if (registry[a.id]) {
        registry[a.id].dismissed = true;
      }
    });
    saveAlertRegistry(registry);

    setAlerts([]);
    if (onUnreadCountChange) onUnreadCountChange(0);
  };

  // Filtered alert list
  const filteredAlerts = alerts.filter(alert => {
    if (filterType === 'unread') return !alert.read;
    if (filterType === 'critical') return alert.riskScore >= 85 || alert.riskLevel.toLowerCase() === 'critical';
    return true;
  });

  const unreadCount = alerts.filter(a => !a.read).length;

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      style={{
        position: 'absolute',
        top: '52px',
        right: '0',
        width: 'min(420px, calc(100vw - 28px))',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        zIndex: 1000,
        overflow: 'hidden',
        animation: 'scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'min(640px, calc(100vh - 80px))'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            position: 'relative',
            width: 32,
            height: 32,
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f87171'
          }}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                High-Risk Security Alerts
              </h3>
              {unreadCount > 0 && (
                <span style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '1px 7px',
                  borderRadius: 999
                }}>
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
              Deduplicated threat stream (Score ≥ 75)
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex'
          }}
          aria-label="Close Alerts"
        >
          <X size={16} />
        </button>
      </div>

      {/* Filter Tabs & Quick Actions */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        fontSize: '0.76rem'
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontWeight: filterType === 'all' ? 700 : 500,
              backgroundColor: filterType === 'all' ? '#1e293b' : 'transparent',
              color: filterType === 'all' ? '#ffffff' : '#64748b'
            }}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilterType('unread')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontWeight: filterType === 'unread' ? 700 : 500,
              backgroundColor: filterType === 'unread' ? '#1e293b' : 'transparent',
              color: filterType === 'unread' ? '#ffffff' : '#64748b'
            }}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilterType('critical')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontWeight: filterType === 'critical' ? 700 : 500,
              backgroundColor: filterType === 'critical' ? '#dc2626' : 'transparent',
              color: filterType === 'critical' ? '#ffffff' : '#64748b'
            }}
          >
            Critical
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#4f46e5',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title="Mark all alerts as read"
          >
            <CheckCheck size={13} />
            <span>Mark read</span>
          </button>
        )}
      </div>

      {/* Alert Feed List */}
      <div style={{
        overflowY: 'auto',
        maxHeight: '380px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        {loading ? (
          <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
            Scanning threat feed...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px'
            }}>
              <CheckCheck size={20} />
            </div>
            <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#1e293b', fontWeight: 700 }}>
              {filterType === 'unread' ? 'All Alerts Caught Up' : 'No High-Risk Alerts'}
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#64748b' }}>
              No deduplicated threats require immediate analyst triage at this time.
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const isCritical = alert.riskScore >= 85 || alert.riskLevel.toLowerCase() === 'critical';

            return (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                style={{
                  position: 'relative',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: alert.read ? '#ffffff' : (isCritical ? '#fef2f2' : '#fffbeb'),
                  border: alert.read ? '1px solid #e2e8f0' : (isCritical ? '1px solid #fecaca' : '1px solid #fde68a'),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: alert.read ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.04)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.borderColor = isCritical ? '#ef4444' : '#6366f1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = alert.read ? '#e2e8f0' : (isCritical ? '#fecaca' : '#fde68a');
                }}
              >
                {/* Unread indicator dot */}
                {!alert.read && (
                  <span style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: isCritical ? '#ef4444' : '#d97706'
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <img
                    src={alert.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=64'}
                    alt=""
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: alert.sourceType === 'app' ? 8 : '50%',
                      objectFit: 'cover',
                      border: '1px solid #cbd5e1',
                      flexShrink: 0
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '1px 6px',
                        borderRadius: 4,
                        color: isCritical ? '#b91c1c' : '#b45309',
                        backgroundColor: isCritical ? '#fee2e2' : '#fef3c7'
                      }}>
                        {alert.riskScore}/100 {alert.riskLevel}
                      </span>

                      <span style={{
                        fontSize: '0.68rem',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3
                      }}>
                        {alert.sourceType === 'social' ? <Share2 size={10} /> : <Smartphone size={10} />}
                        <span>{alert.platform}</span>
                      </span>
                    </div>

                    <h4 style={{
                      margin: '4px 0 2px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {alert.candidateName}
                    </h4>

                    <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: 4 }}>
                      <span style={{ color: '#64748b' }}>Imitating: </span>
                      <strong style={{ color: '#334155' }}>{alert.brandName}</strong>
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '0.72rem',
                      color: '#64748b',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {alert.evidenceSnippet}
                    </p>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 6,
                      fontSize: '0.68rem',
                      color: '#94a3b8'
                    }}>
                      <span>{formatRelativeTime(alert.timestamp)}</span>
                      <span style={{
                        color: '#4f46e5',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2
                      }}>
                        Investigate <ChevronRight size={11} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer with Deduplication Guarantee and Queue Jump */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={12} style={{ color: '#6366f1' }} />
          <span>Deduplication active (single alert per threat)</span>
        </div>

        <button
          className="btn btn-outline btn-sm"
          style={{ fontSize: '0.74rem', padding: '4px 10px' }}
          onClick={() => {
            if (onClose) onClose();
            navigate('/findings?sortBy=riskScore');
          }}
        >
          View Full Queue
        </button>
      </div>
    </div>
  );
}
