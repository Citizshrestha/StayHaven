import { Notification } from '../models/notification.schema.js';

// Create new notification
export async function createNotification(req, res) {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get all notifications for a user
export async function getUserNotifications(req, res) {
  try {
    const notifications = await Notification.find({ user: req.params.userId })
      .populate('sender', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Mark notification as read
export async function markAsRead(req, res) {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
