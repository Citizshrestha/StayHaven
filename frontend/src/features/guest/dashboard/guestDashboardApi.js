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
export const payOrder = (orderId, payData, idempotencyKey) =>
  axiosClient.post(`${BASE}/orders/${encodeURIComponent(orderId)}/pay`, payData, {
    timeout: 30000,
    ...(idempotencyKey && { headers: { 'Idempotency-Key': idempotencyKey } }),
  }).then((r) => r.data);

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
export { getPaymentGatewayConfig } from '../../../core/api/services/publicBooking.service';

/* ════════════════════════════════════════════
   PROFILE
   ════════════════════════════════════════════ */

export const getUserProfile = () =>
  axiosClient.get(`${BASE}/profile`).then((r) => r.data);

export const updateUserProfile = (profileData) =>
  axiosClient.put(`${BASE}/profile`, profileData).then((r) => r.data);

/** Upload a new profile photo (JPEG/PNG/WEBP, ≤ 5 MB). */
export const uploadProfilePicture = (file) => {
  const form = new FormData();
  form.append('profilePicture', file);
  // multipart header makes axios drop the JSON default so the browser sets the boundary
  return axiosClient
    .post(`${BASE}/profile/picture`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })
    .then((r) => r.data);
};

export const removeProfilePicture = () =>
  axiosClient.delete(`${BASE}/profile/picture`).then((r) => r.data);

/** @param {{ currentPassword: string, newPassword: string }} data */
export const changePassword = (data) =>
  axiosClient.put(`${BASE}/profile/password`, data).then((r) => r.data);

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

/* ════════════════════════════════════════════
   CHAT / MESSAGING  (guest ↔ reception / room-service)
   hotelId is resolved server-side from the active booking.
   ════════════════════════════════════════════ */

/** Whether chat is available (active booking) + which channels exist. */
export const getChatContext = () =>
  axiosClient.get(`${BASE}/messages/context`).then((r) => r.data);

/** Fetch the guest's thread for a channel. */
export const getChatMessages = (channel, params = {}) =>
  axiosClient.get(`${BASE}/messages`, { params: { channel, ...params } }).then((r) => r.data);

/** Send a message on a guest channel ('reception' | 'room-service'). */
export const sendChatMessage = (channel, content) =>
  axiosClient.post(`${BASE}/messages`, { channel, content }).then((r) => r.data);

/** Mark staff→guest messages in a channel as read. */
export const markChatRead = (channel) =>
  axiosClient.put(`${BASE}/messages/read`, { channel }).then((r) => r.data);

/** Unread staff→guest message counts for the nav badge. */
export const getChatUnreadCount = () =>
  axiosClient.get(`${BASE}/messages/unread-count`).then((r) => r.data);

/* ════════════════════════════════════════════
   NOTIFICATIONS (portal bell)
   ════════════════════════════════════════════ */

export const getGuestNotifications = (params = {}) =>
  axiosClient.get(`${BASE}/notifications`, { params: { limit: 30, ...params } }).then((r) => r.data);

/** Mark specific notifications read, or all of them when `ids` is omitted. */
export const markGuestNotificationsRead = (ids) =>
  axiosClient.put(`${BASE}/notifications/read`, ids?.length ? { notificationIds: ids } : {}).then((r) => r.data);
