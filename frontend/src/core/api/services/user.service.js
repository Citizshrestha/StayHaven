import axiosClient from "../client";

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
// /api/v1/users/admin/* is staff-scoped in client.js, so the superadmin's
// staff token is attached; a guest token is never sent here.
export const getAdminUsers = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const { data } = await axiosClient.get(
    `/api/v1/users/admin/all${queryParams ? `?${queryParams}` : ""}`
  );
  return data;
};

export const getUserById = async (userId) => {
  const { data } = await axiosClient.get(`/api/v1/users/admin/${userId}`);
  return data;
};

export const updateUser = async (userId, userData) => {
  const { data } = await axiosClient.patch(
    `/api/v1/users/admin/${userId}`,
    userData
  );
  return data;
};

export const updateUserStatus = async (userId, isActive) => {
  const { data } = await axiosClient.put(
    `/api/v1/users/admin/${userId}/status`,
    { isActive }
  );
  return data;
};

export const resetUserPassword = async (userId) => {
  const { data } = await axiosClient.post(
    `/api/v1/users/admin/${userId}/reset-password`,
    {}
  );
  return data;
};

export const deleteUser = async (userId) => {
  const { data } = await axiosClient.delete(`/api/v1/users/admin/${userId}`);
  return data;
};

export const getWishList = getWishlist;
export const toggleWishList = toggleWishlist;