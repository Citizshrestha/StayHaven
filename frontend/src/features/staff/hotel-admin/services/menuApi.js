/**
 * Menu Management API Service
 * API calls for hotel admin menu management
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
  const token = sessionStorage.getItem('staffAccessToken');
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

// When data.imageFile is set, sends multipart form-data so the backend can
// upload the image to Cloudinary; otherwise sends plain JSON.
const toMenuPayload = (data) => {
  const { imageFile, ...rest } = data;
  if (!imageFile) return { body: rest, config: {} };

  const form = new FormData();
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  form.append('image', imageFile);
  return { body: form, config: { headers: { 'Content-Type': 'multipart/form-data' } } };
};

export const createMenuItem = (data) => {
  const { body, config } = toMenuPayload(data);
  return api.post('/staff/menu-items', body, config);
};

export const updateMenuItem = (itemId, data) => {
  const { body, config } = toMenuPayload(data);
  return api.put(`/staff/menu-items/${itemId}`, body, config);
};

export const deleteMenuItem = (itemId) => api.delete(`/staff/menu-items/${itemId}`);

export const bulkToggleAvailability = (data) => api.put('/staff/menu-items/bulk-toggle', data);

export const reorderMenuItems = (data) => api.put('/staff/menu-items/reorder', data);
