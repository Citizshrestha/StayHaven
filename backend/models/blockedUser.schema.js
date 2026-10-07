import mongoose from "mongoose";

const blockedUserSchema = new mongoose.Schema(
    {
        hotel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
            index: true,
        },
        blocker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        blocked: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        reason: {
            type: String,
            maxlength: 500,
            default: null,
        },
    },
    { timestamps: true }
);

// Compound index to prevent duplicate blocks and optimize queries
blockedUserSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockedUserSchema.index({ hotel: 1, blocker: 1 });

export const BlockedUser = mongoose.model("BlockedUser", blockedUserSchema);
