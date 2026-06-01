import mongoose from "mongoose";

const featuredHotelSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    badge: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featuredUntil: {
      type: Date,
    },
  },
  { timestamps: true }
);

featuredHotelSchema.index({ isActive: 1, displayOrder: 1, updatedAt: -1 });
featuredHotelSchema.index({ hotelId: 1 });

export const FeaturedHotel = mongoose.model("FeaturedHotel", featuredHotelSchema);
