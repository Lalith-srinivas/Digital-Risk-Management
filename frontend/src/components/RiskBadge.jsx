import React from 'react';

/**
 * Standard Risk Badge for findings and profiles
 */
export default function RiskBadge({ level, score, showScore = false, className = '' }) {
  let displayLevel = level;
  if (!displayLevel && typeof score === 'number') {
    if (score >= 75) displayLevel = 'High';
    else if (score >= 45) displayLevel = 'Medium';
    else displayLevel = 'Low';
  }

  const normalized = (displayLevel || 'Needs Review').toLowerCase().replace(/\s+/g, '-');

  return (
    <span className={`risk-badge ${normalized} ${className}`}>
      <span className="badge-dot" />
      <span>{displayLevel}</span>
      {showScore && typeof score === 'number' && (
        <span style={{ opacity: 0.85, fontWeight: 600 }}>({score})</span>
      )}
    </span>
  );
}
