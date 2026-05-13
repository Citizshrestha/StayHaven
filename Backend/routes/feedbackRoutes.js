import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { apiLimiter, writeOperationLimiter } from '../middleware/rateLimiter.js';
import { sanitizeAll } from '../middleware/sanitization.js';
import {
  submitFeedback,
  getAllFeedback,
  updateFeedbackStatus,
} from '../controllers/feedbackController.js';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// PUBLIC ROUTE - Submit feedback (rate limited)
router.post('/', apiLimiter, submitFeedback);

// ADMIN ROUTES - Manage feedback
router.get(
  '/',
  protect,
  authorize('admin', 'owner', 'manager'),
  getAllFeedback
);

router.patch(
  '/:id/status',
  protect,
  authorize('admin', 'owner', 'manager'),
  writeOperationLimiter,
  updateFeedbackStatus
);

export default router;
