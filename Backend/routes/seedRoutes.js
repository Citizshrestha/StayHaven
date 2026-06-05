import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { writeOperationLimiter, batchLimiter } from '../middleware/rateLimiter.js';
import { sanitizeAll } from '../middleware/sanitization.js';
import {
  seedRoomsForHotel,
  seedAllRooms,
  clearHotelRooms,
  createTestStaff,
  createTestHotelAdmin,
  seedFeaturedHotels,
} from '../controllers/seedController.js';
import { seedSuperadminData } from '../controllers/seedSuperadminData.js';
import { seedFinanceData } from '../controllers/seedFinanceData.js';
import { seedReviewData } from '../controllers/seedReviewData.js';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// ============================================
// PUBLIC DEV ROUTE (no auth needed)
// Creates a test receptionist account
// Blocked automatically in NODE_ENV=production
// ============================================
router.post('/test-staff', writeOperationLimiter, createTestStaff);
router.post('/test-hotel-admin', writeOperationLimiter, createTestHotelAdmin);

// All other seed routes require authentication and admin/owner authorization
router.use(protect);
router.use(authorize('admin', 'owner', 'superadmin'));

// ============================================
// SEED ROUTES (for testing only)
// ============================================

// Seed superadmin dashboard data (requires superadmin role)
router.post('/superadmin-data', authorize('superadmin'), batchLimiter, seedSuperadminData);
router.post('/finance-data', authorize('superadmin'), batchLimiter, seedFinanceData);
router.post('/review-data', authorize('superadmin'), batchLimiter, seedReviewData);

// Seed rooms for a specific hotel
router.post('/rooms/:hotelId', batchLimiter, seedRoomsForHotel);

// Seed all rooms for all hotels
router.post('/all-rooms', batchLimiter, seedAllRooms);

// Seed featured hotels from existing hotels (published, active)
// Optional query param: ?limit=6 (max 12, default 6)
router.post('/featured-hotels', batchLimiter, seedFeaturedHotels);

// Delete all rooms from a hotel (for testing)
router.delete('/rooms/:hotelId', writeOperationLimiter, clearHotelRooms);

export default router;
