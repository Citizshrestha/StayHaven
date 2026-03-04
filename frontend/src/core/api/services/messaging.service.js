import axiosClient from "../client.js";

const BASE = "/api/staff";

/**
 * Send a message to a channel or direct recipient
 */
export const sendMessage = async ({ channel, recipientId, content, messageType, roomNumber, hotelId }) => {
    const { data } = await axiosClient.post(`${BASE}/messages`, {
        channel,
        recipientId,
        content,
        messageType: messageType || "text",
        roomNumber,
        hotelId,
    });
    return data;
};

/**
 * Get messages for a channel
 */
export const getMessages = async ({ channel, recipientId, limit = 50, before, hotelId }) => {
    const params = new URLSearchParams();
    if (channel) params.append("channel", channel);
    if (recipientId) params.append("recipientId", recipientId);
    if (limit) params.append("limit", limit);
    if (before) params.append("before", before);
    if (hotelId) params.append("hotelId", hotelId);
    const { data } = await axiosClient.get(`${BASE}/messages?${params}`);
    return data;
};

/**
 * Mark messages as read
 */
export const markMessagesRead = async ({ messageIds, channel, hotelId }) => {
    const { data } = await axiosClient.put(`${BASE}/messages/read`, {
        messageIds,
        channel,
        hotelId,
    });
    return data;
};

/**
 * Get contacts (staff grouped by role)
 */
export const getContacts = async (hotelId) => {
    const params = hotelId ? `?hotelId=${hotelId}` : "";
    const { data } = await axiosClient.get(`${BASE}/messages/contacts${params}`);
    return data;
};

/**
 * Get recent conversations (latest message per conversation partner)
 */
export const getConversations = async (hotelId) => {
    const params = hotelId ? `?hotelId=${hotelId}` : "";
    const { data } = await axiosClient.get(`${BASE}/messages/conversations${params}`);
    return data;
};

/**
 * Initiate a call request
 */
export const initiateCall = async ({ recipientId, channel, roomNumber, hotelId }) => {
    const { data } = await axiosClient.post(`${BASE}/messages/call`, {
        recipientId,
        channel,
        roomNumber,
        hotelId,
    });
    return data;
};

/**
 * Update call status
 */
export const updateCallStatus = async (callId, { callStatus, callDuration }) => {
    const { data } = await axiosClient.put(`${BASE}/messages/call/${callId}`, {
        callStatus,
        callDuration,
    });
    return data;
};

/**
 * Get notifications
 */
export const getNotifications = async ({ limit = 20, unreadOnly = false, type } = {}) => {
    const params = new URLSearchParams();
    params.append("limit", limit);
    if (unreadOnly) params.append("unreadOnly", "true");
    if (type) params.append("type", type);
    const { data } = await axiosClient.get(`${BASE}/notifications?${params}`);
    return data;
};

/**
 * Mark notifications as read
 */
export const markNotificationsRead = async (notificationIds) => {
    const { data } = await axiosClient.put(`${BASE}/notifications/read`, {
        notificationIds,
    });
    return data;
};

/**
 * Get unread notification count
 */
export const getUnreadNotifCount = async () => {
    const { data } = await axiosClient.get(`${BASE}/notifications/count`);
    return data;
};
