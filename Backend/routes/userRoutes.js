import express from 'express';
import {protect} from '../middleware/authMiddleware.js';
import { writeOperationLimiter } from '../middleware/rateLimiter.js';
import { sanitizeAll } from '../middleware/sanitization.js';
import { addToCart, clearCart, getCart, getWishList, removeFromCart, toggleWishList, updateCart } from '../controllers/userController.js';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

router.use(protect);

// wishList Routes
router.get("/wishlist", getWishList);
router.post("/wishlist/:hotelId", writeOperationLimiter, toggleWishList);

//cart
router.get("/cart", getCart);
router.post("/cart", writeOperationLimiter, addToCart);
router.patch("/cart/:hotelId", writeOperationLimiter, updateCart);
router.delete("/cart/:hotelId", writeOperationLimiter, removeFromCart);
router.delete("/cart", writeOperationLimiter, clearCart);

export default router;