import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Failed to load telemetry',
  message = 'An unexpected error occurred while communicating with the risk engine.',
  onRetry
}) {
  return (
    <div className="state-box">
      <div className="state-icon-circle danger">
        <AlertCircle size={26} />
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-description">{message}</p>
      {onRetry && (
        <button className="btn btn-outline btn-sm" onClick={onRetry}>
          <RotateCcw size={14} />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
}
