import mongoose from "mongoose";

const guestSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    guestId: { type: String, unique: true }, // G-XXXXX
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    country: { type: String, trim: true },
    avatarUrl: { type: String },
    idType: { type: String, trim: true },
    idNumber: { type: String, trim: true },
    membershipTier: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum", "Diamond"],
      default: "Bronze",
    },
    loyaltyPoints: { type: Number, default: 0 },
    totalStays: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    vipStatus: { type: Boolean, default: false },
    notes: { type: String, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
    // Blacklist / flag fields — receptionists can flag guests instead of deleting them
    blacklisted: { type: Boolean, default: false },
    blacklistReason: { type: String, maxlength: 500, default: "" },
    blacklistedAt: { type: Date, default: null },
    blacklistedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deactivatedAt: { type: Date, default: null },
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Current stay info (denormalized for quick dashboard access)
    currentBooking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    currentRoom: { type: String },
    status: {
      type: String,
      enum: ["In-House", "Checked-Out", "Reserved", "No-Show"],
      default: "Checked-Out",
    },
  },
  { timestamps: true }
);

// ═════════════════════════════════════════════════════════════════════════════
// INDEXES FOR PRODUCTION PERFORMANCE
// ═════════════════════════════════════════════════════════════════════════════

guestSchema.index({ hotel: 1, email: 1 });
guestSchema.index({ hotel: 1, phone: 1 });
guestSchema.index({ hotel: 1, status: 1 });
guestSchema.index({ hotel: 1, membershipTier: 1 });
guestSchema.index({ hotel: 1, vipStatus: 1, status: 1 });
guestSchema.index({ hotel: 1, createdAt: -1 });

// Company-level indexes
guestSchema.index({ company: 1, status: 1 });
guestSchema.index({ company: 1, membershipTier: 1 });
guestSchema.index({ company: 1, createdAt: -1 });
guestSchema.index({ company: 1, totalSpent: -1 }); // For loyalty reporting

// Text search
guestSchema.index({ fullName: "text", email: "text", phone: "text" });

// Dashboard quick lookup
guestSchema.index({ currentBooking: 1 }, { sparse: true });
guestSchema.index({ company: 1, blacklisted: 1 });

// Auto-generate guestId
guestSchema.pre("save", async function (next) {
  if (!this.guestId) {
    const count = await mongoose.model("Guest").countDocuments({ company: this.company });
    this.guestId = `G-${(10001 + count).toString().padStart(5, "0")}`;
  }
  next();
});

export const Guest = mongoose.model("Guest", guestSchema);
