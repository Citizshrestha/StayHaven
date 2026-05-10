/**
 * Staff Management API Service
 * API calls for hotel admin staff management
 */

import axios from 'axios';
import { setupCsrfInterceptor } from '../../../../utils/csrf';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('staffAccessToken') || localStorage.getItem('staffAccessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Setup CSRF token interceptor
setupCsrfInterceptor(api);

// ────────────────────────────────
// Staff Operations
// ────────────────────────────────

export const getStaffList = (params = {}) => api.get('/reception/staff', { params });

export const inviteStaff = (data) => api.post('/staff/invite', data);

export const updateStaffStatus = (staffId, isActive) =>
  api.patch(`/staff/${staffId}/status`, { isActive });

export const notifyManagerAboutStaff = (staffId, data) =>
  api.post(`/reception/staff/${staffId}/notify-manager`, data);
