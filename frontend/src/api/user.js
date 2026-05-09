import axiosClient from "../axiosClient";

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

export const getWishList = getWishlist;
export const toggleWishList = toggleWishlist;