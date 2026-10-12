import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({
  icon: Icon,
  iconColor = 'indigo',
  label,
  value,
  subtext,
  trend,
  onClick
}) {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-card-header">
        <div className={`stat-icon-wrap ${iconColor}`}>
          {Icon && <Icon size={20} strokeWidth={2.2} />}
        </div>
        {trend && (
          <div className={`stat-trend ${trend.type || 'positive'}`}>
            {trend.type === 'positive' && <TrendingUp size={12} />}
            {trend.type === 'warning' && <TrendingDown size={12} />}
            {trend.type === 'neutral' && <Minus size={12} />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {subtext && <div className="stat-subtext">{subtext}</div>}
      </div>
    </div>
  );
}
