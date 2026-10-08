import express from 'express';
import mongoose from 'mongoose';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { Booking } from '../models/booking.schema.js';
import {
  getDashboardMetrics,
  getRecentBookings,
  getRecentActivity,
  getRevenueAnalytics,
  getCommissionBreakdown,
  getPendingActions
} from '../controllers/superadminController.js';

const router = express.Router();

// ═══════════════════════════════════════════
// Super Admin Routes - Platform Management
// All routes require superadmin role
// ═══════════════════════════════════════════

// Apply authentication and superadmin role check to all routes
router.use(protect);
router.use(authorize('superadmin'));

// ═══════════════════════════════════════════
// Dashboard & Analytics
// ═══════════════════════════════════════════

/**
 * @route   GET /api/v1/superadmin/dashboard/metrics
 * @desc    Get platform-wide metrics (revenue, bookings, users, hotels)
 * @access  Super Admin
 */
router.get('/dashboard/metrics', getDashboardMetrics);

/**
 * @route   GET /api/v1/superadmin/dashboard/recent-bookings
 * @desc    Get recent bookings for dashboard
 * @access  Super Admin
 */
router.get('/dashboard/recent-bookings', getRecentBookings);

/**
 * @route   GET /api/v1/superadmin/dashboard/activity
 * @desc    Get recent platform activity
 * @access  Super Admin
 */
router.get('/dashboard/activity', getRecentActivity);

/**
 * @route   GET /api/v1/superadmin/dashboard/revenue
 * @desc    Get revenue analytics with time series data
 * @access  Super Admin
 */
router.get('/dashboard/revenue', getRevenueAnalytics);

/**
 * @route   GET /api/v1/superadmin/dashboard/commission-breakdown
 * @desc    Get commission breakdown by hotel type
 * @access  Super Admin
 */
router.get('/dashboard/commission-breakdown', getCommissionBreakdown);

/**
 * @route   GET /api/v1/superadmin/dashboard/pending-actions
 * @desc    Get pending actions requiring attention
 * @access  Super Admin
 */
router.get('/dashboard/pending-actions', getPendingActions);

// NOTE: platform-wide hotel approve/reject/suspend management lives at
// /api/v1/hotels/admin/* (hotelController.js / hotelRoutes.js), which the
// real HotelManagement UI actually calls. A parallel set of hotel-management
// routes (plus /users, /revenue, /settings) used to live here returning
// hardcoded mock data with no frontend caller at all (verified: nothing in
// frontend/src imports the corresponding superadmin.service.js functions,
// and the /bookings handler below referenced `mongoose`/`Booking` without
// importing either, so it would have thrown on its first real call) —
// removed as dead/broken code rather than implemented twice. Reviews
// management is handled separately by reviewModeration.routes.js, mounted
// at /api/v1/superadmin/reviews.

// ═══════════════════════════════════════════
// Bookings Management
// ═══════════════════════════════════════════

/**
 * @route   GET /api/v1/superadmin/bookings
 * @desc    Get all bookings with filters
 * @access  Super Admin
 */
router.get('/bookings', async (req, res) => {
  try {
    const { status, hotel, dateFrom, dateTo, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) {
      if (typeof status !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid status filter' });
      }
      query.status = status;
    }

    if (hotel) {
      if (!mongoose.Types.ObjectId.isValid(hotel)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid hotel id filter',
        });
      }
      query.hotel = hotel;
    }

    if (dateFrom || dateTo) {
      const range = {};
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      if (fromDate && !Number.isNaN(fromDate.getTime())) {
        range.$gte = fromDate;
      }
      if (toDate && !Number.isNaN(toDate.getTime())) {
        range.$lte = toDate;
      }
      if (Object.keys(range).length > 0) {
        query.checkIn = range;
      }
    }

    if (typeof search === 'string' && search) {
      const escaped = search.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { bookingId: regex },
        { confirmationCode: regex },
        { 'guestInfo.name': regex },
        { 'guestInfo.email': regex },
        { 'guestInfo.phone': regex },
      ];
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, parseInt(limit, 10) || 20);
    const skip = (parsedPage - 1) * parsedLimit;

    // Explicit projections: a bare populate('user') returned password hashes,
    // refresh/invite tokens and reset OTPs of every guest.
    const bookings = await Booking.find(query)
      .populate('user', 'fullname email contact')
      .populate('hotel', 'name location.city status')
      .populate('room', 'roomName roomNumber type')
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      total,
      totalPages: Math.ceil(total / parsedLimit),
      currentPage: parsedPage,
    });
  } catch (error) {
    console.error('[superadmin] Failed to fetch bookings:', error?.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
    });
  }
});

export default router;
