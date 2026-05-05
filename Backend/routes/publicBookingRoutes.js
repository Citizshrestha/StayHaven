import express from 'express';
import { createBookingWithPayment, getBookingDetails, generateBookingConfirmationPDF } from '../controllers/publicBookingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Public booking routes
 * Note: Booking creation requires authentication, but confirmation access is public
 */

// Create booking with payment (REQUIRES AUTHENTICATION)
// POST /api/public/bookings/create-with-payment
router.post('/create-with-payment', protect, createBookingWithPayment);

// Get booking details by ID (for confirmation page - PUBLIC)
// GET /api/public/bookings/:bookingId
router.get('/:bookingId', getBookingDetails);

// Download booking confirmation PDF (PUBLIC)
// GET /api/public/bookings/:bookingId/confirmation-pdf
router.get('/:bookingId/confirmation-pdf', generateBookingConfirmationPDF);

export default router;
