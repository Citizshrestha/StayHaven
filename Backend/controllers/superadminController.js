import mongoose from 'mongoose';
import { Booking } from '../models/booking.schema.js';
import { Hotel } from '../models/hotel.schema.js';
import { User } from '../models/user.schema.js';
import { Guest } from '../models/guest.schema.js';

/**
 * Super Admin Controller
 * Production-ready implementations for superadmin dashboard
 */

// ═══════════════════════════════════════════
// Dashboard & Analytics
// ═══════════════════════════════════════════

/**
 * @desc    Get platform-wide metrics
 * @route   GET /api/v1/superadmin/dashboard/metrics
 * @access  Super Admin
 */
export const getDashboardMetrics = async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    let previousStartDate = new Date();

    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        previousStartDate.setHours(now.getHours() - 48);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        previousStartDate.setDate(now.getDate() - 14);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        previousStartDate.setDate(now.getDate() - 60);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        previousStartDate.setDate(now.getDate() - 180);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
        previousStartDate.setDate(now.getDate() - 14);
    }

    // Get current period bookings
    const currentBookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: now },
      status: { $in: ['Confirmed', 'Checked-In', 'Checked-Out'] }
    });

    // Get previous period bookings for comparison
    const previousBookings = await Booking.find({
      createdAt: { $gte: previousStartDate, $lt: startDate },
      status: { $in: ['Confirmed', 'Checked-In', 'Checked-Out'] }
    });

    // Calculate total revenue (15% commission on confirmed bookings)
    const currentRevenue = currentBookings.reduce((sum, booking) => {
      const commission = booking.totalAmount * 0.15;
      return sum + commission;
    }, 0);

    const previousRevenue = previousBookings.reduce((sum, booking) => {
      const commission = booking.totalAmount * 0.15;
      return sum + commission;
    }, 0);

    const revenueChange = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    // Get active users count (users who logged in or made bookings in period)
    const activeUsers = await User.countDocuments({
      $or: [
        { lastLogin: { $gte: startDate } },
        { _id: { $in: currentBookings.map(b => b.user).filter(Boolean) } }
      ]
    });

    const previousActiveUsers = await User.countDocuments({
      $or: [
        { lastLogin: { $gte: previousStartDate, $lt: startDate } },
        { _id: { $in: previousBookings.map(b => b.user).filter(Boolean) } }
      ]
    });

    const usersChange = previousActiveUsers > 0
      ? ((activeUsers - previousActiveUsers) / previousActiveUsers) * 100
      : 0;

    // Get pending hotels
    const pendingHotels = await Hotel.countDocuments({ status: 'pending' });

    // Get pending reviews (assuming we'll add a Review model later)
    const pendingReviews = 0; // TODO: Implement when Review model exists

    const metrics = {
      revenue: {
        value: Math.round(currentRevenue),
        change: parseFloat(revenueChange.toFixed(1)),
        trend: revenueChange >= 0 ? 'up' : 'down',
        currency: 'NPR'
      },
      commission: {
        value: Math.round(currentRevenue),
        change: parseFloat(revenueChange.toFixed(1)),
        trend: revenueChange >= 0 ? 'up' : 'down',
        averageRate: 15,
        currency: 'NPR'
      },
      activeUsers: {
        value: activeUsers,
        change: parseFloat(usersChange.toFixed(1)),
        trend: usersChange >= 0 ? 'up' : 'down',
        description: 'Guests & staff active'
      },
      pendingApprovals: {
        hotels: pendingHotels,
        reviews: pendingReviews,
        description: 'Requires moderation'
      }
    };

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get recent bookings for dashboard
 * @route   GET /api/v1/superadmin/dashboard/recent-bookings
 * @access  Super Admin
 */
export const getRecentBookings = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const bookings = await Booking.find()
      .populate('hotel', 'name')
      .populate('user', 'fullname email')
      .populate('guestInfo')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const formattedBookings = bookings.map(booking => {
      const guestName = booking.user?.fullname || booking.guestInfo?.name || 'Guest';
      const guestEmail = booking.user?.email || booking.guestInfo?.email || 'N/A';
      const commission = Math.round(booking.totalAmount * 0.15);

      return {
        guest: guestName,
        email: guestEmail,
        hotel: booking.hotel?.name || 'Unknown Hotel',
        date: booking.createdAt,
        amount: booking.totalAmount,
        commission: commission,
        currency: booking.currency || 'NPR',
        status: booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus === 'unpaid' ? 'Pending' : 'Cancelled',
        statusType: booking.paymentStatus === 'paid' ? 'success' : booking.paymentStatus === 'unpaid' ? 'warning' : 'error'
      };
    });

    res.json({
      success: true,
      data: formattedBookings,
    });
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent bookings',
      error: error.message,
    });
  }
};

/**
 * @desc    Get recent platform activity
 * @route   GET /api/v1/superadmin/dashboard/activity
 * @access  Super Admin
 */
export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get recent bookings
    const recentBookings = await Booking.find({ status: 'Confirmed' })
      .populate('hotel', 'name')
      .populate('user', 'fullname')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) / 2)
      .lean();

    // Get recently added hotels
    const recentHotels = await Hotel.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) / 2)
      .lean();

    const activities = [];

    // Add booking activities
    recentBookings.forEach(booking => {
      const timeDiff = Date.now() - new Date(booking.createdAt).getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      const timeStr = minutesAgo < 60
        ? `${minutesAgo} min ago`
        : minutesAgo < 1440
          ? `${Math.floor(minutesAgo / 60)} hours ago`
          : `${Math.floor(minutesAgo / 1440)} days ago`;

      activities.push({
        time: timeStr,
        action: 'New booking confirmed',
        detail: `${booking.user?.fullname || 'Guest'} booked at ${booking.hotel?.name || 'Unknown Hotel'}`,
        badge: 'Booking',
        status: 'success',
        timestamp: booking.createdAt
      });
    });

    // Add hotel activities
    recentHotels.forEach(hotel => {
      const timeDiff = Date.now() - new Date(hotel.createdAt).getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      const timeStr = minutesAgo < 60
        ? `${minutesAgo} min ago`
        : minutesAgo < 1440
          ? `${Math.floor(minutesAgo / 60)} hours ago`
          : `${Math.floor(minutesAgo / 1440)} days ago`;

      activities.push({
        time: timeStr,
        action: 'Hotel registered',
        detail: `${hotel.name} submitted verification documents`,
        badge: 'Hotel',
        status: 'warning',
        timestamp: hotel.createdAt
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: activities.slice(0, parseInt(limit)),
    });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity feed',
      error: error.message,
    });
  }
};

/**
 * @desc    Get revenue analytics with time series data
 * @route   GET /api/v1/superadmin/dashboard/revenue
 * @access  Super Admin
 */
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    const now = new Date();
    let startDate = new Date();
    let previousStartDate = new Date();
    let dataPoints = 7;

    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        previousStartDate.setHours(now.getHours() - 48);
        dataPoints = 24;
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        previousStartDate.setDate(now.getDate() - 14);
        dataPoints = 7;
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        previousStartDate.setDate(now.getDate() - 60);
        dataPoints = 30;
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        previousStartDate.setDate(now.getDate() - 180);
        dataPoints = 90;
        break;
      default:
        startDate.setDate(now.getDate() - 7);
        previousStartDate.setDate(now.getDate() - 14);
        dataPoints = 7;
    }

    // Get bookings for current period
    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: now },
      status: { $in: ['Confirmed', 'Checked-In', 'Checked-Out'] }
    }).lean();

    // Calculate net sales and commission
    const netSales = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const platformFee = Math.round(netSales * 0.15);

    // Get previous period for growth calculation
    const previousBookings = await Booking.find({
      createdAt: { $gte: previousStartDate, $lt: startDate },
      status: { $in: ['Confirmed', 'Checked-In', 'Checked-Out'] }
    }).lean();

    const previousSales = previousBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const growthRate = previousSales > 0
      ? ((netSales - previousSales) / previousSales) * 100
      : 0;

    res.json({
      success: true,
      data: {
        netSales: Math.round(netSales),
        growthRate: parseFloat(growthRate.toFixed(1)),
        platformFee: platformFee,
        currency: 'NPR',
        period: period
      },
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get commission breakdown by hotel type
 * @route   GET /api/v1/superadmin/dashboard/commission-breakdown
 * @access  Super Admin
 */
export const getCommissionBreakdown = async (req, res) => {
  try {
    // Get all hotels with their categories
    const hotels = await Hotel.find({ status: { $in: ['active', 'approved'] } })
      .select('category name')
      .lean();

    const categories = ['Luxury Hotels', 'Boutique Hotels', 'Resort Hotels', 'Budget Hotels'];
    const categoryMapping = {
      'Hotel': 'Luxury Hotels',
      'Resort': 'Resort Hotels',
      'Boutique': 'Boutique Hotels',
      'Budget': 'Budget Hotels'
    };

    const breakdown = await Promise.all(categories.map(async (category) => {
      // Map category to hotel types
      const hotelCategory = Object.keys(categoryMapping).find(key => categoryMapping[key] === category) || 'Hotel';

      const categoryHotels = hotels.filter(h => h.category === hotelCategory);
      const totalCategoryHotels = await Hotel.countDocuments({ category: hotelCategory });

      // Calculate percentage based on total hotels in that category
      const percentage = totalCategoryHotels > 0
        ? Math.min(100, Math.round((categoryHotels.length / totalCategoryHotels) * 100))
        : 0;

      // Commission rates by category
      const rates = {
        'Luxury Hotels': 15,
        'Boutique Hotels': 12,
        'Resort Hotels': 10,
        'Budget Hotels': 8
      };

      return {
        type: category,
        percentage: percentage || 25, // Default if no data
        rate: `${rates[category]}%`
      };
    }));

    res.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    console.error('Error fetching commission breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commission breakdown',
      error: error.message,
    });
  }
};

/**
 * @desc    Get pending actions requiring attention
 * @route   GET /api/v1/superadmin/dashboard/pending-actions
 * @access  Super Admin
 */
export const getPendingActions = async (req, res) => {
  try {
    // Get pending hotels count
    const pendingHotels = await Hotel.countDocuments({ status: 'pending' });

    // Get pending reviews count (placeholder - implement when Review model exists)
    const pendingReviews = 0;

    // Get upcoming payouts (bookings checked out but not yet processed for payout)
    const upcomingPayouts = await Booking.countDocuments({
      status: 'Checked-Out',
      paymentStatus: 'paid',
      // Add payout processed flag when implementing payout system
    });

    const actions = [
      {
        type: 'hotel',
        count: pendingHotels,
        text: `${pendingHotels} Hotels awaiting verification`,
        severity: 'warning'
      },
      {
        type: 'review',
        count: pendingReviews,
        text: `${pendingReviews} Guest reviews pending moderation`,
        severity: 'info'
      },
      {
        type: 'payout',
        count: upcomingPayouts,
        text: `${upcomingPayouts} Hotel payouts due for processing`,
        severity: upcomingPayouts > 0 ? 'danger' : 'info'
      }
    ];

    res.json({
      success: true,
      data: actions,
    });
  } catch (error) {
    console.error('Error fetching pending actions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending actions',
      error: error.message,
    });
  }
};
