import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: false, // Made optional for now
    },
    roomNumber: {
      type: String,
      default: null,
    },
    contact: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // OTP fields for password reset
    resetOtp: {
      type: String,
      default: "",
    },
    resetOtpExpireAt: {
      type: Number,
      default: 0,
    },
    // Google OAuth fields
    isGoogleUser: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      default: null,
    },
},
  { timestamps: true }
);


userSchema.pre('save', async function (next) {
  if (this.isModified('password')){
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model("User", userSchema);
