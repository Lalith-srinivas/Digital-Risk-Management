import React from 'react';

export default function LoadingState({ message = 'Loading digital threat data...' }) {
  return (
    <div className="state-box">
      <div className="spinner" />
      <div className="state-title">{message}</div>
      <div className="state-description">Querying detection engine and active telemetry records...</div>
    </div>
  );
}
