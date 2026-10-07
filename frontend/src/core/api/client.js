import axios from 'axios';
import { setupCsrfInterceptor, addCsrfHeader } from '../utils/csrf';
import { getApiBaseUrl } from '../utils/apiConfig';

// Timers and every API client share one rotation per identity, never across identities.
const refreshes = new Map();
const session = (scope) => scope === 'staff'
  ? { storage: sessionStorage, key: 'staffAccessToken', endpoint: '/api/v1/staff/refresh-token' }
  : { storage: localStorage, key: 'accessToken', endpoint: '/api/v1/auth/refresh' };

export const refreshSession = (scope) => {
  if (refreshes.has(scope)) return refreshes.get(scope);
  const { storage, key, endpoint } = session(scope);
  const previousToken = storage.getItem(key);
  const promise = (async () => {
    const { data } = await axios.post(`${getApiBaseUrl()}${endpoint}`, {}, {
      withCredentials: true, timeout: 15000, headers: await addCsrfHeader(),
    });
    if (typeof data.accessToken !== 'string' || !data.accessToken) {
      throw new Error('The session refresh did not return an access token.');
    }
    // A logout or a different login while this request was pending wins.
    if (storage.getItem(key) !== previousToken) {
      throw new Error('The session changed while refreshing.');
    }
    storage.setItem(key, data.accessToken);
    return data.accessToken;
  })().finally(() => refreshes.delete(scope));
  refreshes.set(scope, promise);
  return promise;
};

const staffPath = /^\/api\/v1\/(?:staff|reception|profile|superadmin|tables|rooms|bookings|company|seed)(?:\/|$)|^\/api\/v1\/(?:users|hotels)\/admin(?:\/|$)/;
const publicAuthPath = /^\/api\/v1\/auth\/(?:login|register|google-login|sendResetPasswordOtp|verifyResetPasswordOtp|resetPassword|sendSignupOtp|verifySignupOtp|refresh|logout)(?:\/|$)|^\/api\/v1\/staff\/(?:login|refresh-token|logout|forgot-password|reset-password|complete-onboard|verify-invite)(?:\/|$)/;
const requestPath = (config) => {
  const base = `${String(config.baseURL || getApiBaseUrl()).replace(/\/+$/, '')}/`;
  return new URL(String(config.url || '').replace(/^\//, ''), base).pathname;
};
const clearSession = (scope) => {
  if (scope === 'staff') {
    for (const key of ['staffAccessToken', 'staffUser', 'staffUserId', 'staffRole', 'activeProperty']) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
    localStorage.removeItem('restaurant_orders');
  } else {
    for (const key of ['accessToken', 'userId', 'role']) localStorage.removeItem(key);
  }
};

export const createApiClient = ({ authScope, ...options } = {}) => {
  const client = axios.create({
    baseURL: getApiBaseUrl(), withCredentials: true, timeout: 30000,
    headers: { 'Content-Type': 'application/json' }, ...options,
  });
  setupCsrfInterceptor(client);
  client.interceptors.request.use((config) => {
    const supplied = config.headers.Authorization || config.headers.authorization;
    const staffToken = sessionStorage.getItem('staffAccessToken');
    const scope = config._authScope || authScope ||
      (staffPath.test(requestPath(config)) || (staffToken && supplied === `Bearer ${staffToken}`) ? 'staff' : 'guest');
    config._authScope = scope;
    const { storage, key } = session(scope);
    const token = storage.getItem(key);
    if (!supplied && token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use((response) => response, async (error) => {
    const original = error.config;
    if (!original || error.response?.status !== 401 || original._retry || publicAuthPath.test(requestPath(original))) {
      return Promise.reject(error);
    }
    const scope = original._authScope || authScope || 'guest';
    const { storage, key } = session(scope);
    const previousToken = storage.getItem(key);
    if (!previousToken && !(scope === 'guest' && localStorage.getItem('userId'))) return Promise.reject(error);
    original._retry = true;
    try {
      // Another request may already have finished rotating this token.
      const sentToken = original.headers.Authorization || original.headers.authorization;
      const token = previousToken && sentToken && sentToken !== `Bearer ${previousToken}`
        ? previousToken : await refreshSession(scope);
      original.headers.Authorization = `Bearer ${token}`;
      return client(original);
    } catch (refreshError) {
      // A temporary network/server failure must not destroy a valid login.
      if ([401, 403].includes(refreshError.response?.status) && storage.getItem(key) === previousToken) {
        clearSession(scope);
        if (!original.preservePaymentReturn && !window.location.pathname.includes('/login')) {
          window.location.href = scope === 'staff' ? '/staff/login' : '/login';
        }
      }
      return Promise.reject(original.preservePaymentReturn ? error : refreshError);
    }
  });
  return client;
};

export default createApiClient();
