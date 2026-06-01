import apiClient from '../client';

/**
 * Super Admin API Service
 * All endpoints use /api/v1/superadmin prefix
 */

// ═══════════════════════════════════════════
// Dashboard & Analytics
// ═══════════════════════════════════════════

/**
 * Get platform-wide metrics
 */
export const getDashboardMetrics = async () => {
  const response = await apiClient.get('/api/v1/superadmin/dashboard/metrics');
  return response.data;
};

/**
 * Get recent platform activity
 */
export const getRecentActivity = async () => {
  const response = await apiClient.get('/api/v1/superadmin/dashboard/activity');
  return response.data;
};

/**
 * Get top performing hotels
 */
export const getTopHotels = async () => {
  const response = await apiClient.get('/api/v1/superadmin/dashboard/top-hotels');
  return response.data;
};

/**
 * Get pending actions requiring attention
 */
export const getPendingActions = async () => {
  const response = await apiClient.get('/api/v1/superadmin/dashboard/pending-actions');
  return response.data;
};

// ═══════════════════════════════════════════
// Hotels Management
// ═══════════════════════════════════════════

/**
 * Get all hotels with filters
 * @param {Object} filters - { status, type, search, sortBy }
 */
export const getHotels = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.type) params.append('type', filters.type);
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);

  const response = await apiClient.get(`/api/v1/superadmin/hotels?${params.toString()}`);
  return response.data;
};

/**
 * Get hotels pending approval
 */
export const getPendingHotels = async () => {
  const response = await apiClient.get('/api/v1/superadmin/hotels/pending');
  return response.data;
};

/**
 * Get hotel statistics
 */
export const getHotelStats = async () => {
  const response = await apiClient.get('/api/v1/superadmin/hotels/stats');
  return response.data;
};

/**
 * Get detailed hotel information
 * @param {string} hotelId - Hotel ID
 */
export const getHotelDetails = async (hotelId) => {
  const response = await apiClient.get(`/api/v1/superadmin/hotels/${hotelId}`);
  return response.data;
};

/**
 * Approve a pending hotel
 * @param {string} hotelId - Hotel ID
 */
export const approveHotel = async (hotelId) => {
  const response = await apiClient.post(`/api/v1/superadmin/hotels/${hotelId}/approve`);
  return response.data;
};

/**
 * Reject a pending hotel
 * @param {string} hotelId - Hotel ID
 * @param {string} reason - Rejection reason
 */
export const rejectHotel = async (hotelId, reason) => {
  const response = await apiClient.post(`/api/v1/superadmin/hotels/${hotelId}/reject`, { reason });
  return response.data;
};

/**
 * Suspend an active hotel
 * @param {string} hotelId - Hotel ID
 * @param {string} reason - Suspension reason
 */
export const suspendHotel = async (hotelId, reason) => {
  const response = await apiClient.post(`/api/v1/superadmin/hotels/${hotelId}/suspend`, { reason });
  return response.data;
};

// ═══════════════════════════════════════════
// Users Management
// ═══════════════════════════════════════════

/**
 * Get all users with filters
 * @param {Object} filters - { role, status, search }
 */
export const getUsers = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.role) params.append('role', filters.role);
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);

  const response = await apiClient.get(`/api/v1/superadmin/users?${params.toString()}`);
  return response.data;
};

// ═══════════════════════════════════════════
// Bookings Management
// ═══════════════════════════════════════════

/**
 * Get all bookings with filters
 * @param {Object} filters - { status, hotel, dateFrom, dateTo }
 */
export const getBookings = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.hotel) params.append('hotel', filters.hotel);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await apiClient.get(`/api/v1/superadmin/bookings?${params.toString()}`);
  return response.data;
};

// ═══════════════════════════════════════════
// Revenue & Finance
// ═══════════════════════════════════════════

/**
 * Get revenue analytics
 * @param {string} period - Time period (7d, 30d, 90d, etc.)
 */
export const getRevenue = async (period = '7d') => {
  const response = await apiClient.get(`/api/v1/superadmin/revenue?period=${period}`);
  return response.data;
};

// ═══════════════════════════════════════════
// Reviews Management
// ═══════════════════════════════════════════

/**
 * Get all reviews with moderation status
 * @param {Object} filters - { status, hotel }
 */
export const getReviews = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.hotel) params.append('hotel', filters.hotel);

  const response = await apiClient.get(`/api/v1/superadmin/reviews?${params.toString()}`);
  return response.data;
};

// ═══════════════════════════════════════════
// System Settings
// ═══════════════════════════════════════════

/**
 * Get system settings
 */
export const getSettings = async () => {
  const response = await apiClient.get('/api/v1/superadmin/settings');
  return response.data;
};

/**
 * Update system settings
 * @param {Object} settings - Settings object
 */
export const updateSettings = async (settings) => {
  const response = await apiClient.put('/api/v1/superadmin/settings', settings);
  return response.data;
};
