import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { writeOperationLimiter } from '../middleware/rateLimiter.js';
import { sanitizeAll } from '../middleware/sanitization.js';
import { addToCart, clearCart, getCart, getWishList, removeFromCart, toggleWishList, updateCart } from '../controllers/userController.js';
import { deleteUser, getAdminUsers, getUserById, resetUserPassword, updateUser, updateUserStatus } from '../controllers/adminController.js';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

router.use(protect);

// Admin user management routes
router.get("/admin/all", authorize("admin"), getAdminUsers);
router.get("/admin/:id", authorize("admin"), getUserById);
router.patch("/admin/:id", authorize("admin"), writeOperationLimiter, updateUser);
router.put("/admin/:id/status", authorize("admin"), writeOperationLimiter, updateUserStatus);
router.post("/admin/:id/reset-password", authorize("admin"), writeOperationLimiter, resetUserPassword);
router.delete("/admin/:id", authorize("admin"), writeOperationLimiter, deleteUser);

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