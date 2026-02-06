import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createNotification, getUserNotifications, markAsRead } from '../controllers/notification.controller.js';

const router = express.Router();

// protect all notification routes - users must be authenticated
router.use(protect);

// Create a new notification (staff/admin may use this)
router.post('/', createNotification);

// Get all notifications for a specific user
router.get('/:userId', getUserNotifications);

// Mark a notification as read
router.patch('/:id/read', markAsRead);

export default router;
