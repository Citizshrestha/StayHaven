import apiClient from "../client";

export const getPlatformSettings = async () => {
  const response = await apiClient.get("/api/v1/superadmin/system/settings");
  return response.data;
};

export const updatePlatformSettings = async (data) => {
  const response = await apiClient.put("/api/v1/superadmin/system/settings", data);
  return response.data;
};

export const toggleMaintenanceMode = async (data) => {
  const response = await apiClient.put("/api/v1/superadmin/system/maintenance", data);
  return response.data;
};

export const testKhaltiWebhook = async () => {
  const response = await apiClient.post("/api/v1/superadmin/system/khalti/test");
  return response.data;
};

export const testSmtp = async () => {
  const response = await apiClient.post("/api/v1/superadmin/system/smtp/test");
  return response.data;
};

export const getRolesPermissions = async () => {
  const response = await apiClient.get("/api/v1/superadmin/system/roles");
  return response.data;
};

export const updateRolePermissions = async (role, data) => {
  const response = await apiClient.put(`/api/v1/superadmin/system/roles/${role}`, data);
  return response.data;
};

export const getAuditLogs = async (params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await apiClient.get(`/api/v1/superadmin/system/audit-logs?${queryParams.toString()}`);
  return response.data;
};

export const getIntegrationStatus = async () => {
  const response = await apiClient.get("/api/v1/superadmin/system/integrations");
  return response.data;
};
