import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "admin",
        "manager",
        "staff",
        "guest",
        "owner",
        "chief",
        "waiter",
        "receptionist",
      ],
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
  },
  { timestamps: true }
);

// Index for unique role names
roleSchema.index({ name: 1 }, { unique: true });

export const Role = mongoose.model("Role", roleSchema);
