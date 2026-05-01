import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Create a booking with payment
 * Public endpoint - no authentication required
 */
export const createBookingWithPayment = async (bookingData) => {
  try {
    const response = await axios.post(`${API_URL}/public/bookings/create-with-payment`, bookingData);
    return response.data;
  } catch (error) {
    console.error('Booking creation error:', error);
    throw error;
  }
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
