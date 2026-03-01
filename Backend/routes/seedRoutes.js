import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  seedRoomsForHotel,
  seedAllRooms,
  clearHotelRooms,
  createTestStaff,
} from '../controllers/seedController.js';

const router = express.Router();

// ============================================
// PUBLIC DEV ROUTE (no auth needed)
// Creates a test receptionist account
// Blocked automatically in NODE_ENV=production
// ============================================
router.post('/test-staff', createTestStaff);

// All other seed routes require authentication and admin/owner authorization
router.use(protect);
router.use(authorize('admin', 'owner'));

// ============================================
// SEED ROUTES (for testing only)
// ============================================

// Seed rooms for a specific hotel
router.post('/rooms/:hotelId', seedRoomsForHotel);

// Seed all rooms for all hotels
router.post('/all-rooms', seedAllRooms);

// Delete all rooms from a hotel (for testing)
router.delete('/rooms/:hotelId', clearHotelRooms);

export default router;
