import axiosClient from '../core/api/client';

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

    // Validate token format
    if (!token.includes('.') || token.split('.').length !== 3) {
      console.error('Invalid token format detected');
      localStorage.removeItem('accessToken'); // Clear invalid token
      throw new Error('Invalid authentication token. Please login again.');
    }

    console.log('Creating booking with payment:', {
      hotelId: bookingData.hotelId,
      roomId: bookingData.roomId,
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      paymentMethod: bookingData.paymentMethod,
      totalAmount: bookingData.totalAmount,
      hasGuestInfo: !!(bookingData.guestName && bookingData.guestEmail && bookingData.guestPhone),
      guestName: bookingData.guestName,
      guestEmail: bookingData.guestEmail,
      guestPhone: bookingData.guestPhone,
    });

    // Use axiosClient which automatically handles CSRF tokens via interceptor
    const response = await axiosClient.post('/api/v1/public/bookings/create-with-payment', bookingData, {
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
      // Clear potentially invalid token
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');

      if (error.response?.data?.message?.includes('Invalid token')) {
        throw new Error('Your session has expired. Please login again to continue.');
      }
      throw new Error('Please login to create a booking');
    }

    // Handle CSRF errors (though interceptor should handle this automatically)
    if (error.response?.status === 403 && error.response?.data?.code?.includes('CSRF')) {
      throw new Error('Security validation failed. Please refresh the page and try again.');
    }

    // Handle validation errors
    if (error.response?.status === 400) {
      const message = error.response?.data?.message || 'Invalid booking details. Please check your information.';
      throw new Error(message);
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
