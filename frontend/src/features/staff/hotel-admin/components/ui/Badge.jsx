import React from 'react';
import { toneForStatus } from './statusTone';

/**
 * Status badge — implements the §2.4 mapping.
 * Never colour-only: always renders a leading dot + text label.
 * Pass an explicit `tone`, or a raw `status` string that maps to a tone.
 */
export default function Badge({ tone, status, children, className = '' }) {
  const resolved = tone || toneForStatus(status);
  return (
    <span className={`ha-badge ha-badge--${resolved} ${className}`}>
      <span className="ha-badge__dot" aria-hidden="true" />
      {children ?? status}
    </span>
  );
}
