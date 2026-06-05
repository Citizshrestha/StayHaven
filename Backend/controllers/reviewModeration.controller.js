import mongoose from "mongoose";
import { Review } from "../models/review.model.js";
import { Booking } from "../models/booking.schema.js";
import { PlatformSettings } from "../models/platformSettings.model.js";
import { logAudit } from "../middleware/auditLogger.js";

const PROFANITY_WORDS = [
  "spam",
  "fake",
  "scam",
  "terrible",
  "worst",
  "horrible",
];

const runAutoFlag = (review, rules) => {
  const autoFlagReasons = [];
  let shouldFlag = false;

  if (rules.profanityEnabled) {
    const lowerComment = review.comment.toLowerCase();
    const hasProfanity = PROFANITY_WORDS.some((word) => lowerComment.includes(word));
    if (hasProfanity) {
      autoFlagReasons.push("Contains profanity or inappropriate language");
      shouldFlag = true;
    }
  }

  if (rules.minLength && review.comment.length < rules.minLength) {
    autoFlagReasons.push(`Review too short (minimum ${rules.minLength} characters)`);
    shouldFlag = true;
  }

  if (rules.spamEnabled) {
    const upperCaseRatio = (review.comment.match(/[A-Z]/g) || []).length / review.comment.length;
    if (upperCaseRatio > 0.5) {
      autoFlagReasons.push("Excessive use of capital letters (spam pattern)");
      shouldFlag = true;
    }

    const repeatedCharsPattern = /(.)\1{4,}/;
    if (repeatedCharsPattern.test(review.comment)) {
      autoFlagReasons.push("Repeated character spam pattern detected");
      shouldFlag = true;
    }
  }

  if (rules.lowRatingAutoFlag && review.rating <= 2) {
    autoFlagReasons.push("Low rating requires manual review");
    shouldFlag = true;
  }

  return { shouldFlag, autoFlagReasons };
};

export const getPendingReviews = async (req, res) => {
  try {
    const { status = "pending", hotelId, page = 1, limit = 20, sortBy = "createdAt" } = req.query;

    const query = {};
    if (status) query.moderationStatus = status;
    if (hotelId) query.hotel = hotelId;

    const reviews = await Review.find(query)
      .populate("guest", "fullname email")
      .populate("hotel", "name")
      .populate("booking", "checkIn checkOut")
      .sort({ [sortBy]: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments(query);

    const reviewsWithVerification = await Promise.all(
      reviews.map(async (review) => {
        const guestId = review.guest?._id || review.guest;
        const hotelId = review.hotel?._id || review.hotel;
        const hasCompletedBooking = await Booking.exists({
          $or: [{ user: guestId }, { guest: guestId }],
          hotel: hotelId,
          status: "Checked-Out",
        });

        return {
          ...review,
          isVerifiedGuest: !!hasCompletedBooking,
        };
      })
    );

    res.json({
      success: true,
      data: reviewsWithVerification,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending reviews",
      error: error.message,
    });
  }
};

export const moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!["approve", "reject", "flag"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be approve, reject, or flag",
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const before = review.toObject();

    if (action === "approve") {
      review.moderationStatus = "approved";
    } else if (action === "reject") {
      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }
      review.moderationStatus = "rejected";
    } else if (action === "flag") {
      review.moderationStatus = "flagged";
      review.flags.push({
        reason: reason || "Manual flag by moderator",
        flaggedAt: new Date(),
        flaggedBy: req.user.email,
      });
    }

    review.moderatedBy = req.user._id;
    review.moderatedAt = new Date();

    await review.save();

    await logAudit(req.user._id, `moderate_review_${action}`, "review", review._id, before, review.toObject(), req);

    res.json({
      success: true,
      message: `Review ${action}ed successfully`,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to moderate review",
      error: error.message,
    });
  }
};

export const getAutoFlagRules = async (req, res) => {
  try {
    const settings = await PlatformSettings.findById("singleton").lean();

    const defaultRules = {
      profanityEnabled: true,
      spamEnabled: true,
      minLength: 20,
      duplicateCheckEnabled: true,
      lowRatingAutoFlag: false,
    };

    res.json({
      success: true,
      data: settings?.autoFlagRules || defaultRules,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch auto-flag rules",
      error: error.message,
    });
  }
};

export const updateAutoFlagRules = async (req, res) => {
  try {
    const rules = req.body;

    const settings = await PlatformSettings.findOneAndUpdate(
      { _id: "singleton" },
      {
        $set: {
          autoFlagRules: rules,
          updatedBy: req.user._id,
        },
      },
      { upsert: true, new: true }
    );

    await logAudit(req.user._id, "update_auto_flag_rules", "platformSettings", "singleton", null, rules, req);

    res.json({
      success: true,
      message: "Auto-flag rules updated successfully",
      data: settings.autoFlagRules,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update auto-flag rules",
      error: error.message,
    });
  }
};

export const addHotelReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, isPublic = true } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Reply text is required",
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const before = review.toObject();

    review.hotelReply = {
      text,
      repliedAt: new Date(),
      isPublic,
    };

    await review.save();

    await logAudit(req.user._id, "add_hotel_reply", "review", review._id, before, review.toObject(), req);

    res.json({
      success: true,
      message: "Hotel reply added successfully",
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add hotel reply",
      error: error.message,
    });
  }
};

export const moderateHotelReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be approve or reject",
      });
    }

    const review = await Review.findById(id);
    if (!review || !review.hotelReply) {
      return res.status(404).json({
        success: false,
        message: "Review or hotel reply not found",
      });
    }

    const before = review.toObject();

    review.hotelReply.isPublic = action === "approve";
    await review.save();

    await logAudit(req.user._id, `moderate_hotel_reply_${action}`, "review", review._id, before, review.toObject(), req);

    res.json({
      success: true,
      message: `Hotel reply ${action}ed successfully`,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to moderate hotel reply",
      error: error.message,
    });
  }
};

export const submitAppeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Appeal reason is required",
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.moderationStatus !== "rejected") {
      return res.status(400).json({
        success: false,
        message: "Only rejected reviews can be appealed",
      });
    }

    const before = review.toObject();

    review.appealStatus = "pending";
    review.appealReason = reason;

    await review.save();

    await logAudit(req.user._id, "submit_appeal", "review", review._id, before, review.toObject(), req);

    res.json({
      success: true,
      message: "Appeal submitted successfully",
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit appeal",
      error: error.message,
    });
  }
};

export const resolveAppeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body;

    if (!["upheld", "overturned"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Invalid decision. Must be upheld or overturned",
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.appealStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "No pending appeal found for this review",
      });
    }

    const before = review.toObject();

    review.appealStatus = "resolved";
    review.appealResolvedAt = new Date();
    review.appealResolvedBy = req.user._id;

    if (decision === "overturned") {
      review.moderationStatus = "approved";
    }

    if (notes) {
      review.flags.push({
        reason: `Appeal ${decision}: ${notes}`,
        flaggedAt: new Date(),
        flaggedBy: req.user.email,
      });
    }

    await review.save();

    await logAudit(req.user._id, `resolve_appeal_${decision}`, "review", review._id, before, review.toObject(), req);

    res.json({
      success: true,
      message: `Appeal ${decision} successfully`,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to resolve appeal",
      error: error.message,
    });
  }
};

export const getModerationMetrics = async (req, res) => {
  try {
    const totalReviews = await Review.countDocuments();
    const approvedCount = await Review.countDocuments({ moderationStatus: "approved" });
    const rejectedCount = await Review.countDocuments({ moderationStatus: "rejected" });
    const pendingCount = await Review.countDocuments({ moderationStatus: "pending" });
    const flaggedCount = await Review.countDocuments({ moderationStatus: "flagged" });
    const appealsPending = await Review.countDocuments({ appealStatus: "pending" });

    const approvalRate = totalReviews > 0 ? parseFloat(((approvedCount / totalReviews) * 100).toFixed(1)) : 0;

    const moderatedReviews = await Review.find({
      moderatedAt: { $exists: true },
      createdAt: { $exists: true },
    })
      .select("createdAt moderatedAt")
      .lean();

    let totalResponseTime = 0;
    moderatedReviews.forEach((review) => {
      const diff = new Date(review.moderatedAt) - new Date(review.createdAt);
      totalResponseTime += diff / (1000 * 60 * 60);
    });

    const avgResponseTime =
      moderatedReviews.length > 0 ? parseFloat((totalResponseTime / moderatedReviews.length).toFixed(1)) : 0;

    const rejectionReasons = await Review.aggregate([
      { $match: { moderationStatus: "rejected", flags: { $exists: true, $ne: [] } } },
      { $unwind: "$flags" },
      { $group: { _id: "$flags.reason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const commonRejectionReasons = rejectionReasons.map((r) => ({
      reason: r._id,
      count: r.count,
    }));

    const byHotel = await Review.aggregate([
      {
        $group: {
          _id: "$hotel",
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$moderationStatus", "pending"] }, 1, 0] },
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ["$moderationStatus", "approved"] }, 1, 0] },
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ["$moderationStatus", "rejected"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "hotels",
          localField: "_id",
          foreignField: "_id",
          as: "hotelInfo",
        },
      },
      { $unwind: "$hotelInfo" },
      {
        $project: {
          hotelName: "$hotelInfo.name",
          pendingCount: 1,
          approvalRate: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              { $multiply: [{ $divide: ["$approvedCount", "$total"] }, 100] },
            ],
          },
        },
      },
      { $sort: { pendingCount: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        approvalRate,
        avgResponseTime,
        pendingCount,
        flaggedCount,
        appealsPending,
        commonRejectionReasons,
        byHotel: byHotel.map((h) => ({
          hotelName: h.hotelName,
          pendingCount: h.pendingCount,
          approvalRate: parseFloat(h.approvalRate.toFixed(1)),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch moderation metrics",
      error: error.message,
    });
  }
};

export const getReviewInsights = async (req, res) => {
  try {
    const { hotelId, dateFrom, dateTo } = req.query;

    const now = new Date();
    const startDate = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = dateTo ? new Date(dateTo) : now;

    const query = {
      createdAt: { $gte: startDate, $lte: endDate },
      moderationStatus: "approved",
    };

    if (hotelId) {
      query.hotel = new mongoose.Types.ObjectId(hotelId);
    }

    const sentimentTrend = await Review.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          avgSentiment: { $avg: "$sentimentScore" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const ratingDistribution = await Review.aggregate([
      { $match: query },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const totalRatings = ratingDistribution.reduce((sum, r) => sum + r.count, 0);

    const categoryBreakdown = await Review.aggregate([
      { $match: query },
      {
        $project: {
          categories: { $objectToArray: "$categories" },
        },
      },
      { $unwind: "$categories" },
      {
        $group: {
          _id: "$categories.k",
          avgRating: { $avg: "$categories.v" },
        },
      },
    ]);

    const reviews = await Review.find(query).select("comment").lean();

    const wordFrequency = {};
    reviews.forEach((review) => {
      const words = review.comment
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 4);

      words.forEach((word) => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });
    });

    const topKeywords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    res.json({
      success: true,
      data: {
        sentimentTrend: sentimentTrend.map((s) => ({
          date: s._id,
          avgSentiment: parseFloat(s.avgSentiment.toFixed(2)),
        })),
        ratingDistribution: ratingDistribution.map((r) => ({
          stars: r._id,
          count: r.count,
          percentage: totalRatings > 0 ? parseFloat(((r.count / totalRatings) * 100).toFixed(1)) : 0,
        })),
        categoryBreakdown: categoryBreakdown.map((c) => ({
          category: c._id,
          avgRating: parseFloat(c.avgRating.toFixed(1)),
        })),
        topKeywords,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch review insights",
      error: error.message,
    });
  }
};
