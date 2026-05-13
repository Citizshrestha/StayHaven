/**
 * Guest Dashboard API
 * API functions for authenticated guest portal
 */

import api from '../../../core/services/api';

const BASE_URL = '/api/guest/portal';

/**
 * Get dashboard overview
 */
export const getDashboardOverview = async () => {
  const response = await api.get(`${BASE_URL}/dashboard`);
  return response.data;
};

/**
 * Get user bookings
 */
export const getUserBookings = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/bookings`, { params });
  return response.data;
};

/**
 * Get user orders (room service)
 */
export const getUserOrders = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/orders`, { params });
  return response.data;
};

/**
 * Place a new order
 */
export const placeOrder = async (orderData) => {
  const response = await api.post(`${BASE_URL}/order`, orderData);
  return response.data;
};

/**
 * Get user invoices
 */
export const getUserInvoices = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/invoices`, { params });
  return response.data;
};

/**
 * Pay for an order or invoice
 */
export const payOrder = async (orderId, paymentData) => {
  const response = await api.post(`${BASE_URL}/orders/${orderId}/pay`, paymentData);
  return response.data;
};

/**
 * Get user profile
 */
export const getProfile = async () => {
  const response = await api.get(`${BASE_URL}/profile`);
  return response.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (profileData) => {
  const response = await api.put(`${BASE_URL}/profile`, profileData);
  return response.data;
};

/**
 * Submit a service request
 */
export const submitRequest = async (requestData) => {
  const response = await api.post(`${BASE_URL}/request`, requestData);
  return response.data;
};

/**
 * Get user's service requests
 */
export const getGuestRequests = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/requests`, { params });
  return response.data;
};

/**
 * Get authenticated menu
 */
export const getAuthenticatedMenu = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/menu`, { params });
  return response.data;
};

export default {
  getDashboardOverview,
  getUserBookings,
  getUserOrders,
  placeOrder,
  getUserInvoices,
  payOrder,
  getProfile,
  updateProfile,
  submitRequest,
  getGuestRequests,
  getAuthenticatedMenu,
};
