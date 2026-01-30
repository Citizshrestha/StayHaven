import axiosClient from '../axiosClient';

// Get all hotels (public - with filters)
export const getAllHotels = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await axiosClient.get(`/hotels${queryParams ? `?${queryParams}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching hotels:', error);
    throw error.response?.data || error;
  }
};

// Get hotel by ID (public)
export const getHotelById = async (hotelId) => {
  try {
    const response = await axiosClient.get(`/hotels/${hotelId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching hotel:', error);
    throw error.response?.data || error;
  }
};

// Get owner's hotels (protected - owner only)
export const getMyHotels = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.get('/hotels/owner/my-hotels', {
      headers: { Authorization: `Bearer ${token}` }
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
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.post('/hotels', hotelData, {
      headers: { Authorization: `Bearer ${token}` }
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
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.put(`/hotels/${hotelId}`, hotelData, {
      headers: { Authorization: `Bearer ${token}` }
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
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.delete(`/hotels/${hotelId}`, {
      headers: { Authorization: `Bearer ${token}` }
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
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.patch(`/hotels/${hotelId}/toggle-status`, {}, {
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
    const response = await axiosClient.get(`/hotels/${hotelId}/stats`, {
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
    const response = await axiosClient.get(`/hotels/search?q=${encodeURIComponent(searchQuery)}`);
    return response.data;
  } catch (error) {
    console.error('Error searching hotels:', error);
    throw error.response?.data || error;
  }
};

// Get featured hotels (public)
export const getFeaturedHotels = async () => {
  try {
    const response = await axiosClient.get('/hotels/featured');
    return response.data;
  } catch (error) {
    console.error('Error fetching featured hotels:', error);
    throw error.response?.data || error;
  }
};

// Get hotel report (protected - owner/admin only)
export const getHotelReport = async (hotelId, dateRange = 'month') => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.get(`/hotels/${hotelId}/report?dateRange=${dateRange}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching hotel report:', error);
    throw error.response?.data || error;
  }
};

// Get hotel revenue report (protected - owner/admin only)
export const getHotelRevenueReport = async (hotelId, startDate, endDate) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.get(`/hotels/${hotelId}/revenue-report`, {
      params: { startDate, endDate },
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    throw error.response?.data || error;
  }
};

// Get occupancy report (protected - owner/admin only)
export const getOccupancyReport = async (hotelId, dateRange = 'month') => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.get(`/hotels/${hotelId}/occupancy-report?dateRange=${dateRange}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching occupancy report:', error);
    throw error.response?.data || error;
  }
};

// Get loyalty points data (protected - owner/admin only)
export const getLoyaltyPoints = async (hotelId, filters = {}) => {
  try {
    const token = localStorage.getItem('accessToken');
    const queryParams = new URLSearchParams(filters).toString();
    const response = await axiosClient.get(`/hotels/${hotelId}/loyalty-points${queryParams ? `?${queryParams}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching loyalty points:', error);
    throw error.response?.data || error;
  }
};

// Get user loyalty details (protected - guest/user)
export const getUserLoyaltyDetails = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.get('/loyalty/my-details', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user loyalty details:', error);
    throw error.response?.data || error;
  }
};

// Update loyalty points (protected - owner/admin only)
export const updateLoyaltyPoints = async (hotelId, userId, points) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axiosClient.post(`/hotels/${hotelId}/loyalty-points/update`, 
      { userId, points },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating loyalty points:', error);
    throw error.response?.data || error;
  }
};
