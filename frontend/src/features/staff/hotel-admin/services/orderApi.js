/**
 * Order Management API Service
 * API calls for hotel admin order management
 */

import { createApiClient } from '../../../../core/api/client';
import { getApiUrl } from '../../../../core/utils/apiConfig';

const api = createApiClient({ baseURL: getApiUrl(), authScope: 'staff' });

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
