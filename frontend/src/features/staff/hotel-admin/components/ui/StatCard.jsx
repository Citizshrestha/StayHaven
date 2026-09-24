import React from 'react';

/**
 * KPI tile. Icon + label + tabular value, optional trend pill.
 * `iconBg` accepts any CSS colour/gradient string (defaults to primary).
 */
export default function StatCard({
  icon,
  label,
  value,
  trend,
  trendTone = 'up', // 'up' | 'flat' | 'warn'
  iconBg,
  onClick,
  className = '',
}) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      className={`ha-statcard ${clickable ? 'ha-statcard--clickable' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="ha-statcard__top">
        <span
          className="ha-statcard__icon"
          style={{ background: iconBg || 'var(--ha-primary)' }}
          aria-hidden="true"
        >
          {icon}
        </span>
        {trend != null && (
          <span className={`ha-statcard__trend ha-statcard__trend--${trendTone}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="ha-statcard__value haNum">{value}</div>
      <span className="ha-statcard__label">{label}</span>
    </div>
  );
}
