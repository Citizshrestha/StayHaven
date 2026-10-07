// Shared helpers for user-supplied search/paging query parameters.

/** Escapes every RegExp metacharacter so user text is matched literally. */
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Case-insensitive literal "contains" regex for a search box, or null when the
 * input is empty / not a string. Long input is truncated (default 100 chars).
 */
export const searchRegex = (value, maxLength = 100) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed ? new RegExp(escapeRegex(trimmed), 'i') : null;
};

/** Parses page/limit query values, falling back to defaults on NaN, <1 or arrays. */
export const parsePaging = ({ page, limit } = {}, { defaultLimit = 50, maxLimit = 200 } = {}) => {
  const p = Number.parseInt(typeof page === 'string' || typeof page === 'number' ? page : '', 10);
  const l = Number.parseInt(typeof limit === 'string' || typeof limit === 'number' ? limit : '', 10);
  const safePage = Number.isFinite(p) && p >= 1 ? p : 1;
  const safeLimit = Math.min(Number.isFinite(l) && l >= 1 ? l : defaultLimit, maxLimit);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};
