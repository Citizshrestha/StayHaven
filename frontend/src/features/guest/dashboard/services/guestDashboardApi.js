/**
 * Guest Dashboard API Service
 * Centralized API calls for authenticated guest portal
 * Exports are re-exported from this service for components to import
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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

// ────────────────────────────────
// Menu & Orders
// ────────────────────────────────
export const getMenu = (params = {}) => api.get('/guest/portal/menu', { params });
export const getGuestMenu = getMenu; // alias
export const placeOrder = (data) => api.post('/guest/portal/order', data);
export const getOrders = (params = {}) =>
  api.get('/guest/portal/orders', { params });

// ────────────────────────────────
// Billing & Invoices
// ────────────────────────────────
export const getInvoices = (params = {}) =>
  api.get('/guest/portal/invoices', { params });
export const payForOrder = (orderId, data) =>
  api.post(`/guest/portal/orders/${orderId}/pay`, data);
export const confirmPayment = (paymentIntentId, orderId) =>
  api.post('/guest/portal/payments/confirm', { paymentIntentId, orderId });

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
