import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function EmptyState({
  icon: Icon = ShieldAlert,
  title = 'No findings found',
  description = 'No matching impersonation or suspicious candidates were found matching your criteria.',
  actionLabel,
  onAction
}) {
  return (
    <div className="state-box">
      <div className="state-icon-circle primary">
        <Icon size={26} />
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-description">{description}</p>
      {actionLabel && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
