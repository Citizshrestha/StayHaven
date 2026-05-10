/**
 * Menu Management API Service
 * API calls for hotel admin menu management
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
// Menu Item Operations
// ────────────────────────────────

export const getMenuItems = (params = {}) => api.get('/staff/menu-items', { params });

export const getMenuCategories = () => api.get('/staff/menu-categories');

export const createMenuItem = (data) => api.post('/staff/menu-items', data);

export const updateMenuItem = (itemId, data) => api.put(`/staff/menu-items/${itemId}`, data);

export const deleteMenuItem = (itemId) => api.delete(`/staff/menu-items/${itemId}`);
