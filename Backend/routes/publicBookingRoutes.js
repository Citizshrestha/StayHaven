import express from 'express';
import { createBookingWithPayment, getBookingDetails, generateBookingConfirmationPDF } from '../controllers/publicBookingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { sanitizeAll } from '../middleware/sanitization.js';
import { bookingValidation } from '../middleware/validation.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = express.Router();

/**
 * Public booking routes
 * Note: Booking creation requires authentication, but confirmation access is public
 */

// Apply rate limiting to all public booking routes
router.use(apiLimiter);

// Apply sanitization to all routes
router.use(sanitizeAll());

// Create booking with payment (REQUIRES AUTHENTICATION + CSRF)
// POST /api/public/bookings/create-with-payment
router.post('/create-with-payment', protect, csrfProtection, bookingValidation.create, createBookingWithPayment);

// Get booking details by ID (for confirmation page - PUBLIC)
// GET /api/public/bookings/:bookingId
router.get('/:bookingId', getBookingDetails);

// Download booking confirmation PDF (PUBLIC)
// GET /api/public/bookings/:bookingId/confirmation-pdf
router.get('/:bookingId/confirmation-pdf', generateBookingConfirmationPDF);

export default router;
