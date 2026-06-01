import mongoose from "mongoose";

const heroBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      required: true,
      trim: true,
    },
    ctaText: {
      type: String,
      required: true,
      trim: true,
    },
    ctaLink: {
      type: String,
      default: "/",
      trim: true,
    },
    backgroundImage: {
      type: String,
      trim: true,
    },
    eyebrowText: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

heroBannerSchema.index({ status: 1, isActive: 1, updatedAt: -1 });

export const HeroBanner = mongoose.model("HeroBanner", heroBannerSchema);
