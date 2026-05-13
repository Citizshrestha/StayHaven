/**
 * Maintenance Management API Service
 * API calls for maintenance scheduling and management
 */

import axios from 'axios';
import { setupCsrfInterceptor } from '../../../../utils/csrf';
import { getApiUrl } from '../../../../utils/apiConfig';

const api = axios.create({
  baseURL: getApiUrl(),
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

// Helper to inject hotelId from localStorage
const getActiveHotelId = () => {
  try {
    const raw = localStorage.getItem("activeProperty");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    return parsed?._id || null;
  } catch {
    return null;
  }
};

const withHotelParam = (params = {}) => {
  const hotelId = getActiveHotelId();
  return hotelId ? { ...params, hotelId } : params;
};

// ────────────────────────────────
// Maintenance Operations
// ────────────────────────────────

export const getMaintenanceSchedules = (params = {}) =>
  api.get('/reception/maintenance', { params: withHotelParam(params) });

export const getMaintenanceCalendar = (params = {}) =>
  api.get('/reception/maintenance/calendar', { params: withHotelParam(params) });

export const getMaintenanceScheduleById = (id) =>
  api.get(`/reception/maintenance/${id}`);

export const getRoomMaintenanceHistory = (roomId) =>
  api.get(`/reception/maintenance/room/${roomId}/history`);

export const createMaintenanceSchedule = (data) =>
  api.post('/reception/maintenance', data);

export const updateMaintenanceSchedule = (id, data) =>
  api.patch(`/reception/maintenance/${id}`, data);

export const startMaintenance = (id) =>
  api.post(`/reception/maintenance/${id}/start`);

export const completeMaintenance = (id, data) =>
  api.post(`/reception/maintenance/${id}/complete`, data);

export const cancelMaintenance = (id, reason) =>
  api.post(`/reception/maintenance/${id}/cancel`, { reason });
