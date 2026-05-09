import axiosClient from '../axiosClient';
import { createLogger } from '../core/utils/logger.js';

const logger = createLogger('QRService');

// =====================================================
// GUEST PUBLIC API (No Authentication Required)
// These endpoints are accessed after QR code scanning
// =====================================================

/**
 * Validate table QR token and get table/hotel info
 * @param {string} token - The table's unique token (TBL-XXXXX)
 */
export const validateTableToken = async (token) => {
  try {
    const response = await axiosClient.get(`/api/v1/guest/table/${token}`);
    return response.data;
  } catch (error) {
    console.error('Error validating table token:', error);
    throw error.response?.data || error;
  }
};

/**
 * Validate room QR token and get room/hotel info
 * @param {string} token - The room's unique token (RM-XXXXX)
 */
export const validateRoomToken = async (token) => {
  try {
    const response = await axiosClient.get(`/api/v1/guest/room/${token}`);
    return response.data;
  } catch (error) {
    console.error('Error validating room token:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get menu for a hotel (accessed after QR scan)
 * @param {string} hotelId - The hotel ID
 * @param {string} category - Optional category filter
 */
export const getGuestMenu = async (hotelId, category = null) => {
  try {
    const url = category
      ? `/api/v1/guest/menu/${hotelId}?category=${category}`
      : `/api/v1/guest/menu/${hotelId}`;
    const response = await axiosClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching guest menu:', error);
    throw error.response?.data || error;
  }
};

/**
 * Place an order as a guest (via QR scan)
 * @param {object} orderData - Order details
 */
export const createGuestOrder = async (orderData) => {
  try {
    const response = await axiosClient.post('/api/v1/guest/order', orderData);
    return response.data;
  } catch (error) {
    console.error('Error creating guest order:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get order status (for guests to track their order)
 * @param {string} orderId - The order ID
 */
export const getGuestOrderStatus = async (orderId) => {
  try {
    const response = await axiosClient.get(`/api/v1/guest/order/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching order status:', error);
    throw error.response?.data || error;
  }
};

/**
 * Call waiter (via QR scan)
 * @param {object} data - { tableToken, hotelId, reason }
 */
export const callWaiter = async (data) => {
  try {
    const response = await axiosClient.post('/api/v1/guest/call-waiter', data);
    return response.data;
  } catch (error) {
    console.error('Error calling waiter:', error);
    throw error.response?.data || error;
  }
};

/**
 * Request bill (via QR scan)
 * @param {object} data - { tableToken, hotelId }
 */
export const requestBill = async (data) => {
  try {
    const response = await axiosClient.post('/api/v1/guest/request-bill', data);
    return response.data;
  } catch (error) {
    console.error('Error requesting bill:', error);
    throw error.response?.data || error;
  }
};

// =====================================================
// TABLE MANAGEMENT API (Authentication Required)
// These endpoints are for hotel admins/managers
// =====================================================

/**
 * Create a new table
 * @param {object} tableData - Table details
 */
export const createTable = async (tableData) => {
  try {
    const response = await axiosClient.post('/api/v1/tables', tableData);
    return response.data;
  } catch (error) {
    console.error('Error creating table:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get all tables for a hotel
 * @param {object} filters - Optional filters (status, location, isActive)
 */
export const getTables = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const url = queryParams ? `/api/v1/tables?${queryParams}` : '/api/v1/tables';
    const response = await axiosClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get a single table by ID
 * @param {string} tableId - The table ID
 */
export const getTableById = async (tableId) => {
  try {
    const response = await axiosClient.get(`/api/v1/tables/${tableId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching table:', error);
    throw error.response?.data || error;
  }
};

/**
 * Update a table
 * @param {string} tableId - The table ID
 * @param {object} tableData - Updated table data
 */
export const updateTable = async (tableId, tableData) => {
  try {
    const response = await axiosClient.put(`/api/v1/tables/${tableId}`, tableData);
    return response.data;
  } catch (error) {
    console.error('Error updating table:', error);
    throw error.response?.data || error;
  }
};

/**
 * Delete a table
 * @param {string} tableId - The table ID
 */
export const deleteTable = async (tableId) => {
  try {
    const response = await axiosClient.delete(`/api/v1/tables/${tableId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting table:', error);
    throw error.response?.data || error;
  }
};

/**
 * Batch create tables
 * @param {object} data - { hotelId, startNumber, endNumber, prefix, capacity, location }
 */
export const batchCreateTables = async (data) => {
  try {
    const response = await axiosClient.post('/api/v1/tables/batch', data);
    return response.data;
  } catch (error) {
    console.error('Error batch creating tables:', error);
    throw error.response?.data || error;
  }
};

/**
 * Generate/Regenerate QR code for a table
 * @param {string} tableId - The table ID
 * @param {boolean} regenerate - Whether to regenerate token (invalidates old QR)
 */
export const generateTableQR = async (tableId, regenerate = false) => {
  try {
    const response = await axiosClient.post(`/api/v1/tables/${tableId}/generate-qr`, { regenerate });
    return response.data;
  } catch (error) {
    console.error('Error generating table QR:', error);
    throw error.response?.data || error;
  }
};

/**
 * Update table status
 * @param {string} tableId - The table ID
 * @param {string} status - New status (available, occupied, reserved, maintenance)
 */
export const updateTableStatus = async (tableId, status) => {
  try {
    const response = await axiosClient.patch(`/api/v1/tables/${tableId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating table status:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get QR code download data for a table
 * @param {string} tableId - The table ID
 */
export const getTableQRDownload = async (tableId) => {
  try {
    const response = await axiosClient.get(`/api/v1/tables/${tableId}/qr-download`);
    return response.data;
  } catch (error) {
    console.error('Error getting table QR download:', error);
    throw error.response?.data || error;
  }
};

// =====================================================
// ROOM QR MANAGEMENT API (Authentication Required)
// =====================================================

/**
 * Get all rooms for a hotel
 * @param {string} hotelId - The hotel ID
 * @param {object} filters - Optional filters
 */
export const getRooms = async (hotelId, filters = {}) => {
  try {
    const queryParams = new URLSearchParams({ hotelId, ...filters }).toString();
    const response = await axiosClient.get(`/api/v1/rooms?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    throw error.response?.data || error;
  }
};

/**
 * Generate QR code for a room
 * @param {string} roomId - The room ID
 * @param {boolean} regenerate - Whether to regenerate token
 */
export const generateRoomQR = async (roomId, regenerate = false) => {
  try {
    const response = await axiosClient.post(`/api/v1/rooms/${roomId}/generate-qr`, { regenerate });
    return response.data;
  } catch (error) {
    console.error('Error generating room QR:', error);
    throw error.response?.data || error;
  }
};

/**
 * Batch generate QR codes for all rooms in a hotel
 * @param {string} hotelId - The hotel ID
 * @param {boolean} regenerate - Whether to regenerate tokens
 */
export const batchGenerateRoomQR = async (hotelId, regenerate = false) => {
  try {
    const response = await axiosClient.post('/api/v1/rooms/batch-generate-qr', { hotelId, regenerate });
    return response.data;
  } catch (error) {
    console.error('Error batch generating room QR:', error);
    throw error.response?.data || error;
  }
};

/**
 * Toggle room QR active status
 * @param {string} roomId - The room ID
 */
export const toggleRoomQR = async (roomId) => {
  try {
    const response = await axiosClient.patch(`/api/v1/rooms/${roomId}/toggle-qr`);
    return response.data;
  } catch (error) {
    console.error('Error toggling room QR:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get QR code download data for a room
 * @param {string} roomId - The room ID
 */
export const getRoomQRDownload = async (roomId) => {
  try {
    const response = await axiosClient.get(`/api/v1/rooms/${roomId}/qr-download`);
    return response.data;
  } catch (error) {
    console.error('Error getting room QR download:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get all room QR codes for a hotel (for bulk download)
 * @param {string} hotelId - The hotel ID
 */
export const getAllRoomQRCodes = async (hotelId) => {
  try {
    const response = await axiosClient.get(`/api/v1/rooms/qr-codes/${hotelId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting all room QR codes:', error);
    throw error.response?.data || error;
  }
};

export default {
  // Guest APIs
  validateTableToken,
  validateRoomToken,
  getGuestMenu,
  createGuestOrder,
  getGuestOrderStatus,
  callWaiter,
  requestBill,
  // Table APIs
  createTable,
  getTables,
  getTableById,
  updateTable,
  deleteTable,
  batchCreateTables,
  generateTableQR,
  updateTableStatus,
  getTableQRDownload,
  // Room QR APIs
  getRooms,
  generateRoomQR,
  batchGenerateRoomQR,
  toggleRoomQR,
  getRoomQRDownload,
  getAllRoomQRCodes,
};
