import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
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

// ═══════════════════════════════════════════
// Hotels Management (existing routes)
// ═══════════════════════════════════════════

/**
 * @route   GET /api/v1/superadmin/hotels
 * @desc    Get all hotels with filters
 * @access  Super Admin
 */
router.get('/hotels', async (req, res) => {
  try {
    const { status, type, search, sortBy } = req.query;

    // TODO: Implement actual hotel fetching with filters
    const hotels = [
      {
        id: 1,
        name: 'Hotel Annapurna',
        location: 'Kathmandu, Nepal',
        type: 'Luxury',
        status: 'active',
        rating: 4.8,
        reviews: 234,
        revenue: 245000,
        bookings: 89,
        commission: 15,
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
        featured: true,
      },
      {
        id: 2,
        name: 'Soaltee Crown Plaza',
        location: 'Kathmandu, Nepal',
        type: 'Luxury',
        status: 'active',
        rating: 4.7,
        reviews: 189,
        revenue: 198000,
        bookings: 67,
        commission: 15,
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400',
        featured: true,
      },
    ];

    res.json({
      success: true,
      data: hotels,
      total: hotels.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotels',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/superadmin/hotels/pending
 * @desc    Get hotels pending approval
 * @access  Super Admin
 */
router.get('/hotels/pending', async (req, res) => {
  try {
    // TODO: Implement actual pending hotels fetching
    const pendingHotels = [
      {
        id: 5,
        name: 'Mountain View Resort',
        location: 'Pokhara, Nepal',
        type: 'Resort',
        status: 'pending',
        submittedDate: '2026-05-18',
        image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400',
      },
      {
        id: 6,
        name: 'Lakeside Boutique Hotel',
        location: 'Pokhara, Nepal',
        type: 'Boutique',
        status: 'pending',
        submittedDate: '2026-05-17',
        image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400',
      },
    ];

    res.json({
      success: true,
      data: pendingHotels,
      total: pendingHotels.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending hotels',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/superadmin/hotels/stats
 * @desc    Get hotel statistics
 * @access  Super Admin
 */
router.get('/hotels/stats', async (req, res) => {
  try {
    // TODO: Implement actual stats calculation
    const stats = {
      total: 47,
      active: 39,
      pending: 8,
      suspended: 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel stats',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/superadmin/hotels/:id/approve
 * @desc    Approve a pending hotel
 * @access  Super Admin
 */
router.post('/hotels/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Implement actual hotel approval logic
    // - Update hotel status to 'active'
    // - Send notification to hotel owner
    // - Create audit log

    res.json({
      success: true,
      message: 'Hotel approved successfully',
      data: { id, status: 'active' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve hotel',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/superadmin/hotels/:id/reject
 * @desc    Reject a pending hotel
 * @access  Super Admin
 */
router.post('/hotels/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // TODO: Implement actual hotel rejection logic
    // - Update hotel status to 'rejected'
    // - Send notification to hotel owner with reason
    // - Create audit log

    res.json({
      success: true,
      message: 'Hotel rejected successfully',
      data: { id, status: 'rejected', reason },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject hotel',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/superadmin/hotels/:id/suspend
 * @desc    Suspend an active hotel
 * @access  Super Admin
 */
router.post('/hotels/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // TODO: Implement actual hotel suspension logic
    // - Update hotel status to 'suspended'
    // - Hide hotel from public listings
    // - Send notification to hotel owner
    // - Create audit log

    res.json({
      success: true,
      message: 'Hotel suspended successfully',
      data: { id, status: 'suspended', reason },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to suspend hotel',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/superadmin/hotels/:id
 * @desc    Get detailed hotel information
 * @access  Super Admin
 */
router.get('/hotels/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Implement actual hotel detail fetching
    const hotel = {
      id,
      name: 'Hotel Annapurna',
      location: 'Kathmandu, Nepal',
      type: 'Luxury',
      status: 'active',
      // ... more details
    };

    res.json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel details',
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════
// Users Management
// ═══════════════════════════════════════════

/**
 * @route   GET /api/v1/superadmin/users
 * @desc    Get all users with filters
 * @access  Super Admin
 */
router.get('/users', async (req, res) => {
  try {
    const { role, status, search } = req.query;

    // TODO: Implement actual user fetching with filters
    res.json({
      success: true,
      data: [],
      total: 0,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
});

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

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    const bookings = await Booking.find(query)
      .populate(['user', 'hotel', 'room', 'company'])
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════
// Revenue & Finance
// ═══════════════════════════════════════════

/**
 * @route   GET /api/v1/superadmin/revenue
 * @desc    Get revenue analytics
 * @access  Super Admin
 */
router.get('/revenue', async (req, res) => {
  try {
    const { period } = req.query; // 7d, 30d, 90d, etc.

    // TODO: Implement actual revenue analytics
    res.json({
      success: true,
      data: {
        total: 1250450,
        byPeriod: [],
        byHotel: [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue data',
      error: error.message,
    });
  }
});

// Reviews management is handled by reviewModeration.routes.js
// mounted at /api/v1/superadmin/reviews

// ═══════════════════════════════════════════
// System Settings
// ═══════════════════════════════════════════

/**
 * @route   GET /api/v1/superadmin/settings
 * @desc    Get system settings
 * @access  Super Admin
 */
router.get('/settings', async (req, res) => {
  try {
    // TODO: Implement actual settings fetching
    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/v1/superadmin/settings
 * @desc    Update system settings
 * @access  Super Admin
 */
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;

    // TODO: Implement actual settings update
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
    });
  }
});

export default router;
