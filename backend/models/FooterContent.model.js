import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    href: { type: String, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const socialLinkSchema = new mongoose.Schema(
  {
    platform: { type: String, trim: true },
    url: { type: String, trim: true },
    icon: { type: String, trim: true },
  },
  { _id: false }
);

const footerContentSchema = new mongoose.Schema(
  {
    quickLinks: {
      type: [linkSchema],
      default: [],
    },
    exploreLinks: {
      type: [linkSchema],
      default: [],
    },
    contactInfo: {
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    socialLinks: {
      type: [socialLinkSchema],
      default: [],
    },
    copyrightText: {
      type: String,
      trim: true,
    },
    newsletterEnabled: {
      type: Boolean,
      default: true,
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
  },
  { timestamps: true }
);

footerContentSchema.index({ status: 1, updatedAt: -1 });

export const FooterContent = mongoose.model("FooterContent", footerContentSchema);
