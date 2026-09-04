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
 * @param {Object} params - { period: '7d' | '30d' | '90d' }
 */
export const getDashboardMetrics = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/dashboard/metrics?${queryParams.toString()}`);
  return response.data;
};

/**
 * Get recent bookings for dashboard
 * @param {Object} params - { limit: number }
 */
export const getRecentBookingsForDashboard = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/dashboard/recent-bookings?${queryParams.toString()}`);
  return response.data;
};

/**
 * Get recent platform activity
 * @param {Object} params - { limit: number }
 */
export const getRecentActivity = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/dashboard/activity?${queryParams.toString()}`);
  return response.data;
};

/**
 * Get revenue analytics
 * @param {Object} params - { period: '7d' | '30d' | '90d' }
 */
export const getRevenueAnalytics = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/dashboard/revenue?${queryParams.toString()}`);
  return response.data;
};

/**
 * Get commission breakdown by hotel type
 */
export const getCommissionBreakdown = async () => {
  const response = await apiClient.get('/api/v1/superadmin/dashboard/commission-breakdown');
  return response.data;
};

/**
 * Get pending actions requiring attention
 */
export const getPendingActions = async () => {
  const response = await apiClient.get('/api/v1/superadmin/dashboard/pending-actions');
  return response.data;
};

// NOTE: hotel approve/reject/suspend management is handled by
// core/api/services/hotel.service.js (getAdminHotels/getAdminHotelStats,
// hitting /api/v1/hotels/admin/*), which the real HotelManagement page
// uses. A parallel set of getHotels/approveHotel/etc. functions used to
// live here targeting mock-data-only backend routes with no caller
// anywhere in the app — removed as dead code along with getUsers,
// getRevenue, getSettings/updateSettings (same situation: no caller, and
// their backend routes were mock stubs, now also removed).

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
