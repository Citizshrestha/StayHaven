// The single currency + date helpers for the guest portal.

const toNumber = (value) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** `Rs 12,500.00` — 2 decimals for invoices/cart, 0 for dashboard tiles. */
export const formatMoney = (amount, decimals = 2) =>
  `Rs ${toNumber(amount).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

const toDate = (value) => {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** `24 Sep 2026` (or `—` for missing/invalid input). */
export const formatDate = (value, options) => {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', options || { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** `YYYY-MM-DD` in the viewer's local time (never UTC-shifted like toISOString). */
export const toDateInputValue = (value) => {
  const d = toDate(value);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Parses a `YYYY-MM-DD` input value as local midnight. */
export const fromDateInputValue = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 ? date : null;
};

export const nightsBetween = (checkIn, checkOut) => {
  const a = toDate(checkIn);
  const b = toDate(checkOut);
  if (!a || !b) return 0;
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((end - start) / 86400000));
};

/** Clock time in the viewer's locale, e.g. `2:05 PM`. */
export const formatClock = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
};

const isSameDay = (a, b) => a.toDateString() === b.toDateString();

/** Chat-style day heading: `Today`, `Yesterday`, `Mon, 3 Mar` (year shown only if not this year). */
export const formatDayLabel = (value, now = new Date()) => {
  const d = toDate(value);
  if (!d) return '';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
};

/** Inbox-style timestamp: clock time today, otherwise `3 Mar`. */
export const formatShortStamp = (value, now = new Date()) => {
  const d = toDate(value);
  if (!d) return '';
  return isSameDay(d, now) ? formatClock(d) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** `just now`, `5 min ago`, `3 h ago`, `2 d ago`, then an absolute date. */
export const formatRelative = (value, now = Date.now()) => {
  const d = toDate(value);
  if (!d) return '';
  const diff = Math.max(0, now - d.getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(d);
};

/** Hotel `location` is either a string or `{ city, address }`. */
export const formatLocation = (location) => {
  if (!location) return '';
  if (typeof location === 'string') return location;
  return [location.address, location.city].filter(Boolean).join(', ');
};

/** Unwraps an axios error into a user-facing message. */
export const errorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;
