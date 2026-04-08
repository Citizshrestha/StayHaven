import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createNewBooking,
  batchCreateBookings,
  checkInWalkInGuest,
  expressCheckOut,
  changeGuestRoom,
  getBookingById,
  getHotelBookings,
  getAvailableRooms
} from '../controllers/bookingController.js';

const router = express.Router();

// All booking routes require authentication
router.use(protect);

// ============================================
// RECEPTION/ADMIN ONLY ROUTES (POST/PATCH operations)
// ============================================

// Create a new booking
router.post('/new', authorize('receptionist', 'owner', 'admin', 'manager'), createNewBooking);

// Batch create multiple bookings atomically with conflict detection
router.post('/batch', authorize('receptionist', 'owner', 'admin', 'manager'), batchCreateBookings);

// Check in walk-in guest
router.post('/walk-in/check-in', authorize('receptionist', 'owner', 'admin', 'manager'), checkInWalkInGuest);

// Express check-out
router.post('/check-out/express', authorize('receptionist', 'owner', 'admin', 'manager'), expressCheckOut);

// Change guest room
router.post('/room-change', authorize('receptionist', 'owner', 'admin', 'manager'), changeGuestRoom);

// ============================================
// GET ROUTES (must come after POST routes to avoid conflicts)
// ============================================

// Get available rooms for a hotel (with date filtering)
router.get('/available/rooms/:hotelId', getAvailableRooms);

// Get all bookings for a hotel
router.get('/hotel/:hotelId', authorize('receptionist', 'owner', 'admin', 'manager'), getHotelBookings);

// Get single booking details (must be last to avoid matching other routes)
router.get('/:id', getBookingById);

export default router;
