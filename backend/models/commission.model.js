import mongoose from "mongoose";

const commissionSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["global", "hotel", "room_type", "seasonal", "promo"],
      required: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },
    roomType: {
      type: String,
      default: null,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    flatFee: {
      type: Number,
      default: 0,
    },
    validFrom: {
      type: Date,
    },
    validUntil: {
      type: Date,
    },
    promoCode: {
      type: String,
    },
    priority: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Compound index for finding active rules
commissionSchema.index({ hotel: 1, scope: 1, isActive: 1 });
commissionSchema.index({ isActive: 1, priority: -1 });
commissionSchema.index({ scope: 1, isActive: 1 });

export const Commission = mongoose.model("Commission", commissionSchema);
