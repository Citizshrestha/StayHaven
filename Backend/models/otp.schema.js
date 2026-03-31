import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["signup", "password-reset", "email-verification"],
      required: true,
    },
    signupFormData: {
      // Only used for signup type
      fullName: String,
      fullname: String, // Support both naming conventions
      username: String,
      password: String, // This will be hashed before storage
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-save middleware to hash password if present
otpSchema.pre("save", async function (next) {
  if (this.signupFormData && this.signupFormData.password) {
    const bcrypt = await import("bcryptjs");
    this.signupFormData.password = await bcrypt.hash(
      this.signupFormData.password,
      10
    );
  }
  next();
});

// Auto-delete expired documents (MongoDB TTL index)
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient queries
otpSchema.index({ email: 1, type: 1 });

/**
 * Check if OTP has expired
 */
otpSchema.methods.isExpired = function () {
  return Date.now() > this.expiresAt;
};

/**
 * Increment verification attempts
 */
otpSchema.methods.incrementAttempts = async function () {
  this.attempts += 1;
  return this.save();
};

/**
 * Mark OTP as verified
 */
otpSchema.methods.markVerified = async function () {
  this.isVerified = true;
  this.verifiedAt = new Date();
  return this.save();
};

/**
 * Static method: Find valid (non-expired) OTP
 */
otpSchema.statics.findValidOTP = async function (email, otp, type) {
  return this.findOne({
    email: email.toLowerCase().trim(),
    otp,
    type,
    isVerified: false,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Static method: Invalidate all existing OTPs for email/type
 */
otpSchema.statics.invalidateExisting = async function (email, type) {
  return this.deleteMany({
    email: email.toLowerCase().trim(),
    type,
    isVerified: false,
  });
};

export const OTP = mongoose.model("OTP", otpSchema);
