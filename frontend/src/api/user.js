import axiosClient from "../axiosClient";

// Standard names
export const getWishlist = async () => {
  const { data } = await axiosClient.get("/api/user/wishlist");
  return data;
};

export const toggleWishlist = async (hotelId) => {
  const { data } = await axiosClient.post(`/api/user/wishlist/${hotelId}`);
  return data;
};

export const getCart = async () => {
  const { data } = await axiosClient.get("/api/user/cart");
  return data;
};

export const addToCart = async (hotelId, quantity = 1) => {
  const { data } = await axiosClient.post(`/api/user/cart`, { hotelId, quantity });
  return data;
};

export const removeFromCart = async (hotelId) => {
  const { data } = await axiosClient.delete(`/api/user/cart/${hotelId}`);
  return data;
};

export const clearCart = async () => {
  const { data } = await axiosClient.delete(`/api/user/cart`);
  return data;
};

export const getWishList = getWishlist;
export const toggleWishList = toggleWishlist;