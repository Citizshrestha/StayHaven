import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['admin', 'staff', 'guest', 'owner', 'kitchen', 'waiter', 'manager', 'receptionist'],
    },
    permissions: {
        type: [String],
        default: [],
    },
    description: {
        type: String,
        trim: true,
    },
    isSystemRole: {
        type: Boolean,
        default: false,
    },
}, {timestamps: true});

// Index for unique role names
roleSchema.index({ name: 1 }, { unique: true });

export const Role = mongoose.model("Role", roleSchema);

