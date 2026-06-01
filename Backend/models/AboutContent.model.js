import mongoose from "mongoose";

const statSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    value: { type: String, trim: true },
  },
  { _id: false }
);

const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    role: { type: String, trim: true },
    image: { type: String, trim: true },
    bio: { type: String, trim: true },
  },
  { _id: false }
);

const testimonialSchema = new mongoose.Schema(
  {
    guestName: { type: String, trim: true },
    location: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, trim: true },
    avatar: { type: String, trim: true },
    date: { type: Date },
  },
  { _id: false }
);

const aboutContentSchema = new mongoose.Schema(
  {
    companyStory: {
      type: String,
      trim: true,
    },
    mission: {
      type: String,
      trim: true,
    },
    vision: {
      type: String,
      trim: true,
    },
    stats: {
      type: [statSchema],
      default: [],
    },
    teamMembers: {
      type: [teamMemberSchema],
      default: [],
    },
    testimonials: {
      type: [testimonialSchema],
      default: [],
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

aboutContentSchema.index({ status: 1, updatedAt: -1 });

export const AboutContent = mongoose.model("AboutContent", aboutContentSchema);
