import mongoose from "mongoose";

const guestRequestSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    roomNumber: { type: String, required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "Guest" },
    guestName: { type: String },
    description: { type: String, required: true, maxlength: 500 },
    category: {
      type: String,
      enum: ["Room Service", "Checkout", "Maintenance", "Amenities", "Other"],
      default: "Other",
    },
    urgency: {
      type: String,
      enum: ["urgent", "medium", "low"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "assigned", "ignored", "resolved", "denied"],
      default: "open",
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedToName: { type: String },
    timeRemainingMinutes: { type: Number },
    isOverdue: { type: Boolean, default: false },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

guestRequestSchema.index({ company: 1, status: 1 });
guestRequestSchema.index({ hotel: 1, urgency: 1 });

export const GuestRequest = mongoose.model("GuestRequest", guestRequestSchema);
