import apiClient from '../client';

export const getMaintenanceStatus = async () => {
  const response = await apiClient.get('/api/v1/public/maintenance-status');
  return response.data;
};
