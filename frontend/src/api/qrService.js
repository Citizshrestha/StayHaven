import axiosClient from '../axiosClient';

// =====================================================
// GUEST PUBLIC API (No Authentication Required)
// These endpoints are accessed after QR code scanning
// =====================================================

export const validateTableToken = async (token) => {
  try {
    const response = await axiosClient.get(`/api/v1/guest/table/${token}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const validateRoomToken = async (token) => {
  try {
    const response = await axiosClient.get(`/api/v1/guest/room/${token}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getGuestMenu = async (hotelId, category = null) => {
  try {
    const url = category
      ? `/api/v1/guest/menu/${hotelId}?category=${category}`
      : `/api/v1/guest/menu/${hotelId}`;
    const response = await axiosClient.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const createGuestOrder = async (orderData) => {
  try {
    const response = await axiosClient.post('/api/v1/guest/order', orderData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getGuestOrderStatus = async (orderId, guestSessionId) => {
  try {
    const response = await axiosClient.get(`/api/v1/guest/order/${orderId}`, {
      params: guestSessionId ? { guestSessionId } : undefined,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const callWaiter = async (data) => {
  try {
    const response = await axiosClient.post('/api/v1/guest/call-waiter', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const requestBill = async (data) => {
  try {
    const response = await axiosClient.post('/api/v1/guest/request-bill', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// =====================================================
// TABLE MANAGEMENT API (Authentication Required)
// =====================================================

export const createTable = async (tableData) => {
  try {
    const response = await axiosClient.post('/api/v1/tables', tableData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getTables = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const url = queryParams ? `/api/v1/tables?${queryParams}` : '/api/v1/tables';
    const response = await axiosClient.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getTableById = async (tableId) => {
  try {
    const response = await axiosClient.get(`/api/v1/tables/${tableId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateTable = async (tableId, tableData) => {
  try {
    const response = await axiosClient.put(`/api/v1/tables/${tableId}`, tableData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deleteTable = async (tableId) => {
  try {
    const response = await axiosClient.delete(`/api/v1/tables/${tableId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const batchCreateTables = async (data) => {
  try {
    const response = await axiosClient.post('/api/v1/tables/batch', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const generateTableQR = async (tableId, regenerate = false) => {
  try {
    const response = await axiosClient.post(`/api/v1/tables/${tableId}/generate-qr`, { regenerate });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateTableStatus = async (tableId, status) => {
  try {
    const response = await axiosClient.patch(`/api/v1/tables/${tableId}/status`, { status });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getTableQRDownload = async (tableId) => {
  try {
    const response = await axiosClient.get(`/api/v1/tables/${tableId}/qr-download`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// =====================================================
// ROOM QR MANAGEMENT API (Authentication Required)
// =====================================================

export const getRooms = async (hotelId, filters = {}) => {
  try {
    const queryParams = new URLSearchParams({ hotelId, ...filters }).toString();
    const response = await axiosClient.get(`/api/v1/rooms?${queryParams}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const generateRoomQR = async (roomId, regenerate = false) => {
  try {
    const response = await axiosClient.post(`/api/v1/rooms/${roomId}/generate-qr`, { regenerate });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const batchGenerateRoomQR = async (hotelId, regenerate = false) => {
  try {
    const response = await axiosClient.post('/api/v1/rooms/batch-generate-qr', { hotelId, regenerate });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const toggleRoomQR = async (roomId) => {
  try {
    const response = await axiosClient.patch(`/api/v1/rooms/${roomId}/toggle-qr`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getRoomQRDownload = async (roomId) => {
  try {
    const response = await axiosClient.get(`/api/v1/rooms/${roomId}/qr-download`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAllRoomQRCodes = async (hotelId) => {
  try {
    const response = await axiosClient.get(`/api/v1/rooms/qr-codes/${hotelId}`);
    return response.data;
  } catch (error) {
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
