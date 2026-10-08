// Server message first (e.g. "A payout already covers part of this period"),
// then the axios/network message, then the page's fallback text.
export const apiError = (error, fallback) =>
  error?.response?.data?.message ||
  (error?.response ? null : error?.message === 'Network Error' ? 'Network error. Check your connection and try again.' : null) ||
  fallback;
