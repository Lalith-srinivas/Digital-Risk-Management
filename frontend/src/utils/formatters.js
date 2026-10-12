/**
 * SOC 360 - Utility Formatters and Helpers
 */

export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(isoString);
  } catch {
    return isoString;
  }
}

export function getRiskLevelFromScore(score) {
  if (typeof score !== 'number') return 'Needs Review';
  if (score >= 75) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}

export function getRiskColors(levelOrScore) {
  let level = typeof levelOrScore === 'number' ? getRiskLevelFromScore(levelOrScore) : levelOrScore;
  level = (level || '').toLowerCase();

  switch (level) {
    case 'high':
      return {
        text: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
        badgeBg: 'rgba(239, 68, 68, 0.12)',
        badgeText: '#b91c1c',
        dot: '#ef4444'
      };
    case 'medium':
      return {
        text: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        badgeText: '#b45309',
        dot: '#f59e0b'
      };
    case 'low':
      return {
        text: '#059669',
        bg: '#ecfdf5',
        border: '#a7f3d0',
        badgeBg: 'rgba(16, 185, 129, 0.12)',
        badgeText: '#047857',
        dot: '#10b981'
      };
    case 'needs review':
    case 'review':
    default:
      return {
        text: '#6366f1',
        bg: '#eef2ff',
        border: '#c7d2fe',
        badgeBg: 'rgba(99, 102, 241, 0.12)',
        badgeText: '#4f46e5',
        dot: '#6366f1'
      };
  }
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}
