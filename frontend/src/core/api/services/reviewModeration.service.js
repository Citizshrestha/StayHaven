import apiClient from "../client";

export const seedReviewData = async () => {
  const response = await apiClient.post("/api/v1/seed/review-data");
  return response.data;
};

export const getPendingReviews = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/reviews?${queryParams.toString()}`);
  return response.data;
};

export const moderateReview = async (id, data) => {
  const response = await apiClient.put(`/api/v1/superadmin/reviews/${id}/moderate`, data);
  return response.data;
};

export const getAutoFlagRules = async () => {
  const response = await apiClient.get("/api/v1/superadmin/reviews/auto-flag-rules");
  return response.data;
};

export const updateAutoFlagRules = async (data) => {
  const response = await apiClient.put("/api/v1/superadmin/reviews/auto-flag-rules", data);
  return response.data;
};

export const addHotelReply = async (id, data) => {
  const response = await apiClient.post(`/api/v1/superadmin/reviews/${id}/reply`, data);
  return response.data;
};

export const moderateHotelReply = async (id, data) => {
  const response = await apiClient.put(`/api/v1/superadmin/reviews/${id}/reply/moderate`, data);
  return response.data;
};

export const submitAppeal = async (id, data) => {
  const response = await apiClient.post(`/api/v1/superadmin/reviews/${id}/appeal`, data);
  return response.data;
};

export const resolveAppeal = async (id, data) => {
  const response = await apiClient.put(`/api/v1/superadmin/reviews/${id}/appeal/resolve`, data);
  return response.data;
};

export const getModerationMetrics = async () => {
  const response = await apiClient.get("/api/v1/superadmin/reviews/metrics");
  return response.data;
};

export const getReviewInsights = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/reviews/insights?${queryParams.toString()}`);
  return response.data;
};
