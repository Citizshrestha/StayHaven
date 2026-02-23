import { Message } from "../models/message.schema.js";
import { User } from "../models/user.schema.js";
import { Notification } from "../models/notification.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../config/socket.js";

/**
 * Send a message (text, alert, or call request)
 * POST /api/staff/messages
 */
export const sendMessage = asyncHandler(async (req, res) => {
    const { channel, recipientId, content, messageType, roomNumber } = req.body;

    if (!content || !channel) {
        return res.status(400).json({
            success: false,
            message: "Content and channel are required",
        });
    }

    // Get sender's hotel from assigned properties
    const hotelId =
        req.body.hotelId ||
        (req.user.assignedProperties && req.user.assignedProperties[0]?._id) ||
        req.user.assignedProperties?.[0];

    if (!hotelId) {
        return res.status(400).json({
            success: false,
            message: "No hotel context found",
        });
    }

    const message = await Message.create({
        hotel: hotelId,
        sender: req.user._id,
        recipient: recipientId || null,
        channel,
        content: content.trim(),
        messageType: messageType || "text",
        roomNumber: roomNumber || null,
    });

    // Populate sender info for the response
    await message.populate("sender", "fullname companyRole profilePicture");
    if (message.recipient) {
        await message.populate("recipient", "fullname companyRole profilePicture");
    }

    const io = getIO();
    if (io) {
        const payload = {
            _id: message._id,
            sender: {
                _id: message.sender._id,
                fullname: message.sender.fullname,
                role: message.sender.companyRole,
                profilePicture: message.sender.profilePicture,
            },
            channel: message.channel,
            content: message.content,
            messageType: message.messageType,
            roomNumber: message.roomNumber,
            createdAt: message.createdAt,
        };

        // Broadcast to appropriate room based on channel
        switch (channel) {
            case "waiter":
                io.to(`hotel-${hotelId}-waiters`).emit("new-message", payload);
                io.to(`hotel-${hotelId}-receptionists`).emit("new-message", payload);
                break;
            case "chef":
                io.to(`hotel-${hotelId}-chiefs`).emit("new-message", payload);
                io.to(`hotel-${hotelId}-receptionists`).emit("new-message", payload);
                break;
            case "guest":
                // For guest channel, broadcast to receptionists and the specific guest if connected
                io.to(`hotel-${hotelId}-receptionists`).emit("new-message", payload);
                if (recipientId) {
                    io.to(`user-${recipientId}`).emit("new-message", payload);
                }
                break;
            case "all":
                io.to(`hotel-${hotelId}`).emit("new-message", payload);
                break;
            case "direct":
                if (recipientId) {
                    io.to(`user-${recipientId}`).emit("new-message", payload);
                }
                // Also send to sender's personal room so other devices get it
                io.to(`user-${req.user._id}`).emit("new-message", payload);
                break;
            default:
                io.to(`hotel-${hotelId}`).emit("new-message", payload);
        }
    }

    return res.status(201).json({
        success: true,
        message: "Message sent",
        data: message,
    });
});

/**
 * Get messages for a channel
 * GET /api/staff/messages?channel=waiter&limit=50&before=<timestamp>
 */
export const getMessages = asyncHandler(async (req, res) => {
    const { channel, recipientId, limit = 50, before } = req.query;

    const hotelId =
        req.query.hotelId ||
        (req.user.assignedProperties && req.user.assignedProperties[0]?._id) ||
        req.user.assignedProperties?.[0];

    if (!hotelId) {
        return res.status(400).json({
            success: false,
            message: "No hotel context found",
        });
    }

    const query = { hotel: hotelId };

    if (channel && channel !== "all") {
        if (channel === "direct" && recipientId) {
            // Direct messages between two users
            query.$or = [
                { sender: req.user._id, recipient: recipientId, channel: "direct" },
                { sender: recipientId, recipient: req.user._id, channel: "direct" },
            ];
        } else {
            query.channel = channel;
        }
    }

    if (before) {
        query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
        .populate("sender", "fullname companyRole profilePicture")
        .populate("recipient", "fullname companyRole profilePicture")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

    // Return in chronological order
    messages.reverse();

    return res.status(200).json({
        success: true,
        count: messages.length,
        data: messages,
    });
});

/**
 * Mark messages as read
 * PUT /api/staff/messages/read
 */
export const markMessagesRead = asyncHandler(async (req, res) => {
    const { messageIds, channel } = req.body;

    const hotelId =
        req.body.hotelId ||
        (req.user.assignedProperties && req.user.assignedProperties[0]?._id) ||
        req.user.assignedProperties?.[0];

    let query = { hotel: hotelId, isRead: false };

    if (messageIds && messageIds.length > 0) {
        query._id = { $in: messageIds };
    } else if (channel) {
        query.channel = channel;
        query.sender = { $ne: req.user._id }; // Don't mark own messages
    }

    const result = await Message.updateMany(query, {
        $set: { isRead: true, readAt: new Date() },
    });

    return res.status(200).json({
        success: true,
        modifiedCount: result.modifiedCount,
    });
});

/**
 * Initiate a call request
 * POST /api/staff/messages/call
 */
export const initiateCall = asyncHandler(async (req, res) => {
    const { recipientId, channel, roomNumber } = req.body;

    const hotelId =
        req.body.hotelId ||
        (req.user.assignedProperties && req.user.assignedProperties[0]?._id) ||
        req.user.assignedProperties?.[0];

    if (!hotelId) {
        return res.status(400).json({
            success: false,
            message: "No hotel context found",
        });
    }

    // Create call message
    const callMessage = await Message.create({
        hotel: hotelId,
        sender: req.user._id,
        recipient: recipientId || null,
        channel: channel || "direct",
        content: `📞 Call initiated`,
        messageType: "call_request",
        callStatus: "ringing",
        roomNumber: roomNumber || null,
    });

    await callMessage.populate("sender", "fullname companyRole profilePicture");

    const io = getIO();
    if (io) {
        const payload = {
            _id: callMessage._id,
            sender: {
                _id: callMessage.sender._id,
                fullname: callMessage.sender.fullname,
                role: callMessage.sender.companyRole,
            },
            channel: callMessage.channel,
            messageType: "call_request",
            callStatus: "ringing",
            roomNumber: callMessage.roomNumber,
            createdAt: callMessage.createdAt,
        };

        // Emit to target
        if (recipientId) {
            io.to(`user-${recipientId}`).emit("incoming-call", payload);
        } else if (channel) {
            const roomName =
                channel === "waiter"
                    ? `hotel-${hotelId}-waiters`
                    : channel === "chef"
                        ? `hotel-${hotelId}-chiefs`
                        : `hotel-${hotelId}-${channel}s`;
            io.to(roomName).emit("incoming-call", payload);
        }
    }

    return res.status(201).json({
        success: true,
        message: "Call initiated",
        data: callMessage,
    });
});

/**
 * Update call status (answer, decline, end)
 * PUT /api/staff/messages/call/:callId
 */
export const updateCallStatus = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    const { callStatus, callDuration } = req.body;

    const callMessage = await Message.findById(callId);
    if (!callMessage) {
        return res.status(404).json({
            success: false,
            message: "Call not found",
        });
    }

    callMessage.callStatus = callStatus;
    if (callDuration) callMessage.callDuration = callDuration;
    await callMessage.save();

    const io = getIO();
    if (io) {
        const payload = {
            _id: callMessage._id,
            callStatus,
            callDuration: callMessage.callDuration,
        };

        // Notify both parties
        io.to(`user-${callMessage.sender}`).emit("call-status-update", payload);
        if (callMessage.recipient) {
            io.to(`user-${callMessage.recipient}`).emit(
                "call-status-update",
                payload
            );
        }
    }

    return res.status(200).json({
        success: true,
        data: callMessage,
    });
});

/**
 * Get staff members available for messaging
 * GET /api/staff/messages/contacts
 */
export const getContacts = asyncHandler(async (req, res) => {
    const hotelId =
        req.query.hotelId ||
        (req.user.assignedProperties && req.user.assignedProperties[0]?._id) ||
        req.user.assignedProperties?.[0];

    if (!hotelId) {
        return res.status(400).json({
            success: false,
            message: "No hotel context found",
        });
    }

    // Find all active staff in the same hotel
    const contacts = await User.find({
        assignedProperties: hotelId,
        isActive: true,
        _id: { $ne: req.user._id },
    })
        .select("fullname email companyRole profilePicture contact")
        .sort({ companyRole: 1, fullname: 1 });

    // Group by role
    const grouped = {
        waiters: [],
        chefs: [],
        receptionists: [],
        managers: [],
        other: [],
    };

    contacts.forEach((c) => {
        const role = c.companyRole || "other";
        if (role === "waiter") grouped.waiters.push(c);
        else if (role === "chief") grouped.chefs.push(c);
        else if (role === "receptionist") grouped.receptionists.push(c);
        else if (role === "manager") grouped.managers.push(c);
        else grouped.other.push(c);
    });

    return res.status(200).json({
        success: true,
        count: contacts.length,
        contacts: grouped,
    });
});
