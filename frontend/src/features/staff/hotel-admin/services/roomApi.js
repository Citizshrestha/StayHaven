/**
 * Room Management API Service
 * API calls for hotel admin room management
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
// Room CRUD Operations
// ────────────────────────────────

export const getRooms = (params = {}) => api.get('/rooms', { params });

export const getRoomById = (roomId) => api.get(`/rooms/${roomId}`);

export const createRoom = (data) => api.post('/rooms', data);

export const updateRoom = (roomId, data) => api.put(`/rooms/${roomId}`, data);

export const deleteRoom = (roomId) => api.delete(`/rooms/${roomId}`);

// ────────────────────────────────
// QR Code Operations
// ────────────────────────────────

export const generateRoomQR = (roomId, regenerate = false) =>
  api.post(`/rooms/${roomId}/generate-qr`, { regenerate });

export const batchGenerateRoomQR = (hotelId, regenerate = false) =>
  api.post('/rooms/batch-generate-qr', { hotelId, regenerate });

export const toggleRoomQR = (roomId) =>
  api.patch(`/rooms/${roomId}/toggle-qr`);

export const getRoomQRDownload = (roomId) =>
  api.get(`/rooms/${roomId}/qr-download`);

export const getAllRoomQRCodes = (hotelId) =>
  api.get(`/rooms/qr-codes/${hotelId}`);

// ────────────────────────────────
// Room Availability
// ────────────────────────────────

export const getRoomAvailability = (roomId, month) =>
  api.get(`/rooms/${roomId}/availability`, { params: { month } });
