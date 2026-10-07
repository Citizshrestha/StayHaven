/**
 * Staff Management API Service
 * API calls for hotel admin staff management
 */

import { createApiClient } from '../../../../core/api/client';
import { getApiUrl } from '../../../../core/utils/apiConfig';

const api = createApiClient({ baseURL: getApiUrl(), authScope: 'staff' });

// ────────────────────────────────
// Staff Operations
// ────────────────────────────────

export const getStaffList = (propertyId) => api.get(`/staff/manage/${encodeURIComponent(propertyId)}`);

export const inviteStaff = (data) => api.post('/staff/invite', data);
export const resendStaffInvite = (staffId) => api.post(`/staff/resend-invite/${encodeURIComponent(staffId)}`);

export const updateStaffStatus = (propertyId, staffId, isActive) =>
  api.patch(`/staff/manage/${encodeURIComponent(propertyId)}/${encodeURIComponent(staffId)}/status`, { isActive });

export const editStaff = (propertyId, staffId, data) =>
  api.patch(`/staff/manage/${encodeURIComponent(propertyId)}/${encodeURIComponent(staffId)}`, data);

export const removeStaff = (propertyId, staffId) =>
  api.delete(`/staff/manage/${encodeURIComponent(propertyId)}/${encodeURIComponent(staffId)}`);

export const notifyManagerAboutStaff = (staffId, data) =>
  api.post(`/reception/staff/${staffId}/notify-manager`, data);
