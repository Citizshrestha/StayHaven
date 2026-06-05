import apiClient from '../client';

/**
 * Get current user profile
 * @returns {Promise} Profile data
 */
export const getProfile = async () => {
  const response = await apiClient.get('/api/v1/profile');
  return response.data;
};

/**
 * Update user profile (username, email, fullname)
 * @param {Object} data - Profile data to update
 * @returns {Promise} Updated profile data
 */
export const updateProfile = async (data) => {
  const response = await apiClient.patch('/api/v1/profile', data);
  return response.data;
};

/**
 * Update profile picture
 * @param {string} profilePicture - Profile picture URL
 * @returns {Promise} Updated profile data
 */
export const updateProfilePicture = async (profilePicture) => {
  const response = await apiClient.patch('/api/v1/profile/picture', { profilePicture });
  return response.data;
};

/**
 * Upload profile picture file to Cloudinary
 * @param {File} file - Image file
 * @returns {Promise} Updated profile data
 */
export const uploadProfilePictureFile = async (file) => {
  const formData = new FormData();
  formData.append('profilePicture', file);

  const response = await apiClient.post('/api/v1/profile/picture/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Change password
 * @param {Object} data - Current and new password
 * @returns {Promise} Success message
 */
export const changePassword = async (data) => {
  const response = await apiClient.post('/api/v1/profile/change-password', data);
  return response.data;
};
