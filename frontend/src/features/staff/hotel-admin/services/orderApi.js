/**
 * Order Management API Service
 * API calls for hotel admin order management
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
// Order Operations
// ────────────────────────────────

export const getOrders = (params = {}) => api.get('/staff/orders', { params });

export const getOrderById = (orderId) => api.get(`/staff/orders/${orderId}`);

export const createOrder = (data) => api.post('/staff/orders', data);

export const updateOrderStatus = (orderId, status) =>
  api.put(`/staff/orders/${orderId}/status`, { status });

export const cancelOrder = (orderId, reason) =>
  api.post(`/staff/orders/${orderId}/cancel`, { reason });
