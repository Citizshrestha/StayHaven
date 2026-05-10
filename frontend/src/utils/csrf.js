/**
 * CSRF Token Management Utility
 * Handles fetching and managing CSRF tokens for secure API requests
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
let csrfToken = null;

/**
 * Fetch CSRF token from the server
 * @returns {Promise<string>} The CSRF token
 */
export const fetchCsrfToken = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/csrf-token`, {
      withCredentials: true, // Important: allows cookies to be sent/received
    });

    if (response.data?.success && response.data?.csrfToken) {
      csrfToken = response.data.csrfToken;
      return csrfToken;
    }

    throw new Error('Failed to fetch CSRF token');
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
};

/**
 * Get the current CSRF token (fetch if not available)
 * @returns {Promise<string>} The CSRF token
 */
export const getCsrfToken = async () => {
  if (!csrfToken) {
    await fetchCsrfToken();
  }
  return csrfToken;
};

/**
 * Clear the cached CSRF token (useful after logout or token expiry)
 */
export const clearCsrfToken = () => {
  csrfToken = null;
};

/**
 * Add CSRF token to request headers
 * @param {Object} headers - Existing headers object
 * @returns {Promise<Object>} Headers with CSRF token added
 */
export const addCsrfHeader = async (headers = {}) => {
  const token = await getCsrfToken();
  return {
    ...headers,
    'X-CSRF-Token': token,
  };
};

/**
 * Axios interceptor to automatically add CSRF token to requests
 * Call this once during app initialization
 */
export const setupCsrfInterceptor = (axiosInstance) => {
  // Request interceptor - add CSRF token to state-changing requests
  axiosInstance.interceptors.request.use(
    async (config) => {
      // Only add CSRF token for state-changing methods
      const methodsRequiringCsrf = ['post', 'put', 'patch', 'delete'];
      if (methodsRequiringCsrf.includes(config.method?.toLowerCase())) {
        try {
          const token = await getCsrfToken();
          config.headers['X-CSRF-Token'] = token;
        } catch (error) {
          console.error('Failed to add CSRF token to request:', error);
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle CSRF token errors
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If CSRF token is invalid/missing and we haven't retried yet
      if (
        error.response?.status === 403 &&
        (error.response?.data?.code === 'CSRF_TOKEN_MISSING' ||
          error.response?.data?.code === 'CSRF_TOKEN_INVALID' ||
          error.response?.data?.code === 'CSRF_TOKEN_NOT_PROVIDED') &&
        !originalRequest._csrfRetry
      ) {
        originalRequest._csrfRetry = true;

        try {
          // Fetch a new CSRF token
          await fetchCsrfToken();
          const token = await getCsrfToken();

          // Update the original request with new token
          originalRequest.headers['X-CSRF-Token'] = token;

          // Retry the request
          return axiosInstance(originalRequest);
        } catch (retryError) {
          console.error('Failed to retry request with new CSRF token:', retryError);
          return Promise.reject(retryError);
        }
      }

      return Promise.reject(error);
    }
  );
};

export default {
  fetchCsrfToken,
  getCsrfToken,
  clearCsrfToken,
  addCsrfHeader,
  setupCsrfInterceptor,
};
