import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { bookingLimiter, batchLimiter } from '../middleware/rateLimiter.js';
import { sanitizeAll } from '../middleware/sanitization.js';
import {
  createNewBooking,
  batchCreateBookings,
  checkInWalkInGuest,
  expressCheckOut,
  changeGuestRoom,
  getBookingById,
  getHotelBookings,
  getAvailableRooms,
  modifyBooking,
  cancelBooking,
  requestRefund
} from '../controllers/bookingController.js';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// All booking routes require authentication
router.use(protect);

// ============================================
// RECEPTION/ADMIN ONLY ROUTES (POST/PATCH operations)
// ============================================

// Create a new booking
router.post('/new', bookingLimiter, authorize('receptionist', 'owner', 'admin', 'manager'), createNewBooking);

// Batch create multiple bookings atomically with conflict detection
router.post('/batch', batchLimiter, authorize('receptionist', 'owner', 'admin', 'manager'), batchCreateBookings);

// Check in walk-in guest
router.post('/walk-in/check-in', bookingLimiter, authorize('receptionist', 'owner', 'admin', 'manager'), checkInWalkInGuest);

// Express check-out
router.post('/check-out/express', bookingLimiter, authorize('receptionist', 'owner', 'admin', 'manager'), expressCheckOut);

// Change guest room
router.post('/room-change', bookingLimiter, authorize('receptionist', 'owner', 'admin', 'manager'), changeGuestRoom);

// ============================================
// GUEST BOOKING MANAGEMENT (guests can modify/cancel their own bookings)
// ============================================

// Modify booking (change dates/guests) - guests and staff
router.patch('/:id/modify', bookingLimiter, modifyBooking);

// Cancel booking - guests and staff
router.post('/:id/cancel', bookingLimiter, cancelBooking);

// Request refund - guests only
router.post('/:id/refund', bookingLimiter, requestRefund);

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
