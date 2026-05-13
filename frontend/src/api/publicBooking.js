import axios from 'axios';
import { getCsrfToken } from '../utils/csrf';
import { getApiUrl } from '../utils/apiConfig';

const API_URL = getApiUrl();

/**
 * Get authentication token from localStorage
 */
const getAuthToken = () => {
  const token = localStorage.getItem('accessToken');
  return token;
};

/**
 * Create a booking with payment
 * REQUIRES AUTHENTICATION - User must be logged in
 */
export const createBookingWithPayment = async (bookingData) => {
  try {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required. Please login to continue.');
    }

    // Fetch CSRF token
    const csrfToken = await getCsrfToken();

    console.log('Creating booking with payment:', {
      hotelId: bookingData.hotelId,
      roomId: bookingData.roomId,
      paymentMethod: bookingData.paymentMethod,
      totalAmount: bookingData.totalAmount,
    });

    const response = await axios.post(`${API_URL}/public/bookings/create-with-payment`, bookingData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken,
      },
      withCredentials: true,
      timeout: 30000, // 30 second timeout
    });

    console.log('Booking creation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Booking creation error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Handle authentication errors
    if (error.response?.status === 401) {
      throw new Error('Please login to create a booking');
    }

    // Handle CSRF errors
    if (error.response?.status === 403 && error.response?.data?.code?.includes('CSRF')) {
      throw new Error('CSRF token missing. Please refresh the page and try again.');
    }

    // Re-throw with better error message
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to create booking. Please try again.');
    }
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  return !!token;
};

/**
 * Format booking data for API
 */
export const formatBookingData = ({
  hotelId,
  roomId,
  checkIn,
  checkOut,
  guests,
  specialRequests,
  guestName,
  guestEmail,
  guestPhone,
  paymentMethod,
  cardDetails,
  bankTransferDetails,
}) => {
  return {
    hotelId,
    roomId,
    checkIn,
    checkOut,
    guests,
    specialRequests,
    guestName,
    guestEmail,
    guestPhone,
    paymentMethod,
    cardDetails,
    bankTransferDetails,
  };
};
