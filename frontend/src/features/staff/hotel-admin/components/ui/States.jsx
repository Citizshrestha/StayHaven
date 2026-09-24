import React from 'react';
import { Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState — for zero data or zero filter results.
 * Pass `action` (a node) for a primary CTA.
 */
export function EmptyState({
  icon,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) {
  return (
    <div className={`ha-empty ${className}`}>
      <span className="ha-empty__icon" aria-hidden="true">
        {icon || <Inbox size={26} />}
      </span>
      <p className="ha-empty__title">{title}</p>
      {description && <p className="ha-empty__desc">{description}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

/**
 * ErrorState — retry-capable fetch failure state.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this data. Please try again.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`ha-empty ${className}`}>
      <span
        className="ha-empty__icon"
        style={{ color: 'var(--ha-danger)', background: 'var(--ha-danger-bg)' }}
        aria-hidden="true"
      >
        <AlertTriangle size={26} />
      </span>
      <p className="ha-empty__title">{title}</p>
      {description && <p className="ha-empty__desc">{description}</p>}
      {onRetry && (
        <div style={{ marginTop: 8 }}>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw size={15} aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

/** Simple skeleton block. */
export function Skeleton({ width = '100%', height = 16, radius, style, className = '' }) {
  return (
    <span
      className={`ha-skel ${className}`}
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

/** KPI-tile skeleton matching StatCard footprint. */
export function StatCardSkeleton() {
  return (
    <div className="ha-statcard" aria-hidden="true">
      <div className="ha-statcard__top">
        <Skeleton width={44} height={44} radius="var(--ha-radius-md)" />
        <Skeleton width={48} height={22} radius="var(--ha-radius-pill)" />
      </div>
      <Skeleton width={90} height={30} style={{ marginBottom: 8 }} />
      <Skeleton width={120} height={14} />
    </div>
  );
}

/** Table body skeleton — rows of shimmer cells. */
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <Skeleton width={c === 0 ? '60%' : '80%'} height={14} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
