import { useMemo, useState, useEffect } from 'react';

/**
 * Combined client-side sort + pagination for list pages.
 *
 * @param {Array} items      the fully-fetched, already-filtered array
 * @param {object} opts
 * @param {number} opts.pageSize          items per page (default 10)
 * @param {string} opts.initialSortKey    default sort column
 * @param {'asc'|'desc'} opts.initialSortDir
 * @param {Record<string,(a:any)=>any>} opts.accessors  optional value accessors per sort key
 */
export default function useTableControls(items, opts = {}) {
  const {
    pageSize = 10,
    initialSortKey = null,
    initialSortDir = 'asc',
    accessors = {},
  } = opts;

  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState(initialSortDir);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    const accessor = accessors[sortKey] || ((row) => row?.[sortKey]);
    const copy = [...items];
    copy.sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      let cmp;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [items, sortKey, sortDir, accessors]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Keep page in range when the underlying list shrinks (filtering, deletes).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  return {
    paged,
    page,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    sortKey,
    sortDir,
    toggleSort,
  };
}
