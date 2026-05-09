import axiosClient from '../axiosClient';
import { createLogger } from '../core/utils/logger.js';

const logger = createLogger('HotelAPI');

// Get all hotels (public - with filters)
export const getAllHotels = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await axiosClient.get(`/api/v1/hotels${queryParams ? `?${queryParams}` : ''}`);
    return response.data;
  } catch (error) {
    logger.error('Error fetching hotels:', error);
    throw error.response?.data || error;
  }
};

// Get hotel by ID (public)
export const getHotelById = async (hotelId) => {
  try {
    const response = await axiosClient.get(`/api/v1/hotels/${hotelId}`);
    return response.data;
  } catch (error) {
    logger.error('Error fetching hotel:', error);
    throw error.response?.data || error;
  }
};

// Get owner's hotels (protected - owner only)
export const getMyHotels = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.get('/api/v1/hotels/owner/my-hotels', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Error fetching my hotels:', error);
    throw error.response?.data || error;
  }
};

// Create new hotel (protected - owner only)
export const createHotel = async (hotelData) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.post('/api/v1/hotels', hotelData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Error creating hotel:', error);
    throw error.response?.data || error;
  }
};

// Update hotel (protected - owner only)
export const updateHotel = async (hotelId, hotelData) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.put(`/api/v1/hotels/${hotelId}`, hotelData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Error updating hotel:', error);
    throw error.response?.data || error;
  }
};

// Delete hotel (protected - owner only)
export const deleteHotel = async (hotelId) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.delete(`/api/v1/hotels/${hotelId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    logger.error('Error deleting hotel:', error);
    throw error.response?.data || error;
  }
};

// Toggle hotel active status (protected - owner only)
export const toggleHotelStatus = async (hotelId) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.patch(`/api/v1/hotels/${hotelId}/toggle-status`, {}, {
      headers: { Authorization: `Bearer ${token}` }
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
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.get(`/api/v1/hotels/${hotelId}/stats`, {
      headers: { Authorization: `Bearer ${token}` }
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
    const response = await axiosClient.get(`/api/v1/hotels/search?q=${encodeURIComponent(searchQuery)}`);
    return response.data;
  } catch (error) {
    console.error('Error searching hotels:', error);
    throw error.response?.data || error;
  }
};

// Get featured hotels (public)
export const getFeaturedHotels = async () => {
  try {
    const response = await axiosClient.get('/api/v1/hotels/featured');
    return response.data;
  } catch (error) {
    console.error('Error fetching featured hotels:', error);
    throw error.response?.data || error;
  }
};
