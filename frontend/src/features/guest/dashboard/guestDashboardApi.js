/**
 * guestDashboardApi.js
 *
 * Frontend API client for the authenticated guest dashboard.
 * Uses the standard axiosClient which attaches the user's Bearer token.
 *
 * Base path: /api/guest/portal
 */

import axiosClient from "../../../core/api/client";

const BASE = "/api/v1/guest/portal";

/* ════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════ */

export const getDashboardOverview = () =>
  axiosClient.get(`${BASE}/dashboard`).then((r) => r.data);

/* ════════════════════════════════════════════
   BOOKINGS
   ════════════════════════════════════════════ */

export const getGuestBookings = (params = {}) =>
  axiosClient.get(`${BASE}/bookings`, { params }).then((r) => r.data);

/**
 * Check availability for extending a booking
 * @param {string} bookingId - The booking ID
 * @param {number} nights - Number of nights to check
 */
export const checkExtensionAvailability = (bookingId, nights = 7) =>
  axiosClient.get(`${BASE}/bookings/${bookingId}/extend/availability`, { params: { nights } }).then((r) => r.data);

/**
 * Extend a booking
 * @param {string} bookingId - The booking ID
 * @param {number} additionalNights - Number of additional nights
 */
export const extendBooking = (bookingId, additionalNights) =>
  axiosClient.post(`${BASE}/bookings/${bookingId}/extend`, { additionalNights }).then((r) => r.data);

/**
 * Modify an existing booking (dates, guest count, etc.)
 * Hits the shared booking management endpoint (not the portal namespace).
 * @param {string} bookingId
 * @param {object} data  – { checkIn?, checkOut?, numGuests?, ... }
 */
export const modifyBooking = (bookingId, data) =>
  axiosClient.patch(`/api/v1/bookings/${bookingId}/modify`, data).then((r) => r.data);

/**
 * Cancel a booking.
 * @param {string} bookingId
 * @param {object} data  – { reason? }
 */
export const cancelBooking = (bookingId, data = {}) =>
  axiosClient.post(`/api/v1/bookings/${bookingId}/cancel`, data).then((r) => r.data);

/**
 * Request a refund for a cancelled/eligible booking.
 * @param {string} bookingId
 * @param {object} data
 */
export const requestRefund = (bookingId, data = {}) =>
  axiosClient.post(`/api/v1/bookings/${bookingId}/refund`, data).then((r) => r.data);

/* ════════════════════════════════════════════
   RESTAURANT / ROOM SERVICE
   ════════════════════════════════════════════ */

export const getGuestMenu = (params = {}) => {
  // Menu endpoint auto-resolves hotelId from user's active booking
  // No need to pass hotelId explicitly
  return axiosClient.get(`${BASE}/menu`, { params }).then((r) => r.data);
};

export const placeOrder = (orderData) =>
  axiosClient.post(`${BASE}/order`, orderData).then((r) => r.data);

export const getGuestOrders = (params = {}) =>
  axiosClient.get(`${BASE}/orders`, { params }).then((r) => r.data);

/**
 * Check if an order can be cancelled
 * @param {string} orderId - The order ID
 */
export const checkOrderCancellable = (orderId) =>
  axiosClient.get(`${BASE}/orders/${orderId}/can-cancel`).then((r) => r.data);

/**
 * Cancel an order
 * @param {string} orderId - The order ID
 * @param {string} reason - Cancellation reason (optional)
 */
export const cancelOrder = (orderId, reason = '') =>
  axiosClient.post(`${BASE}/orders/${orderId}/cancel`, { reason }).then((r) => r.data);

/* ════════════════════════════════════════════
   BILLING / INVOICES
   ════════════════════════════════════════════ */

export const getGuestInvoices = (params = {}) =>
  axiosClient.get(`${BASE}/invoices`, { params }).then((r) => r.data);

/**
 * Pay an order/invoice via payment gateway.
 * @param {string} orderId  – the order or invoice ID
 * @param {object} payData  – { amount?, currency?, paymentMethod, cardDetails? }
 */
export const payOrder = (orderId, payData) =>
  axiosClient.post(`${BASE}/orders/${orderId}/pay`, payData).then((r) => r.data);

/** Confirm a Stripe payment after the frontend completes it */
export const confirmPayment = (paymentIntentId, orderId) =>
  axiosClient.post(`${BASE}/payments/confirm`, { paymentIntentId, orderId }).then((r) => r.data);

/** Verify Khalti payment after redirect back from Khalti portal */
export const verifyKhaltiPayment = (pidx, orderId) =>
  axiosClient.post(`${BASE}/payments/verify-khalti`, { pidx, orderId }).then((r) => r.data);

/** Verify eSewa payment after redirect back from eSewa */
export const verifyEsewaPayment = (encodedData, orderId) =>
  axiosClient.post(`${BASE}/payments/verify-esewa`, { encodedData, orderId }).then((r) => r.data);

/** Get available payment gateway configuration */
export const getPaymentGatewayConfig = () =>
  axiosClient.get(`${BASE}/payments/config`).then((r) => r.data);

/* ════════════════════════════════════════════
   PROFILE
   ════════════════════════════════════════════ */

export const getUserProfile = () =>
  axiosClient.get(`${BASE}/profile`).then((r) => r.data);

export const updateUserProfile = (profileData) =>
  axiosClient.put(`${BASE}/profile`, profileData).then((r) => r.data);

/* ════════════════════════════════════════════
   GUEST REQUESTS
   ════════════════════════════════════════════ */

export const getGuestRequests = (params = {}) =>
  axiosClient.get(`${BASE}/requests`, { params }).then((r) => r.data);

export const submitRequest = (requestData) => {
  // Request endpoint auto-resolves hotelId from user's active booking
  // No need to pass hotelId explicitly
  return axiosClient.post(`${BASE}/request`, requestData).then((r) => r.data);
};
