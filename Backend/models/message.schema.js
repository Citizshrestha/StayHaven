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
        // Channel for role-based broadcasts: "guest", "waiter", "chef", "all"
        channel: {
            type: String,
            enum: ["guest", "waiter", "chef", "receptionist", "all", "direct"],
            default: "direct",
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
