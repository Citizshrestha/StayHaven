import express from 'express';
import {
  handleKhaltiCallback,
  handleEsewaCallback,
  verifyPaymentStatus,
} from '../controllers/webhookController.js';
import { sanitizeQuery, sanitizeParams } from '../middleware/sanitization.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * Payment Gateway Webhooks
 * These endpoints handle payment verification after user returns from payment gateway
 *
 * Security measures:
 * - Rate limiting to prevent abuse
 * - Input sanitization on all parameters
 * - Signature verification in controllers (Khalti/eSewa specific)
 */

// Apply rate limiting to prevent webhook abuse
router.use(apiLimiter);

// Apply sanitization to query params and URL params
router.use(sanitizeQuery);
router.use(sanitizeParams);

// Khalti payment verification
// Called after user completes payment on Khalti and returns to our site
router.get('/khalti/verify', handleKhaltiCallback);

// eSewa payment verification
// Called after user completes payment on eSewa and returns to our site
router.get('/esewa/verify', handleEsewaCallback);

// Generic payment status check (for polling)
router.get('/payment/:bookingId/status', verifyPaymentStatus);

export default router;
