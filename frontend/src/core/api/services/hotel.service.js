import axiosClient from '../client';

const BASE = '/api/v1/hotels';

const getAuthToken = () =>
  sessionStorage.getItem('staffAccessToken') ||
  localStorage.getItem('staffAccessToken') ||
  localStorage.getItem('accessToken');

const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Get all hotels (public - with filters)
export const getAllHotels = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await axiosClient.get(`${BASE}${queryParams ? `?${queryParams}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching hotels:', error);
    throw error.response?.data || error;
  }
};

// Get hotel by ID (public)
export const getHotelById = async (hotelId) => {
  try {
    const response = await axiosClient.get(`${BASE}/${hotelId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching hotel:', error);
    throw error.response?.data || error;
  }
};

// Get owner's hotels (protected - owner only)
export const getMyHotels = async () => {
  try {
    const response = await axiosClient.get(`${BASE}/owner/my-hotels`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching my hotels:', error);
    throw error.response?.data || error;
  }
};

// Create new hotel (protected - owner only)
export const createHotel = async (hotelData) => {
  try {
    const response = await axiosClient.post(BASE, hotelData, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error creating hotel:', error);
    throw error.response?.data || error;
  }
};

// Update hotel (protected - owner only)
export const updateHotel = async (hotelId, hotelData) => {
  try {
    const response = await axiosClient.put(`${BASE}/${hotelId}`, hotelData, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error updating hotel:', error);
    throw error.response?.data || error;
  }
};

// Delete hotel (protected - owner only)
export const deleteHotel = async (hotelId) => {
  try {
    const response = await axiosClient.delete(`${BASE}/${hotelId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting hotel:', error);
    throw error.response?.data || error;
  }
};

// Toggle hotel active status (protected - owner only)
export const toggleHotelStatus = async (hotelId) => {
  try {
    const response = await axiosClient.patch(`${BASE}/${hotelId}/toggle-status`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error toggling hotel status:', error);
    throw error.response?.data || error;
  }
};

// Get hotel statistics (protected - owner only)
export const getHotelStats = async (hotelId) => {
  try {
    const response = await axiosClient.get(`${BASE}/${hotelId}/stats`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching hotel stats:', error);
    throw error.response?.data || error;
  }
};

// Search hotels (public)
export const searchHotels = async (searchQuery) => {
  try {
    const response = await axiosClient.get(`${BASE}/search?q=${encodeURIComponent(searchQuery)}`);
    return response.data;
  } catch (error) {
    console.error('Error searching hotels:', error);
    throw error.response?.data || error;
  }
};

// Get featured hotels (public)
export const getFeaturedHotels = async () => {
  try {
    const response = await axiosClient.get(`${BASE}/featured`);
    return response.data;
  } catch (error) {
    console.error('Error fetching featured hotels:', error);
    throw error.response?.data || error;
  }
};

// =========================
// Super Admin - Hotel Management
// =========================
export const getAdminHotels = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await axiosClient.get(`${BASE}/admin/all${queryParams ? `?${queryParams}` : ''}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching admin hotels:', error);
    throw error.response?.data || error;
  }
};

export const updateHotelStatus = async (hotelId, status, reason) => {
  try {
    const response = await axiosClient.patch(`${BASE}/${hotelId}/status`, { status, reason }, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error updating hotel status:', error);
    throw error.response?.data || error;
  }
};
