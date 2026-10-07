import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    discountPercent: {
      type: Number,
    },
    discountFlat: {
      type: Number,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    image: {
      type: String,
      trim: true,
    },
    validFrom: {
      type: Date,
    },
    validUntil: {
      type: Date,
    },
    applicableTo: {
      type: String,
      enum: ["rooms", "food", "all"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

offerSchema.index({ status: 1, isActive: 1, displayOrder: 1, updatedAt: -1 });
offerSchema.index({ validFrom: 1, validUntil: 1 });

export const Offer = mongoose.model("Offer", offerSchema);
