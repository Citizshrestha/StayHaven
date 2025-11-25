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
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllHotels);
router.get('/:id', getHotelById);

// Protected routes - Hotel Owners
router.post('/', protect, authorize('owner', 'admin'), createHotel);
router.get('/owner/my-hotels', protect, authorize('owner', 'admin'), getMyHotels);
router.put('/:id', protect, authorize('owner', 'admin'), updateHotel);
router.delete('/:id', protect, authorize('owner', 'admin'), deleteHotel);
router.get('/:id/statistics', protect, authorize('owner', 'admin'), getHotelStatistics);

// Admin only routes
router.patch('/:id/status', protect, authorize('admin'), updateHotelStatus);
router.patch('/:id/featured', protect, authorize('admin'), toggleFeatured);

export default router;
