import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        hotel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
            index: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Recipient can be a specific user OR a role-based channel
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        // Channel for role-based broadcasts.
        // Guest-facing intents:
        //   "reception"    → guest ↔ receptionist/manager (front desk)
        //   "room-service" → guest ↔ waiter/chef (dining / room service)
        // Staff-internal channels: "waiter", "chef", "receptionist", "all".
        // "guest" is the legacy guest channel (kept for back-compat). "direct" = DM.
        channel: {
            type: String,
            enum: ["guest", "reception", "room-service", "waiter", "chef", "receptionist", "all", "direct"],
            default: "direct",
            index: true,
        },
        // For guest-facing channels, the guest User this thread belongs to.
        // Lets staff and the guest scope a two-way conversation without a DM,
        // and lets us fan replies back to `user-<guestUser>`.
        guestUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        // Optional: link message to a specific room/booking context
        roomNumber: {
            type: String,
            default: null,
        },
        content: {
            type: String,
            required: true,
            maxlength: 2000,
            trim: true,
        },
        // Track if message was edited
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
            default: null,
        },
        // Track if message was deleted
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        messageType: {
            type: String,
            enum: ["text", "alert", "call_request", "system"],
            default: "text",
        },
        // For call requests
        callStatus: {
            type: String,
            enum: ["none", "ringing", "answered", "missed", "declined", "ended"],
            default: "none",
        },
        callDuration: {
            type: Number,  // in seconds
            default: 0,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
            default: null,
        },
        // Conversation management fields
        archived: {
            type: Boolean,
            default: false,
        },
        archivedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
        mutedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
    },
    { timestamps: true }
);

// Compound indexes for common queries
messageSchema.index({ hotel: 1, channel: 1, createdAt: -1 });
messageSchema.index({ hotel: 1, sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ hotel: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);
