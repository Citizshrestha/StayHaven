import axiosClient from '../../../../core/api/client';

const base = (hotelId) => `/api/v1/hotels/${encodeURIComponent(hotelId)}`;

/** Which of a hotel's rooms can be booked for the stay: [{ roomId, available }] */
export const fetchRoomAvailability = async (hotelId, { checkIn, checkOut }, options = {}) => {
  const { data } = await axiosClient.get(`${base(hotelId)}/availability`, { params: { checkIn, checkOut }, timeout: 10000, ...options });
  return Array.isArray(data?.rooms) ? data.rooms : [];
};

/** Approved reviews only (the server never returns hidden/pending ones) plus the 1-5 star distribution. */
export const fetchHotelReviews = async (hotelId, { page = 1, limit = 5 } = {}, options = {}) => {
  const { data } = await axiosClient.get(`${base(hotelId)}/reviews`, { params: { page, limit }, timeout: 10000, ...options });
  return data;
};
