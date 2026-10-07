import { Notification } from "../models/notification.schema.js";
import { Role } from "../models/role.schema.js";
import { User } from "../models/user.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../config/socket.js";

/**
 * Get notifications for the current user
 * GET /api/staff/notifications?limit=20&unreadOnly=false
 */
export const getNotifications = asyncHandler(async (req, res) => {
    const { limit = 20, unreadOnly = "false", type } = req.query;

    const query = { user: req.user._id };

    if (unreadOnly === "true") {
        query.isRead = false;
    }

    if (type) {
        query.type = type;
    }

    const notifications = await Notification.find(query)
        .populate("sender", "fullname profilePicture companyRole")
        .sort({ createdAt: -1 })
        .limit(Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100));

    const unreadCount = await Notification.countDocuments({
        user: req.user._id,
        isRead: false,
    });

    return res.status(200).json({
        success: true,
        count: notifications.length,
        unreadCount,
        data: notifications,
    });
});

/**
 * Mark notification(s) as read
 * PUT /api/staff/notifications/read
 */
export const markNotificationsRead = asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;

    let query = { user: req.user._id };

    if (notificationIds !== undefined && !Array.isArray(notificationIds)) {
        return res.status(400).json({ success: false, message: "notificationIds must be an array" });
    }
    if (notificationIds && notificationIds.length > 0) {
        query._id = { $in: notificationIds.filter((id) => typeof id === "string").slice(0, 200) };
    }

    const result = await Notification.updateMany(query, {
        $set: { isRead: true, readAt: new Date() },
    });

    return res.status(200).json({
        success: true,
        modifiedCount: result.modifiedCount,
    });
});

/**
 * Get unread notification count
 * GET /api/staff/notifications/count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        user: req.user._id,
        isRead: false,
    });

    return res.status(200).json({
        success: true,
        unreadCount: count,
    });
});

/**
 * Create a notification (internal helper, also usable as API)
 * POST /api/staff/notifications
 */
export const createNotification = asyncHandler(async (req, res) => {
    const { userId, type, title, message, priority, actionUrl, payload } =
        req.body;

    if (!userId || !type || !title || !message) {
        return res.status(400).json({
            success: false,
            message: "userId, type, title, and message are required",
        });
    }

    const notification = await Notification.create({
        user: userId,
        sender: req.user._id,
        type,
        title,
        message,
        priority: priority || "medium",
        actionUrl,
        payload,
    });

    // Push real-time notification via Socket.io
    const io = getIO();
    if (io) {
        io.to(`user-${userId}`).emit("notification", {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            actionUrl: notification.actionUrl,
            payload: notification.payload,
            createdAt: notification.createdAt,
        });
    }

    return res.status(201).json({
        success: true,
        data: notification,
    });
});

/**
 * Helper: Create notification without HTTP context (for use inside other controllers)
 */
export const createNotificationInternal = async ({
    userId,
    senderId,
    type,
    title,
    message,
    priority = "medium",
    actionUrl,
    payload,
}) => {
    try {
        const notification = await Notification.create({
            user: userId,
            sender: senderId || null,
            type,
            title,
            message,
            priority,
            actionUrl,
            payload,
        });

        const io = getIO();
        if (io) {
            io.to(`user-${userId}`).emit("notification", {
                _id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                priority: notification.priority,
                actionUrl: notification.actionUrl,
                payload: notification.payload,
                createdAt: notification.createdAt,
            });
        }

        return notification;
    } catch (err) {
        console.error("Failed to create notification:", err.message);
        return null;
    }
};

/**
 * Helper: notify every superadmin about a platform-level event.
 * Superadmins have no hotel scope, so they only receive events fanned out here.
 */
export const notifySuperadmins = async ({ type, title, message, priority = "medium", actionUrl, payload, senderId }) => {
    try {
        const superadminRole = await Role.findOne({ name: "superadmin" }).select("_id");
        if (!superadminRole) return [];

        const superadmins = await User.find({ role: superadminRole._id, isActive: true }).select("_id");

        return Promise.all(
            superadmins.map((admin) =>
                createNotificationInternal({
                    userId: admin._id,
                    senderId,
                    type,
                    title,
                    message,
                    priority,
                    actionUrl,
                    payload,
                })
            )
        );
    } catch (err) {
        console.error("Failed to notify superadmins:", err.message);
        return [];
    }
};

