import Feedback from '../models/feedback.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('FeedbackController');

/**
 * Submit Feedback
 *
 * Public endpoint for users to submit feedback
 *
 * @route POST /api/v1/feedback
 * @access Public
 */
export const submitFeedback = asyncHandler(async (req, res) => {
  const { fullName, phoneNo, email, address, feedback } = req.body;

  // Validate required fields
  if (!fullName || !phoneNo || !feedback) {
    return res.status(400).json({
      success: false,
      message: 'Full name, phone number, and feedback message are required',
    });
  }

  // Get IP address for tracking
  const ipAddress = req.ip || req.connection.remoteAddress;

  // Create feedback entry
  const newFeedback = await Feedback.create({
    fullName,
    phoneNo,
    email,
    address,
    feedback,
    ipAddress,
  });

  logger.info('Feedback submitted', {
    feedbackId: newFeedback._id,
    fullName,
    phoneNo,
  });

  return res.status(201).json({
    success: true,
    message: 'Thank you for your feedback! We appreciate your input.',
    data: {
      id: newFeedback._id,
      submittedAt: newFeedback.createdAt,
    },
  });
});

/**
 * Get All Feedback
 *
 * Admin endpoint to view all feedback submissions
 *
 * @route GET /api/v1/feedback
 * @access Private (Admin/Owner)
 */
export const getAllFeedback = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const feedbacks = await Feedback.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Feedback.countDocuments(filter);

  return res.status(200).json({
    success: true,
    data: feedbacks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Update Feedback Status
 *
 * Admin endpoint to update feedback status
 *
 * @route PATCH /api/v1/feedback/:id/status
 * @access Private (Admin/Owner)
 */
export const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be pending, reviewed, or resolved',
    });
  }

  const feedback = await Feedback.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found',
    });
  }

  logger.info('Feedback status updated', {
    feedbackId: id,
    newStatus: status,
  });

  return res.status(200).json({
    success: true,
    message: 'Feedback status updated successfully',
    data: feedback,
  });
});
