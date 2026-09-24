import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Client-side pagination control.
 * Props: page (1-based), pageSize, totalItems, onPageChange(nextPage), itemLabel.
 */
export default function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  itemLabel = 'items',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems === 0) return null;

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  // Build a compact page window (max 5 numbers with ellipsis awareness)
  const pages = [];
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let p = start; p <= end; p += 1) pages.push(p);

  return (
    <nav className="ha-pagination" aria-label="Pagination">
      <span className="ha-pagination__info">
        Showing <span className="haNum">{from}</span>–<span className="haNum">{to}</span> of{' '}
        <span className="haNum">{totalItems}</span> {itemLabel}
      </span>
      <div className="ha-pagination__controls">
        <button
          type="button"
          className="ha-pagination__btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        {start > 1 && (
          <>
            <button type="button" className="ha-pagination__btn haNum" onClick={() => onPageChange(1)}>
              1
            </button>
            {start > 2 && <span className="ha-pagination__info" aria-hidden="true">…</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`ha-pagination__btn haNum ${p === page ? 'ha-pagination__btn--active' : ''}`}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="ha-pagination__info" aria-hidden="true">…</span>}
            <button
              type="button"
              className="ha-pagination__btn haNum"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          type="button"
          className="ha-pagination__btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
