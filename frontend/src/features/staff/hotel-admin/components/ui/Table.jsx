import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Table wrapper with sticky header + sortable columns.
 * Usage:
 *   <Table>
 *     <THead>
 *       <SortableTh sortKey="name" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>Name</SortableTh>
 *       <th>Actions</th>
 *     </THead>
 *     <tbody>...</tbody>
 *   </Table>
 */
export default function Table({ children, className = '', minWidth }) {
  return (
    <div className="ha-table-wrap">
      <div className="ha-table-scroll">
        <table className={`ha-table ${className}`} style={minWidth ? { minWidth } : undefined}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function THead({ children }) {
  return <thead><tr>{children}</tr></thead>;
}

export function SortableTh({ sortKey, activeKey, dir, onSort, children, style }) {
  const active = activeKey === sortKey;
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th
      scope="col"
      className="ha-sortable"
      aria-sort={ariaSort}
      onClick={() => onSort(sortKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(sortKey);
        }
      }}
      tabIndex={0}
      style={style}
    >
      {children}
      <span className="ha-sort-ind" aria-hidden="true">
        {!active && <ArrowUpDown size={13} />}
        {active && dir === 'asc' && <ArrowUp size={13} />}
        {active && dir === 'desc' && <ArrowDown size={13} />}
      </span>
    </th>
  );
}
