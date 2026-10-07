import mongoose from "mongoose";

const trustBadgeSchema = new mongoose.Schema(
  {
    icon: { type: String, trim: true },
    text: { type: String, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    trustBadges: {
      type: [trustBadgeSchema],
      default: [],
    },
    liveViewers: {
      type: Number,
      default: 23,
    },
    totalTravelers: {
      type: String,
      default: "50,000+",
      trim: true,
    },
    avgRating: {
      type: String,
      default: "4.8",
      trim: true,
    },
    secureBooking: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

siteSettingsSchema.index({ isActive: 1, updatedAt: -1 });

export const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);
