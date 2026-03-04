import axiosClient from "../client";

const BASE = "/api/reception";

/* ═══ Dashboard ═══ */
export const getDashboardSummary = () => axiosClient.get(`${BASE}/dashboard/summary`).then(r => r.data);
export const getLiveRoomStatus = () => axiosClient.get(`${BASE}/dashboard/room-status`).then(r => r.data);
export const getWeeklyOccupancy = () => axiosClient.get(`${BASE}/dashboard/occupancy-weekly`).then(r => r.data);
export const getRevenueSplit = () => axiosClient.get(`${BASE}/dashboard/revenue-split`).then(r => r.data);

/* ═══ Arrivals / Departures / Check-in / Check-out ═══ */
export const getTodayArrivals = () => axiosClient.get(`${BASE}/checkin/today-arrivals`).then(r => r.data);
export const getTodayDepartures = () => axiosClient.get(`${BASE}/checkin/today-departures`).then(r => r.data);
export const performCheckIn = (bookingId) => axiosClient.post(`${BASE}/checkin/${bookingId}/checkin`).then(r => r.data);
export const performCheckOut = (bookingId) => axiosClient.post(`${BASE}/checkin/${bookingId}/checkout`).then(r => r.data);

/* ═══ Reservations / Bookings ═══ */
export const getReservations = (params = {}) =>
  axiosClient.get(`${BASE}/reservations`, { params }).then(r => r.data);

/* ═══ Rooms ═══ */
export const getRoomsList = () => axiosClient.get(`${BASE}/rooms/list`).then(r => r.data);
export const updateRoomStatus = (roomId, status) =>
  axiosClient.patch(`${BASE}/rooms/${roomId}/status`, { status }).then(r => r.data);

/* ═══ Guests ═══ */
export const getGuestsList = (params = {}) =>
  axiosClient.get(`${BASE}/guests`, { params }).then(r => r.data);
export const getGuestById = (guestId) =>
  axiosClient.get(`${BASE}/guests/${guestId}`).then(r => r.data);
// Mark guest as active/inactive (preserves records, never deletes)
export const updateGuestStatus = (guestId, isActive) =>
  axiosClient.patch(`${BASE}/guests/${guestId}/status`, { isActive }).then(r => r.data);
// Blacklist / un-blacklist a guest with an optional reason
export const flagGuestBlacklist = (guestId, blacklisted, reason = "") =>
  axiosClient.patch(`${BASE}/guests/${guestId}/blacklist`, { blacklisted, reason }).then(r => r.data);

/* ═══ Housekeeping ═══ */
export const getHousekeepingTasks = (params = {}) =>
  axiosClient.get(`${BASE}/housekeeping`, { params }).then(r => r.data);
export const updateHousekeepingTask = (taskId, updates) =>
  axiosClient.patch(`${BASE}/housekeeping/${taskId}`, updates).then(r => r.data);

/* ═══ Guest Requests ═══ */
export const getGuestRequests = () => axiosClient.get(`${BASE}/guest-requests`).then(r => r.data);
export const assignGuestRequest = (requestId) =>
  axiosClient.patch(`${BASE}/guest-requests/${requestId}/assign`).then(r => r.data);
export const ignoreGuestRequest = (requestId) =>
  axiosClient.patch(`${BASE}/guest-requests/${requestId}/ignore`).then(r => r.data);
export const resolveGuestRequest = (requestId) =>
  axiosClient.patch(`${BASE}/guest-requests/${requestId}/resolve`).then(r => r.data);

/* ═══ Billing ═══ */
export const getInvoices = (params = {}) =>
  axiosClient.get(`${BASE}/billing/invoices`, { params }).then(r => r.data);
export const getBillingSummary = () =>
  axiosClient.get(`${BASE}/billing/summary`).then(r => r.data);

/* ═══ Staff ═══ */
export const getStaffList = () => axiosClient.get(`${BASE}/staff/list`).then(r => r.data);
// Report a staff issue to management (receptionist cannot delete/deactivate staff)
export const notifyManagerAboutStaff = (staffId, reason, urgency = "normal") =>
  axiosClient.post(`${BASE}/staff/${staffId}/notify-manager`, { reason, urgency }).then(r => r.data);

/* ═══ Reports ═══ */
export const getReportsOverview = (params = {}) =>
  axiosClient.get(`${BASE}/reports/overview`, { params }).then(r => r.data);

/* ═══ Activity Log ═══ */
export const getActivityLog = (limit = 20) =>
  axiosClient.get(`${BASE}/activity/live`, { params: { limit } }).then(r => r.data);
