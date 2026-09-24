import React from 'react';

/**
 * Filter chips — one consistent implementation replacing the five different
 * per-page pill sets. Each option: { value, label, count? }.
 */
export default function FilterTabs({ options = [], value, onChange, ariaLabel = 'Filter' }) {
  return (
    <div className="ha-filter-tabs" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`ha-filter-chip ${active ? 'ha-filter-chip--active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
            {opt.count != null && (
              <span className="ha-filter-chip__count haNum">{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Segmented control — for view toggles (card/table) and tab switchers.
 * options: { value, label, icon? }
 */
export function Segmented({ options = [], value, onChange, ariaLabel = 'View' }) {
  return (
    <div className="ha-segment" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`ha-segment__btn ${active ? 'ha-segment__btn--active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
