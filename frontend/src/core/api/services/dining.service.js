import axiosClient from "../client";

// Restaurant tabs (dine-in tables + takeaway) — /api/v1/staff/dining
const BASE = "/api/v1/staff/dining";

export const getDiningSessions = (params) =>
  axiosClient.get(`${BASE}/sessions`, { params }).then((r) => r.data);

export const getDiningSession = (id) =>
  axiosClient.get(`${BASE}/sessions/${id}`).then((r) => r.data);

export const recordDiningPayment = (id, payload) =>
  axiosClient.post(`${BASE}/sessions/${id}/payments`, payload).then((r) => r.data);

export const closeDiningSession = (id) =>
  axiosClient.post(`${BASE}/sessions/${id}/close`).then((r) => r.data);

export const printDiningBill = (id) =>
  axiosClient.post(`${BASE}/sessions/${id}/print`).then((r) => r.data);

export const transferDiningSession = (id, tableId) =>
  axiosClient.post(`${BASE}/sessions/${id}/transfer`, { tableId }).then((r) => r.data);

export const applyDiningDiscount = (id, payload) =>
  axiosClient.post(`${BASE}/sessions/${id}/discount`, payload).then((r) => r.data);

export const removeDiningDiscount = (id) =>
  axiosClient.delete(`${BASE}/sessions/${id}/discount`).then((r) => r.data);

export const refundDiningPayment = (id, payload) =>
  axiosClient.post(`${BASE}/sessions/${id}/refunds`, payload).then((r) => r.data);

export const voidDiningSession = (id, reason) =>
  axiosClient.post(`${BASE}/sessions/${id}/void`, { reason }).then((r) => r.data);

export const getDiningReport = (params) =>
  axiosClient.get(`${BASE}/report`, { params }).then((r) => r.data);

export const getDiningSettings = (hotelId) =>
  axiosClient.get(`${BASE}/settings`, { params: { hotelId } }).then((r) => r.data);

export const saveDiningSettings = (payload) =>
  axiosClient.put(`${BASE}/settings`, payload).then((r) => r.data);

/** Tables for the dine-in picker / transfer target. */
export const getHotelTables = (hotelId) =>
  axiosClient.get("/api/v1/tables", { params: { hotelId, isActive: true } }).then((r) => r.data);

export const newIdempotencyKey = (prefix = "pay") =>
  `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
