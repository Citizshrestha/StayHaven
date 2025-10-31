import { User } from "../models/user.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getWishList = asyncHandler(async (req, res) => {
  res.status(200).json({
    wishlist: req.user.wishlist || [],
    success: true,
    message: "Wishlist fetched successfully",
  });
});

export const toggleWishList = asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const user = await User.findById(req.user._id);
    const exists = user.wishlist.includes(hotelId);
  
    user.wishlist = exists
      ? user.wishlist.filter((id) => id !== hotelId) // remove if exists
      : [...user.wishlist, hotelId];                 // add if not exists
  
    await user.save();
  
    res.status(200).json({
      success: true,
      wishlist: user.wishlist,
      message: exists ? "Removed from wishlist" : "Added to wishlist",
    });
});

export const getCart = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    cart: req.user.cart || [],
    message: "Cart Fetched Successfully",
  });
});

export const addToCart = asyncHandler(async (req, res) => {
  const { hotelId, quantity = 1 } = req.body;
  const user = await User.findById(req.user._id);
  const existing = user.cart.find((item) => item.hotelId === hotelId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    user.cart.push({ hotelId, quantity });
  }

  await user.save();

  res.status(200).json({
    success: true,
    cart: user.cart,
    message: "Item added to cart successfully",
  });
});

export const updateCart = asyncHandler(async (req, res) => {
  const { hotelId, quantity } = req.body;
  const user = await User.findById(req.user._id);
  const item = user.cart.find((item) => item.hotelId === hotelId);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Item Not Found in Cart",
    });
  }

  if (quantity <= 0) {
    user.cart = user.cart.filter((i) => i.hotelId !== hotelId);
  } else {
    item.quantity = quantity;
  }

  await user.save();

  res.status(200).json({
    success: true,
    cart: user.cart,
    message: "Cart updated successfully",
  });
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const user = await User.findById(req.user._id);

  user.cart = user.cart.filter((item) => item.id !== hotelId);
  await user.save();

  res.status(201).json({
    success: true,
    message: "Hotel Removed Successfully",
    cart: user.cart,
  });
});

export const clearCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  user.cart = [];
  await user.save();

  res.status(200).json({
    success: true,
    message: "Cart Cleared Successfully",
    cart: user.cart || [],
  });
});
