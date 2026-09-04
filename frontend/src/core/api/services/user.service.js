import axiosClient from "../client";

const getAuthToken = () =>
  sessionStorage.getItem("staffAccessToken") ||
  localStorage.getItem("accessToken");

const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Standard names
export const getWishlist = async () => {
  const { data } = await axiosClient.get("/api/v1/user/wishlist");
  return data;
};

export const toggleWishlist = async (hotelId) => {
  const { data } = await axiosClient.post(`/api/v1/user/wishlist/${hotelId}`);
  return data;
};

export const getCart = async () => {
  const { data } = await axiosClient.get("/api/v1/user/cart");
  return data;
};

export const addToCart = async (hotelId, quantity = 1) => {
  const { data } = await axiosClient.post(`/api/v1/user/cart`, { hotelId, quantity });
  return data;
};

export const removeFromCart = async (hotelId) => {
  const { data } = await axiosClient.delete(`/api/v1/user/cart/${hotelId}`);
  return data;
};

export const clearCart = async () => {
  const { data } = await axiosClient.delete(`/api/v1/user/cart`);
  return data;
};

// =========================
// Super Admin - User Management
// =========================
export const getAdminUsers = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const { data } = await axiosClient.get(
    `/api/v1/users/admin/all${queryParams ? `?${queryParams}` : ""}`,
    { headers: getAuthHeaders() }
  );
  return data;
};

export const getUserById = async (userId) => {
  const { data } = await axiosClient.get(`/api/v1/users/admin/${userId}`, {
    headers: getAuthHeaders(),
  });
  return data;
};

export const updateUser = async (userId, userData) => {
  const { data } = await axiosClient.patch(
    `/api/v1/users/admin/${userId}`,
    userData,
    { headers: getAuthHeaders() }
  );
  return data;
};

export const updateUserStatus = async (userId, isActive) => {
  const { data } = await axiosClient.put(
    `/api/v1/users/admin/${userId}/status`,
    { isActive },
    { headers: getAuthHeaders() }
  );
  return data;
};

export const resetUserPassword = async (userId) => {
  const { data } = await axiosClient.post(
    `/api/v1/users/admin/${userId}/reset-password`,
    {},
    { headers: getAuthHeaders() }
  );
  return data;
};

export const deleteUser = async (userId) => {
  const { data } = await axiosClient.delete(`/api/v1/users/admin/${userId}`, {
    headers: getAuthHeaders(),
  });
  return data;
};

export const getWishList = getWishlist;
export const toggleWishList = toggleWishlist;