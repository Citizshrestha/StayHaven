import { Review } from "../models/review.model.js";
import { Booking } from "../models/booking.schema.js";
import { User } from "../models/user.schema.js";

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const REVIEW_TEMPLATES = [
  {
    rating: 5,
    title: "Unforgettable Himalayan views",
    comment:
      "The rooftop breakfast with Annapurna views was breathtaking. Staff arranged our early trek pickup without any hassle. Room was spotless and the WiFi worked well for remote work.",
    categories: { cleanliness: 5, staff: 5, facilities: 4, location: 5, valueForMoney: 4 },
    sentiment: 0.92,
  },
  {
    rating: 4,
    title: "Great location in Thamel",
    comment:
      "Perfect base for exploring Kathmandu. Walking distance to restaurants and shops. Only minor issue was street noise at night — bring earplugs and you'll be fine.",
    categories: { cleanliness: 4, staff: 4, facilities: 4, location: 5, valueForMoney: 4 },
    sentiment: 0.65,
  },
  {
    rating: 3,
    title: "Decent stay, room needs updating",
    comment:
      "Check-in was smooth and the front desk team was friendly. The bathroom fixtures felt dated and hot water was inconsistent on the second night. Acceptable for the price paid.",
    categories: { cleanliness: 3, staff: 4, facilities: 2, location: 4, valueForMoney: 3 },
    sentiment: 0.1,
  },
  {
    rating: 2,
    title: "Disappointing experience",
    comment:
      "Room did not match the photos online. Housekeeping missed our room on day two and we had to call twice. The manager apologised but compensation was minimal.",
    categories: { cleanliness: 2, staff: 2, facilities: 2, location: 3, valueForMoney: 2 },
    sentiment: -0.55,
    autoFlags: ["Low rating requires manual review"],
  },
  {
    rating: 5,
    title: "Best hotel in Pokhara",
    comment:
      "Lake-facing suite exceeded expectations. Paragliding pickup was arranged seamlessly. Restaurant dal bhat was authentic and delicious. Will definitely return next season.",
    categories: { cleanliness: 5, staff: 5, facilities: 5, location: 5, valueForMoney: 5 },
    sentiment: 0.95,
  },
  {
    rating: 1,
    title: "Terrible service — would not recommend",
    comment:
      "Worst hotel experience in Nepal. AC broken for two nights, no alternative room offered. Front desk was dismissive. This feels like a scam compared to what was advertised.",
    categories: { cleanliness: 1, staff: 1, facilities: 1, location: 2, valueForMoney: 1 },
    sentiment: -0.9,
    autoFlags: ["Contains profanity or inappropriate language", "Low rating requires manual review"],
  },
  {
    rating: 4,
    title: "Comfortable family room",
    comment:
      "Travelled with two kids and the connecting rooms worked perfectly. Kids loved the pool. Breakfast buffet had good variety including local and continental options.",
    categories: { cleanliness: 4, staff: 5, facilities: 4, location: 4, valueForMoney: 4 },
    sentiment: 0.7,
  },
  {
    rating: 5,
    title: "Exceptional hospitality",
    comment:
      "From airport pickup to farewell garland, every detail was thoughtful. The concierge helped us reschedule our Chitwan safari when flights were delayed. Truly five-star service.",
    categories: { cleanliness: 5, staff: 5, facilities: 5, location: 4, valueForMoney: 4 },
    sentiment: 0.88,
  },
  {
    rating: 4,
    title: "Solid business hotel",
    comment:
      "Quiet rooms, reliable internet, and a well-equipped meeting space. Restaurant closes early but room service menu is adequate. Good value for corporate travellers.",
    categories: { cleanliness: 4, staff: 4, facilities: 4, location: 3, valueForMoney: 4 },
    sentiment: 0.55,
  },
  {
    rating: 2,
    title: "Noise and billing issues",
    comment:
      "Construction next door started at 6 AM every day. Final bill included minibar items we never used — took 30 minutes at checkout to resolve. Location is convenient though.",
    categories: { cleanliness: 3, staff: 2, facilities: 2, location: 4, valueForMoney: 2 },
    sentiment: -0.4,
    autoFlags: ["Low rating requires manual review"],
  },
  {
    rating: 5,
    title: "Perfect anniversary getaway",
    comment:
      "Surprise cake and flower decoration in the room made our anniversary special. Spa massage was excellent. Sunset from the terrace bar is a must-see.",
    categories: { cleanliness: 5, staff: 5, facilities: 5, location: 5, valueForMoney: 4 },
    sentiment: 0.9,
  },
  {
    rating: 3,
    title: "Average mountain lodge",
    comment:
      "Rustic charm as advertised but thin walls between rooms. Heating worked well which matters in winter. Food was hearty Nepali cuisine, nothing fancy.",
    categories: { cleanliness: 3, staff: 4, facilities: 3, location: 5, valueForMoney: 3 },
    sentiment: 0.2,
  },
];

export const runSeedReviewData = async () => {
  const existing = await Review.countDocuments();
  if (existing >= 8) {
    return {
      success: true,
      message: "Review data already seeded",
      data: { reviewsCreated: 0, totalReviews: existing },
    };
  }

  const bookings = await Booking.find({
    user: { $exists: true, $ne: null },
    status: { $in: ["Checked-Out", "Confirmed", "Checked-In"] },
  })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  if (bookings.length < 3) {
    return {
      success: false,
      message: "Run /api/v1/seed/superadmin-data first to create guest bookings.",
    };
  }

  const superadmin = await User.findOne({ email: "superadmin@stayhaven.com" });

  const statusSpecs = [
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "approved", moderatedDaysAgo: 2 },
    { status: "approved", moderatedDaysAgo: 5 },
    { status: "rejected", moderatedDaysAgo: 3, rejectionReason: "Suspected fake review — no matching stay record" },
    { status: "rejected", moderatedDaysAgo: 7, rejectionReason: "Contains promotional spam links", appealStatus: "pending", appealReason: "Guest disputes rejection — claims legitimate stay" },
    { status: "flagged", moderatedDaysAgo: 1, flagReason: "Auto-flagged: low rating + profanity keywords" },
    { status: "flagged", moderatedDaysAgo: 4, flagReason: "Multiple guests reported similar complaint" },
  ];

  const reviewDocs = statusSpecs.map((spec, i) => {
    const booking = bookings[i % bookings.length];
    const template = REVIEW_TEMPLATES[i % REVIEW_TEMPLATES.length];
    const createdAt = daysAgo(1 + i * 2);
    const isModerated = spec.status !== "pending";

    const doc = {
      hotel: booking.hotel,
      booking: booking._id,
      guest: booking.user,
      rating: template.rating,
      title: template.title,
      comment: template.comment,
      categories: template.categories,
      moderationStatus: spec.status,
      sentimentScore: template.sentiment,
      isVerifiedGuest: booking.status === "Checked-Out",
      autoFlagReasons: template.autoFlags || [],
      createdAt,
    };

    if (isModerated) {
      doc.moderatedBy = superadmin?._id;
      doc.moderatedAt = daysAgo(spec.moderatedDaysAgo);
    }

    if (spec.status === "rejected" && spec.rejectionReason) {
      doc.flags = [
        {
          reason: spec.rejectionReason,
          flaggedAt: daysAgo(spec.moderatedDaysAgo),
          flaggedBy: "superadmin@stayhaven.com",
        },
      ];
    }

    if (spec.status === "flagged") {
      doc.flags = [
        {
          reason: spec.flagReason,
          flaggedAt: daysAgo(spec.moderatedDaysAgo),
          flaggedBy: "system",
        },
      ];
    }

    if (spec.appealStatus) {
      doc.appealStatus = spec.appealStatus;
      doc.appealReason = spec.appealReason;
    }

    if (spec.status === "approved" && i % 2 === 0) {
      doc.hotelReply = {
        text: "Thank you for your kind words! We hope to welcome you back to StayHaven soon.",
        repliedAt: daysAgo(spec.moderatedDaysAgo - 1),
        isPublic: true,
      };
    }

    return doc;
  });

  await Review.insertMany(reviewDocs);

  return {
    success: true,
    message: "Review moderation data seeded successfully",
    data: {
      reviewsCreated: reviewDocs.length,
      totalReviews: await Review.countDocuments(),
      pending: await Review.countDocuments({ moderationStatus: "pending" }),
      approved: await Review.countDocuments({ moderationStatus: "approved" }),
      rejected: await Review.countDocuments({ moderationStatus: "rejected" }),
      flagged: await Review.countDocuments({ moderationStatus: "flagged" }),
    },
  };
};

export const seedReviewData = async (req, res) => {
  try {
    const result = await runSeedReviewData();
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error("Error seeding review data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed review data",
      error: error.message,
    });
  }
};
