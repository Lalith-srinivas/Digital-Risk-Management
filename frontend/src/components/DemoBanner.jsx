import React from 'react';
import { Info, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DemoBanner({ isDemo }) {
  if (!isDemo) return null;

  return (
    <div className="demo-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Info size={16} />
        <span>
          <strong>DEMO DATA MODE:</strong> Backend is offline or unconfigured. Demonstration dataset active. Fabricated findings are not live surveillance detections.
        </span>
      </div>
      <Link
        to="/settings"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#78350f',
          textDecoration: 'underline'
        }}
      >
        <Settings size={12} />
        <span>Configure API</span>
      </Link>
    </div>
  );
}
