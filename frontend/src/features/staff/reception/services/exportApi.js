/**
 * Export API Service
 * API calls for exporting data to CSV/PDF
 */

import axios from 'axios';
import { setupCsrfInterceptor } from '../../../../utils/csrf';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
  responseType: 'blob', // Important for file downloads
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
// Export Operations
// ────────────────────────────────

export const getExportOptions = () =>
  api.get('/reception/exports/options', { responseType: 'json', params: withHotelParam() });

export const exportBookingsCSV = (params = {}) =>
  api.get('/reception/exports/bookings', { params: withHotelParam(params) });

export const exportInvoicesCSV = (params = {}) =>
  api.get('/reception/exports/invoices', { params: withHotelParam(params) });

export const exportGuestsCSV = (params = {}) =>
  api.get('/reception/exports/guests', { params: withHotelParam(params) });

export const exportRevenueCSV = (params = {}) =>
  api.get('/reception/exports/revenue', { params: withHotelParam(params) });

export const generateInvoicePDF = (invoiceId) =>
  api.get(`/reception/exports/invoices/${invoiceId}/pdf`);

export const generateOccupancyReportPDF = (params = {}) =>
  api.get('/reception/exports/occupancy-report', { params: withHotelParam(params) });

// Helper function to trigger download
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
