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
  getHotelAvailability,
  getHotelReviews,
  getBankTransferDetails,
} from '../controllers/hotelController.js';
import { createAdminHotel, getAdminHotelById, getAdminHotels, getAdminHotelStats } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { writeOperationLimiter } from '../middleware/rateLimiter.js';
import { sanitizeAll } from '../middleware/sanitization.js';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// Public routes
router.get('/', getAllHotels);
router.get('/admin/all', protect, authorize('admin'), getAdminHotels);
router.get('/admin/stats', protect, authorize('admin'), getAdminHotelStats);
router.post('/admin', protect, authorize('admin'), writeOperationLimiter, createAdminHotel);
router.get('/admin/:id', protect, authorize('admin'), getAdminHotelById);
router.get('/:id', getHotelById);
router.get('/:id/availability', getHotelAvailability);
router.get('/:id/reviews', getHotelReviews);
// Bank transfer instructions are shown only to a signed-in guest who is paying
router.get('/:id/bank-transfer-details', protect, getBankTransferDetails);

// Protected routes - Hotel Owners
router.post('/', protect, authorize('owner', 'admin'), writeOperationLimiter, createHotel);
router.get('/owner/my-hotels', protect, authorize('owner', 'admin'), getMyHotels);
router.put('/:id', protect, authorize('owner', 'admin'), writeOperationLimiter, updateHotel);
router.delete('/:id', protect, authorize('owner', 'admin'), writeOperationLimiter, deleteHotel);
router.get('/:id/statistics', protect, authorize('owner', 'admin'), getHotelStatistics);

// Admin only routes
// Platform moderation is superadmin-only: `admin` is a company-level role and
// must not approve, reject or feature another company's hotel (REQ-superadmin-1).
router.patch('/:id/status', protect, authorize('superadmin'), writeOperationLimiter, updateHotelStatus);
router.patch('/:id/approve', protect, authorize('superadmin'), writeOperationLimiter, (req, res, next) => {
  req.body.status = 'approved';
  return updateHotelStatus(req, res, next);
});
router.patch('/:id/reject', protect, authorize('superadmin'), writeOperationLimiter, (req, res, next) => {
  req.body.status = 'rejected';
  return updateHotelStatus(req, res, next);
});
router.patch('/:id/featured', protect, authorize('superadmin'), writeOperationLimiter, toggleFeatured);

export default router;
