/**
 * Table Management API Service
 * API calls for hotel admin table management
 */

import { createApiClient } from '../../../../core/api/client';
import { getApiUrl } from '../../../../core/utils/apiConfig';

const api = createApiClient({ baseURL: getApiUrl(), authScope: 'staff' });

// ────────────────────────────────
// Table CRUD Operations
// ────────────────────────────────

export const getTables = (params = {}) => api.get('/tables', { params });

export const getTableById = (tableId) => api.get(`/tables/${tableId}`);

export const createTable = (data) => api.post('/tables', data);

export const updateTable = (tableId, data) => api.put(`/tables/${tableId}`, data);

export const deleteTable = (tableId) => api.delete(`/tables/${tableId}`);

export const batchCreateTables = (data) => api.post('/tables/batch', data);

// ────────────────────────────────
// Table Status Operations
// ────────────────────────────────

export const updateTableStatus = (tableId, status) =>
  api.patch(`/tables/${tableId}/status`, { status });

// ────────────────────────────────
// QR Code Operations
// ────────────────────────────────

export const generateTableQR = (tableId, regenerate = false) =>
  api.post(`/tables/${tableId}/generate-qr`, { regenerate });

export const getTableQRDownload = (tableId) =>
  api.get(`/tables/${tableId}/qr-download`);
