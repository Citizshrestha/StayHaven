import mongoose from "mongoose";

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    province: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["cultural", "adventure", "nature", "luxury", "spiritual"],
    },
    description: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    bestTime: {
      type: String,
      trim: true,
    },
    weather: {
      type: String,
      trim: true,
    },
    hotelsCount: {
      type: Number,
      default: 0,
    },
    activities: {
      type: [String],
      default: [],
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

destinationSchema.index({ status: 1, isActive: 1, displayOrder: 1, updatedAt: -1 });
destinationSchema.index({ name: "text", province: "text", description: "text" });

export const Destination = mongoose.model("Destination", destinationSchema);
