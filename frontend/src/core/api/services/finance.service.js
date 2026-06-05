import apiClient from "../client";

export const getFinanceOverview = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/finance/overview?${queryParams.toString()}`);
  return response.data;
};

export const seedFinanceData = async () => {
  const response = await apiClient.post("/api/v1/seed/finance-data");
  return response.data;
};

export const getRevenueSummary = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/finance/revenue/summary?${queryParams.toString()}`);
  return response.data;
};

export const getRevenueByHotel = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/finance/revenue/by-hotel?${queryParams.toString()}`);
  return response.data;
};

export const getRevenueBreakdown = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/finance/revenue/breakdown?${queryParams.toString()}`);
  return response.data;
};

export const getPaymentMethodMix = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/finance/payment-methods?${queryParams.toString()}`);
  return response.data;
};

export const getPayouts = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/finance/payouts?${queryParams.toString()}`);
  return response.data;
};

export const createPayout = async (data) => {
  const response = await apiClient.post("/api/v1/superadmin/finance/payouts", data);
  return response.data;
};

export const updatePayoutStatus = async (id, data) => {
  const response = await apiClient.put(`/api/v1/superadmin/finance/payouts/${id}/status`, data);
  return response.data;
};

export const getRefunds = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/finance/refunds?${queryParams.toString()}`);
  return response.data;
};

export const createRefund = async (data) => {
  const response = await apiClient.post("/api/v1/superadmin/finance/refunds", data);
  return response.data;
};

export const updateRefundStatus = async (id, data) => {
  const response = await apiClient.put(`/api/v1/superadmin/finance/refunds/${id}/status`, data);
  return response.data;
};

export const getCommissionRules = async () => {
  const response = await apiClient.get("/api/v1/superadmin/finance/commission-rules");
  return response.data;
};

export const createCommissionRule = async (data) => {
  const response = await apiClient.post("/api/v1/superadmin/finance/commission-rules", data);
  return response.data;
};

export const updateCommissionRule = async (id, data) => {
  const response = await apiClient.put(`/api/v1/superadmin/finance/commission-rules/${id}`, data);
  return response.data;
};

export const deleteCommissionRule = async (id) => {
  const response = await apiClient.delete(`/api/v1/superadmin/finance/commission-rules/${id}`);
  return response.data;
};

export const getInvoice = async (bookingId) => {
  const response = await apiClient.get(`/api/v1/superadmin/finance/invoice/${bookingId}`);
  return response.data;
};

export const getFinancialReport = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const isCsv = params.format === 'csv';
  const response = await apiClient.get(
    `/api/v1/superadmin/finance/report?${queryParams.toString()}`,
    isCsv ? { responseType: 'text' } : undefined
  );
  return isCsv ? response.data : response.data;
};
