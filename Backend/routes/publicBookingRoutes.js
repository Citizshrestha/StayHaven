import express from 'express';
import { createBookingWithPayment } from '../controllers/publicBookingController.js';

const router = express.Router();

/**
 * Public booking routes - no authentication required
 * These endpoints are used by the public-facing hotel booking website
 */

// Create booking with payment
// POST /api/public/bookings/create-with-payment
router.post('/create-with-payment', createBookingWithPayment);

export default router;
