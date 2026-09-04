import axiosClient from "../client";

/**
 * Seed comprehensive hotel admin dashboard data
 * @param {string} hotelId - Hotel ID
 * @param {boolean} clear - Clear existing data before seeding
 * @returns {Promise} - API response
 */
export const seedHotelAdminData = async (hotelId, clear = false) => {
  try {
    const response = await axiosClient.post(`/seed/hotel-admin-data/${hotelId}${clear ? '?clear=true' : ''}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

/**
 * Seed rooms for a specific hotel
 * @param {string} hotelId - Hotel ID
 * @returns {Promise} - API response
 */
export const seedRoomsForHotel = async (hotelId) => {
  try {
    const response = await axiosClient.post(`/seed/rooms/${hotelId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

/**
 * Seed rooms for all hotels
 * @returns {Promise} - API response
 */
export const seedAllRooms = async () => {
  try {
    const response = await axiosClient.post('/seed/all-rooms');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

/**
 * Clear all rooms from a hotel
 * @param {string} hotelId - Hotel ID
 * @returns {Promise} - API response
 */
export const clearHotelRooms = async (hotelId) => {
  try {
    const response = await axiosClient.delete(`/seed/rooms/${hotelId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

