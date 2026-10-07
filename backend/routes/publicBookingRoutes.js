import express from 'express';
import { createBookingWithPayment, getBookingDetails, generateBookingConfirmationPDF } from '../controllers/publicBookingController.js';
import { verifyStripeCardPayment } from '../controllers/webhookController.js';
import { protect } from '../middleware/authMiddleware.js';
import { sanitizeAll } from '../middleware/sanitization.js';
import { bookingValidation } from '../middleware/validation.js';
import { apiLimiter, paymentLimiter } from '../middleware/rateLimiter.js';
import { csrfProtection } from '../middleware/csrf.js';
import { createWalletBookingHandler, ownBooking } from '../controllers/walletPaymentController.js';
import { isWallet } from '../services/walletPaymentService.js';

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
router.post('/create-with-payment', protect, csrfProtection, paymentLimiter, bookingValidation.create, (req, res, next) =>
  isWallet(req.body.paymentMethod) ? createWalletBookingHandler(req, res, next) : createBookingWithPayment(req, res, next));

// Verify + finalize a card payment after Stripe confirms it client-side
// (REQUIRES AUTHENTICATION + CSRF — same trust level as booking creation)
// POST /api/public/bookings/verify-card-payment
router.post('/verify-card-payment', protect, csrfProtection, paymentLimiter, verifyStripeCardPayment);

// Get booking details by ID (for confirmation page - PUBLIC)
// GET /api/public/bookings/:bookingId
router.get('/:bookingId', protect, ownBooking, getBookingDetails);

// Download booking confirmation PDF (PUBLIC)
// GET /api/public/bookings/:bookingId/confirmation-pdf
router.get('/:bookingId/confirmation-pdf', protect, ownBooking, generateBookingConfirmationPDF);

export default router;
