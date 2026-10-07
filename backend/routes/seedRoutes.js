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
import { seedHotelAdminData } from '../controllers/seedHotelAdminData.js';
import { assertHotelAccess } from '../controllers/hotelAdminAccess.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Roles allowed to seed / clear a single hotel's sample data
const SEED_ROLES = ['owner', 'hoteladmin', 'admin'];

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
router.use(authorize('admin', 'owner', 'hoteladmin', 'superadmin'));

// Hotel data seeding can wipe or overwrite real records: never in production.
const blockInProduction = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Seeding is disabled in production.' });
  }
  next();
};

// The caller must administer the hotel in :hotelId (same company / assigned).
const requireHotelAdminOf = asyncHandler(async (req, res, next) => {
  await assertHotelAccess(req, req.params.hotelId, { roles: SEED_ROLES });
  next();
});

// ============================================
// SEED ROUTES (for testing only)
// ============================================

// Seed superadmin dashboard data (requires superadmin role)
router.post('/superadmin-data', authorize('superadmin'), batchLimiter, seedSuperadminData);
router.post('/finance-data', authorize('superadmin'), batchLimiter, seedFinanceData);
router.post('/review-data', authorize('superadmin'), batchLimiter, seedReviewData);

// Seed hotel admin dashboard data (requires owner/admin for specific hotel)
router.post('/hotel-admin-data/:hotelId', blockInProduction, requireHotelAdminOf, batchLimiter, seedHotelAdminData);

// Seed rooms for a specific hotel
router.post('/rooms/:hotelId', blockInProduction, requireHotelAdminOf, batchLimiter, seedRoomsForHotel);

// Seed all rooms for all hotels (platform-wide: superadmin only)
router.post('/all-rooms', blockInProduction, authorize('superadmin'), batchLimiter, seedAllRooms);

// Seed featured hotels from existing hotels (published, active)
// Optional query param: ?limit=6 (max 12, default 6)
router.post('/featured-hotels', authorize('superadmin'), batchLimiter, seedFeaturedHotels);

// Delete all rooms from a hotel (for testing)
router.delete('/rooms/:hotelId', blockInProduction, requireHotelAdminOf, writeOperationLimiter, clearHotelRooms);

export default router;
