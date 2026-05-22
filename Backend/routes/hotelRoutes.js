import express from 'express';
import {
  createHotel,
  getAllHotels,
  getHotelById,
  getMyHotels,
  updateHotel,
  deleteHotel,
  getHotelStatistics,
  updateHotelStatus,
  toggleFeatured,
} from '../controllers/hotelController.js';
import { getAdminHotels } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { writeOperationLimiter } from '../middleware/rateLimiter.js';
import { sanitizeAll } from '../middleware/sanitization.js';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// Public routes
router.get('/', getAllHotels);
router.get('/admin/all', protect, authorize('admin'), getAdminHotels);
router.get('/:id', getHotelById);

// Protected routes - Hotel Owners
router.post('/', protect, authorize('owner', 'admin'), writeOperationLimiter, createHotel);
router.get('/owner/my-hotels', protect, authorize('owner', 'admin'), getMyHotels);
router.put('/:id', protect, authorize('owner', 'admin'), writeOperationLimiter, updateHotel);
router.delete('/:id', protect, authorize('owner', 'admin'), writeOperationLimiter, deleteHotel);
router.get('/:id/statistics', protect, authorize('owner', 'admin'), getHotelStatistics);

// Admin only routes
router.patch('/:id/status', protect, authorize('admin'), writeOperationLimiter, updateHotelStatus);
router.patch('/:id/featured', protect, authorize('admin'), writeOperationLimiter, toggleFeatured);

export default router;
