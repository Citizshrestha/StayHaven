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

    // Get the messages before updating so we can notify senders
    const messagesToMark = await Message.find(query).select("sender _id");

    const result = await Message.updateMany(query, {
        $set: { isRead: true, readAt: new Date() },
    });

    // Emit real-time read receipts to senders so they see blue double-ticks
    const io = getIO();
    if (io && messagesToMark.length > 0) {
        const readIds = messagesToMark.map(m => m._id.toString());
        // Group by sender and notify each
        const senders = [...new Set(messagesToMark.map(m => m.sender.toString()))];
        senders.forEach(senderId => {
            if (senderId !== req.user._id.toString()) {
                io.to(`user-${senderId}`).emit("messages-read", {
                    messageIds: readIds,
                    readBy: req.user._id,
                    readAt: new Date(),
                });
            }
        });
    }

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
                profilePicture: callMessage.sender.profilePicture || null,
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

    const hotelId =
        req.body.hotelId ||
        (req.user.assignedProperties && req.user.assignedProperties[0]?._id) ||
        req.user.assignedProperties?.[0];

    // Query-scoped by hotel for security (prevent cross-hotel call status updates)
    const callMessage = await Message.findOne({
        _id: callId,
        hotel: hotelId
    });
    if (!callMessage) {
        return res.status(404).json({
            success: false,
            message: "Call not found or access denied",
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

/**
 * Delete a conversation (soft delete - marks messages as archived for this user)
 * DELETE /api/staff/messages/conversations/:partnerId
 */
export const deleteConversation = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
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

    // Mark all messages in this conversation as archived for this user
    const result = await Message.updateMany(
        {
            hotel: hotelId,
            channel: "direct",
            $or: [
                { sender: req.user._id, recipient: partnerId },
                { sender: partnerId, recipient: req.user._id },
            ],
        },
        {
            $addToSet: { archivedBy: req.user._id },
        }
    );

    return res.status(200).json({
        success: true,
        message: "Conversation deleted",
        modifiedCount: result.modifiedCount,
    });
});

/**
 * Archive a conversation
 * POST /api/staff/messages/conversations/:partnerId/archive
 */
export const archiveConversation = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
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

    const result = await Message.updateMany(
        {
            hotel: hotelId,
            channel: "direct",
            $or: [
                { sender: req.user._id, recipient: partnerId },
                { sender: partnerId, recipient: req.user._id },
            ],
        },
        {
            $addToSet: { archivedBy: req.user._id },
        }
    );

    return res.status(200).json({
        success: true,
        message: "Conversation archived",
        modifiedCount: result.modifiedCount,
    });
});

/**
 * Mute a conversation
 * POST /api/staff/messages/conversations/:partnerId/mute
 */
export const muteConversation = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
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

    const result = await Message.updateMany(
        {
            hotel: hotelId,
            channel: "direct",
            $or: [
                { sender: req.user._id, recipient: partnerId },
                { sender: partnerId, recipient: req.user._id },
            ],
        },
        {
            $addToSet: { mutedBy: req.user._id },
        }
    );

    return res.status(200).json({
        success: true,
        message: "Conversation muted",
        modifiedCount: result.modifiedCount,
    });
});

/**
 * Unmute a conversation
 * POST /api/staff/messages/conversations/:partnerId/unmute
 */
export const unmuteConversation = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
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

    const result = await Message.updateMany(
        {
            hotel: hotelId,
            channel: "direct",
            $or: [
                { sender: req.user._id, recipient: partnerId },
                { sender: partnerId, recipient: req.user._id },
            ],
        },
        {
            $pull: { mutedBy: req.user._id },
        }
    );

    return res.status(200).json({
        success: true,
        message: "Conversation unmuted",
        modifiedCount: result.modifiedCount,
    });
});

/**
 * Mark conversation as unread
 * POST /api/staff/messages/conversations/:partnerId/mark-unread
 */
export const markConversationUnread = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
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

    // Mark the most recent message from partner as unread
    const result = await Message.updateMany(
        {
            hotel: hotelId,
            channel: "direct",
            sender: partnerId,
            recipient: req.user._id,
        },
        {
            $set: { isRead: false, readAt: null },
        }
    );

    return res.status(200).json({
        success: true,
        message: "Conversation marked as unread",
        modifiedCount: result.modifiedCount,
    });
});

/**
 * Get recent conversations (latest message per unique conversation partner)
 * Also includes channel conversations the user is part of based on their role
 * GET /api/staff/messages/conversations
 */
export const getConversations = asyncHandler(async (req, res) => {
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

    const mongoose = (await import("mongoose")).default;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const hotelObjId = new mongoose.Types.ObjectId(hotelId);

    // 1) Direct message conversations
    const directConversations = await Message.aggregate([
        {
            $match: {
                hotel: hotelObjId,
                channel: "direct",
                messageType: { $in: ["text", "call_request"] },
                $or: [{ sender: userId }, { recipient: userId }],
                archivedBy: { $ne: userId }, // Exclude archived conversations
            },
        },
        { $sort: { createdAt: -1 } },
        {
            $addFields: {
                partner: {
                    $cond: {
                        if: { $eq: ["$sender", userId] },
                        then: "$recipient",
                        else: "$sender",
                    },
                },
            },
        },
        {
            $group: {
                _id: "$partner",
                lastMessage: { $first: "$$ROOT" },
                unreadCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ["$sender", userId] },
                                    { $eq: ["$isRead", false] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
        { $sort: { "lastMessage.createdAt": -1 } },
        { $limit: 30 },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "partnerInfo",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            email: 1,
                            companyRole: 1,
                            profilePicture: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "guests",
                localField: "_id",
                foreignField: "_id",
                as: "guestInfo",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            email: 1,
                            phone: 1,
                            avatarUrl: 1,
                            membershipTier: 1,
                        },
                    },
                ],
            },
        },
        { $unwind: { path: "$partnerInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$guestInfo", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                partner: {
                    _id: "$_id",
                    fullname: {
                        $cond: {
                            if: { $ifNull: ["$guestInfo.fullName", false] },
                            then: "$guestInfo.fullName",
                            else: "$partnerInfo.fullname"
                        }
                    },
                    email: {
                        $cond: {
                            if: { $ifNull: ["$guestInfo.email", false] },
                            then: "$guestInfo.email",
                            else: "$partnerInfo.email"
                        }
                    },
                    companyRole: {
                        $cond: {
                            if: { $ifNull: ["$guestInfo._id", false] },
                            then: "guest",
                            else: "$partnerInfo.companyRole"
                        }
                    },
                    profilePicture: {
                        $cond: {
                            if: { $ifNull: ["$guestInfo.avatarUrl", false] },
                            then: "$guestInfo.avatarUrl",
                            else: "$partnerInfo.profilePicture"
                        }
                    },
                },
                lastMessage: {
                    _id: "$lastMessage._id",
                    content: "$lastMessage.content",
                    messageType: "$lastMessage.messageType",
                    createdAt: "$lastMessage.createdAt",
                    senderId: "$lastMessage.sender",
                    isRead: "$lastMessage.isRead",
                },
                unreadCount: 1,
            },
        },
    ]);

    // 2) Channel conversations the user is part of based on their role
    // Determine which channels this user should see
    const userRole = req.user.companyRole || "";
    const relevantChannels = [];
    if (userRole === "waiter") relevantChannels.push("waiter");
    else if (userRole === "chief" || userRole === "kitchen") relevantChannels.push("chef");
    else if (userRole === "receptionist") relevantChannels.push("waiter", "chef", "guest");
    else if (userRole === "manager") relevantChannels.push("waiter", "chef", "guest");
    // All roles can see the "all" channel
    relevantChannels.push("all");

    let channelConversations = [];
    if (relevantChannels.length > 0) {
        channelConversations = await Message.aggregate([
            {
                $match: {
                    hotel: hotelObjId,
                    channel: { $in: relevantChannels },
                    messageType: { $in: ["text", "alert"] },
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$channel",
                    lastMessage: { $first: "$$ROOT" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ["$sender", userId] },
                                        { $eq: ["$isRead", false] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { "lastMessage.createdAt": -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "lastMessage.sender",
                    foreignField: "_id",
                    as: "senderInfo",
                    pipeline: [
                        {
                            $project: {
                                fullname: 1,
                                companyRole: 1,
                            },
                        },
                    ],
                },
            },
            { $unwind: { path: "$senderInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    isChannel: { $literal: true },
                    channel: "$_id",
                    partner: {
                        _id: "$_id",
                        fullname: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$_id", "waiter"] }, then: "🍽️ Waiters Channel" },
                                    { case: { $eq: ["$_id", "chef"] }, then: "👨‍🍳 Kitchen Channel" },
                                    { case: { $eq: ["$_id", "guest"] }, then: "🏨 Guest Channel" },
                                    { case: { $eq: ["$_id", "receptionist"] }, then: "🏨 Reception Channel" },
                                    { case: { $eq: ["$_id", "all"] }, then: "📢 Broadcast" },
                                ],
                                default: "$_id",
                            },
                        },
                        companyRole: "channel",
                    },
                    lastMessage: {
                        _id: "$lastMessage._id",
                        content: {
                            $concat: [
                                { $ifNull: ["$senderInfo.fullname", "Someone"] },
                                ": ",
                                "$lastMessage.content",
                            ],
                        },
                        messageType: "$lastMessage.messageType",
                        createdAt: "$lastMessage.createdAt",
                        senderId: "$lastMessage.sender",
                        isRead: "$lastMessage.isRead",
                    },
                    unreadCount: 1,
                },
            },
        ]);
    }

    // Combine and sort by last message time
    const allConversations = [...directConversations, ...channelConversations]
        .sort((a, b) => new Date(b.lastMessage?.createdAt) - new Date(a.lastMessage?.createdAt));

    return res.status(200).json({
        success: true,
        count: allConversations.length,
        data: allConversations,
    });
});

/**
 * Edit a message (only sender can edit within 15 minutes)
 * PUT /api/staff/messages/:messageId
 */
export const editMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: "Content is required",
        });
    }

    const hotelId =
        req.body.hotelId ||
        (req.user.assignedProperties && req.user.assignedProperties[0]?._id) ||
        req.user.assignedProperties?.[0];

    // Query-scoped by hotel for security (prevent cross-hotel message editing)
    const message = await Message.findOne({
        _id: messageId,
        hotel: hotelId
    });
    if (!message) {
        return res.status(404).json({
            success: false,
            message: "Message not found or access denied",
        });
    }

    // Only sender can edit their own message
    if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: "You can only edit your own messages",
        });
    }

    // Check if message is already deleted
    if (message.isDeleted) {
        return res.status(400).json({
            success: false,
            message: "Cannot edit a deleted message",
        });
    }

    // Check if message is within 15 minutes (900000 ms)
    const fifteenMinutes = 15 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > fifteenMinutes) {
        return res.status(400).json({
            success: false,
            message: "Messages can only be edited within 15 minutes",
        });
    }

    // Update message
    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Emit real-time update
    const io = getIO();
    if (io) {
        const payload = {
            _id: message._id,
            content: message.content,
            isEdited: true,
            editedAt: message.editedAt,
        };

        // Broadcast to appropriate room
        if (message.channel === "direct" && message.recipient) {
            io.to(`user-${message.recipient}`).emit("message-edited", payload);
            io.to(`user-${message.sender}`).emit("message-edited", payload);
        } else {
            const roomName = message.channel === "waiter"
                ? `hotel-${message.hotel}-waiters`
                : message.channel === "chef"
                ? `hotel-${message.hotel}-chiefs`
                : `hotel-${message.hotel}`;
            io.to(roomName).emit("message-edited", payload);
        }
    }

    return res.status(200).json({
        success: true,
        message: "Message edited successfully",
        data: message,
    });
});

/**
 * Delete a message (soft delete - marks as deleted)
 * DELETE /api/staff/messages/:messageId
 */
export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const hotelId =
        req.body.hotelId ||
        (req.user.assignedProperties && req.user.assignedProperties[0]?._id) ||
        req.user.assignedProperties?.[0];

    // Query-scoped by hotel for security (prevent cross-hotel message deletion)
    const message = await Message.findOne({
        _id: messageId,
        hotel: hotelId
    });
    if (!message) {
        return res.status(404).json({
            success: false,
            message: "Message not found or access denied",
        });
    }

    // Only sender can delete their own message
    if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: "You can only delete your own messages",
        });
    }

    // Check if already deleted
    if (message.isDeleted) {
        return res.status(400).json({
            success: false,
            message: "Message is already deleted",
        });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    message.content = "This message was deleted";
    await message.save();

    // Emit real-time update
    const io = getIO();
    if (io) {
        const payload = {
            _id: message._id,
            isDeleted: true,
            deletedAt: message.deletedAt,
            content: "This message was deleted",
        };

        // Broadcast to appropriate room
        if (message.channel === "direct" && message.recipient) {
            io.to(`user-${message.recipient}`).emit("message-deleted", payload);
            io.to(`user-${message.sender}`).emit("message-deleted", payload);
        } else {
            const roomName = message.channel === "waiter"
                ? `hotel-${message.hotel}-waiters`
                : message.channel === "chef"
                ? `hotel-${message.hotel}-chiefs`
                : `hotel-${message.hotel}`;
            io.to(roomName).emit("message-deleted", payload);
        }
    }

    return res.status(200).json({
        success: true,
        message: "Message deleted successfully",
    });
});

/**
 * Block a user
 * POST /api/staff/messages/block/:userId
 */
export const blockUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

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

    // Cannot block yourself
    if (userId === req.user._id.toString()) {
        return res.status(400).json({
            success: false,
            message: "You cannot block yourself",
        });
    }

    // Check if user exists
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    // Import BlockedUser model
    const { BlockedUser } = await import("../models/blockedUser.schema.js");

    // Check if already blocked
    const existingBlock = await BlockedUser.findOne({
        blocker: req.user._id,
        blocked: userId,
    });

    if (existingBlock) {
        return res.status(400).json({
            success: false,
            message: "User is already blocked",
        });
    }

    // Create block
    await BlockedUser.create({
        hotel: hotelId,
        blocker: req.user._id,
        blocked: userId,
        reason: reason || null,
    });

    return res.status(201).json({
        success: true,
        message: "User blocked successfully",
    });
});

/**
 * Unblock a user
 * DELETE /api/staff/messages/block/:userId
 */
export const unblockUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Import BlockedUser model
    const { BlockedUser } = await import("../models/blockedUser.schema.js");

    const result = await BlockedUser.deleteOne({
        blocker: req.user._id,
        blocked: userId,
    });

    if (result.deletedCount === 0) {
        return res.status(404).json({
            success: false,
            message: "Block not found",
        });
    }

    return res.status(200).json({
        success: true,
        message: "User unblocked successfully",
    });
});

/**
 * Get blocked users list
 * GET /api/staff/messages/blocked
 */
export const getBlockedUsers = asyncHandler(async (req, res) => {
    // Import BlockedUser model
    const { BlockedUser } = await import("../models/blockedUser.schema.js");

    const blockedUsers = await BlockedUser.find({
        blocker: req.user._id,
    })
        .populate("blocked", "fullname email companyRole profilePicture")
        .sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        count: blockedUsers.length,
        data: blockedUsers,
    });
});
