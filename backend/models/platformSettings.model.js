import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "singleton",
    },
    currency: {
      type: String,
      default: "NRS",
    },
    timezone: {
      type: String,
      default: "Asia/Kathmandu",
    },
    locale: {
      type: String,
      default: "ne-NP",
    },
    dateFormat: {
      type: String,
      default: "DD/MM/YYYY",
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: "Under maintenance. We'll be back soon!",
    },
    maintenanceScheduledEnd: {
      type: Date,
    },
    globalCommissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    khaltiConfig: {
      publicKey: { type: String },
      secretKey: { type: String },
      webhookSecret: { type: String },
      isLive: { type: Boolean, default: false },
      webhookStatus: {
        type: String,
        enum: ["active", "inactive", "error"],
        default: "inactive",
      },
    },
    smtpConfig: {
      host: { type: String },
      port: { type: Number },
      user: { type: String },
      pass: { type: String },
      fromName: { type: String },
      fromEmail: { type: String },
    },
    cloudinaryConfig: {
      cloudName: { type: String },
      apiKey: { type: String },
      apiSecret: { type: String },
    },
    sentryDsn: {
      type: String,
    },
    notificationTriggers: [
      {
        event: { type: String },
        emailEnabled: { type: Boolean, default: true },
        smsEnabled: { type: Boolean, default: false },
        pushEnabled: { type: Boolean, default: true },
      },
    ],
    autoFlagRules: {
      profanityEnabled: { type: Boolean, default: true },
      spamEnabled: { type: Boolean, default: true },
      minLength: { type: Number, default: 20 },
      duplicateCheckEnabled: { type: Boolean, default: true },
      lowRatingAutoFlag: { type: Boolean, default: false },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model("PlatformSettings", platformSettingsSchema);
