/**
 * Guest Dashboard API Service
 * Centralized API calls for authenticated guest portal
 * Exports are re-exported from this service for components to import
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
  const token = localStorage.getItem('guestToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Setup CSRF token interceptor
setupCsrfInterceptor(api);

// ────────────────────────────────
// Dashboard Overview
// ────────────────────────────────
export const getDashboardOverview = () => api.get('/guest/portal/dashboard');
export const getGuestDashboard = getDashboardOverview; // alias

// ────────────────────────────────
// Bookings
// ────────────────────────────────
export const getBookings = (params = {}) =>
  api.get('/guest/portal/bookings', { params });
export const getGuestBookings = getBookings; // alias
export const modifyBooking = (bookingId, data) =>
  api.patch(`/bookings/${bookingId}/modify`, data);
export const cancelBooking = (bookingId, data) =>
  api.post(`/bookings/${bookingId}/cancel`, data);
export const requestRefund = (bookingId, data) =>
  api.post(`/bookings/${bookingId}/refund`, data);

// ────────────────────────────────
// Menu & Orders
// ────────────────────────────────
export const getMenu = (params = {}) => api.get('/guest/portal/menu', { params });
export const getGuestMenu = getMenu; // alias
export const placeOrder = (data) => api.post('/guest/portal/order', data);
export const getOrders = (params = {}) =>
  api.get('/guest/portal/orders', { params });
export const getGuestOrders = getOrders; // alias

// ────────────────────────────────
// Billing & Invoices
// ────────────────────────────────
export const getInvoices = (params = {}) =>
  api.get('/guest/portal/invoices', { params });
export const getGuestInvoices = getInvoices; // alias
export const payForOrder = (orderId, data) =>
  api.post(`/guest/portal/orders/${orderId}/pay`, data);
export const payOrder = payForOrder; // alias
export const confirmPayment = (paymentIntentId, orderId) =>
  api.post('/guest/portal/payments/confirm', { paymentIntentId, orderId });

// ────────────────────────────────
// Requests (Service Requests)
// ────────────────────────────────
export const getRequests = (params = {}) =>
  api.get('/guest/portal/requests', { params });
export const getGuestRequests = getRequests; // alias
export const submitRequest = (data) =>
  api.post('/guest/portal/request', data);

// ────────────────────────────────
// Profile
// ────────────────────────────────
export const getProfile = () => api.get('/guest/portal/profile');
export const getUserProfile = getProfile; // alias
export const updateProfile = (data) =>
  api.put('/guest/portal/profile', data);
export const updateUserProfile = updateProfile; // alias

// Re-export axios for any custom calls
export { api };
export default api;
