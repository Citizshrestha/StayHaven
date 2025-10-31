import express from 'express';
import {protect} from '../middleware/authMiddleware.js';
import { addToCart, clearCart, getCart, getWishList, removeFromCart, toggleWishList, updateCart } from '../controllers/userController.js';

const router = express.Router();

router.use(protect);

// wishList Routes
router.get("/wishlist", getWishList);
router.post("/wishlist/:hotelId", toggleWishList);

//cart
router.get("/cart", getCart);
router.post("/cart", addToCart);
router.patch("/cart/:hotelId", updateCart);
router.delete("/cart/:hotelId",removeFromCart);
router.delete("/cart", clearCart);

export default router;