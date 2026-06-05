import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    categories: {
      cleanliness: { type: Number, min: 1, max: 5 },
      staff: { type: Number, min: 1, max: 5 },
      facilities: { type: Number, min: 1, max: 5 },
      location: { type: Number, min: 1, max: 5 },
      valueForMoney: { type: Number, min: 1, max: 5 },
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "flagged"],
      default: "pending",
      index: true,
    },
    flags: [
      {
        reason: { type: String, required: true },
        flaggedAt: { type: Date, default: Date.now },
        flaggedBy: { type: String },
      },
    ],
    autoFlagReasons: [{ type: String }],
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0,
    },
    hotelReply: {
      text: { type: String, maxlength: 1000 },
      repliedAt: { type: Date },
      isPublic: { type: Boolean, default: false },
    },
    appealStatus: {
      type: String,
      enum: ["none", "pending", "resolved"],
      default: "none",
    },
    appealReason: {
      type: String,
      maxlength: 1000,
    },
    appealResolvedAt: {
      type: Date,
    },
    appealResolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    moderatedAt: {
      type: Date,
    },
    isVerifiedGuest: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for production performance
reviewSchema.index({ hotel: 1, moderationStatus: 1 });
reviewSchema.index({ moderationStatus: 1, createdAt: -1 });
reviewSchema.index({ guest: 1, createdAt: -1 });
reviewSchema.index({ hotel: 1, moderationStatus: 1, rating: -1 });
reviewSchema.index({ appealStatus: 1 });

export const Review = mongoose.model("Review", reviewSchema);
