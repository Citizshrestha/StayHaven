import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    tierName: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
    },
    description: {
      type: String,
      trim: true,
    },
    features: {
      type: [String],
      default: [],
    },
    highlightFeature: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  { timestamps: true }
);

membershipSchema.index({ status: 1, isActive: 1, displayOrder: 1, updatedAt: -1 });

export const Membership = mongoose.model("Membership", membershipSchema);
