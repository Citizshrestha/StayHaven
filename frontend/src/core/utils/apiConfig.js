/**
 * Normalize API base URL by removing trailing slashes
 * This prevents double slashes when concatenating with endpoint paths
 *
 * @param {string} url - The base URL to normalize
 * @returns {string} - URL without trailing slash
 */
export const normalizeBaseUrl = (url) => {
  if (!url) return '';
  return url.replace(/\/+$/, ''); // Remove one or more trailing slashes
};

/**
 * Get the normalized API base URL from environment variables
 * Falls back to localhost if not set
 */
export const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  return normalizeBaseUrl(baseUrl);
};

/**
 * Get the normalized full API URL (with /api/v1) from environment variables
 * Falls back to localhost if not set
 */
export const getApiUrl = () => {
  // Check if VITE_API_URL is set, otherwise construct from base URL
  const apiUrl = import.meta.env.VITE_API_URL || `${getApiBaseUrl()}/api/v1`;
  return normalizeBaseUrl(apiUrl);
};

/**
 * Get the normalized Socket URL from environment variables
 * Falls back to localhost if not set
 */
export const getSocketUrl = () => {
  const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  return normalizeBaseUrl(socketUrl);
};
