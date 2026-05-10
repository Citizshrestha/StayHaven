/**
 * Batch Operations API Service
 * API calls for bulk operations on bookings and rooms
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

const withHotelId = (data = {}) => {
  const hotelId = getActiveHotelId();
  return hotelId ? { ...data, hotelId } : data;
};

// ────────────────────────────────
// Bulk Operations
// ────────────────────────────────

export const bulkCheckIn = (data) =>
  api.post('/reception/batch/check-in', data);

export const bulkCheckOut = (data) =>
  api.post('/reception/batch/check-out', data);

export const bulkMarkPayment = (data) =>
  api.post('/reception/batch/payments', data);

export const bulkUpdateStatus = (data) =>
  api.post('/reception/batch/status-update', data);

export const bulkUpdateRoomStatus = (data) =>
  api.post('/reception/batch/room-status', data);

export const getBulkOperationStatus = (operationId) =>
  api.get(`/reception/batch/status?operationId=${operationId}`);
