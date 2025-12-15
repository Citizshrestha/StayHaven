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
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    companyRole: {
      type: String,
      enum: [
        "owner",
        "admin",
        "manager",
        "chief",
        "waiter",
        "receptionist",
        "housekeeping",
        "maintenance",
      ],
    },
    permissions: {
      type: [String],
      default: [],
      // Examples: 'view_bookings', 'create_bookings', 'manage_rooms', 'view_reports', etc.
    },
    assignedProperties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
      },
    ], // Properties this user can manage (if not owner/admin)
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
    wishlist: {
      type: [String],
      default: [],
    },
    cart: {
      type: [
        {
          hotelId: { type: String, required: true },
          quantity: { type: Number, default: 1, min: 1 },
        },
      ],
      default: [],
    },
    refreshToken: {
      type: String,
      default: null,
    },
    inviteToken: {
      type: String,
      default: null,
    },
    inviteTokenExpireAt: {
      type: Date,
      default: null,
    },
    accountStatus: {
      type: String,
      enum: ["invited", "pending", "active", "deactivated"],
      default: "invited",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    invitedAt: {
      type: Date,
      default: null,
    },
    onboardedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.index({ company: 1, companyRole: 1 });

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.validatePassword = function (password) {
  const errors = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // At least one number
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // At least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (!@#$%^&*...)"
    );
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

export const User = mongoose.model("User", userSchema);
