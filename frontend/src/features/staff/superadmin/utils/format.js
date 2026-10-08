// Rules G money format: "Rs. 1,234" or "Rs. 1,234.50" (paisa shown only when present).
export const formatRs = (amount) => {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n : 0;
  const hasPaisa = Math.round(value * 100) % 100 !== 0;
  return `Rs. ${value.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaisa ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

// "YYYY-MM-DD" day keys from the API are calendar days, not UTC instants:
// parse them as local dates so they don't shift a day west of UTC.
export const formatDayKey = (dayKey) => {
  if (typeof dayKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return dayKey || '—';
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
};
