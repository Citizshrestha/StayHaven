import { create, find, findByIdAndUpdate } from '../models/notification.schema';

// Create new notification
export async function createNotification(req, res) {
  try {
    const notification = await create(req.body);
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get all notifications for a user
export async function getUserNotifications(req, res) {
  try {
    const notifications = await find({ recipient: req.params.userId })
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
    const notification = await findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
