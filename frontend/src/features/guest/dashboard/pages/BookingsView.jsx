/**
 * Guest Dashboard - Bookings View
 * Current and past bookings list with modify/cancel functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getGuestBookings, modifyBooking, cancelBooking, requestRefund } from "../services/guestDashboardApi";
import { useTheme } from '../../../../core/hooks/useTheme';
import { toast } from 'react-toastify';
import {
  CalendarDays,
  MapPin,
  BedDouble,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Edit2,
  X,
} from 'lucide-react';

const BookingsView = () => {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadBookings = useCallback(async (statusFilter) => {
    try {
      setLoading(true);
      setError(null);

      const res = await getGuestBookings({ status: statusFilter !== 'all' ? statusFilter : undefined });

      // Handle different response formats
      const normalizedBookings = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.bookings)
            ? res.bookings
            : [];

      setBookings(normalizedBookings);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load bookings';
      setError(errorMessage);
      toast.error(errorMessage);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings(filter);
  }, [filter, loadBookings]);

  const handleModifyClick = (booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  const handleCancelClick = (booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const handleModifySuccess = () => {
    setShowModifyModal(false);
    setSelectedBooking(null);
    loadBookings(filter);
  };

  const handleCancelSuccess = () => {
    setShowCancelModal(false);
    setSelectedBooking(null);
    loadBookings(filter);
  };

  const statusIcons = {
    Pending: <Clock className="w-5 h-5 text-yellow-600" />,
    Confirmed: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
    'Checked-In': <CheckCircle2 className="w-5 h-5 text-green-600" />,
    'Checked-Out': <CheckCircle2 className="w-5 h-5 text-gray-600" />,
    Cancelled: <XCircle className="w-5 h-5 text-red-600" />,
    'No-Show': <XCircle className="w-5 h-5 text-orange-600" />,
  };

  const statusColors = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    'Checked-In': 'bg-green-100 text-green-700',
    'Checked-Out': 'bg-gray-100 text-gray-700',
    Cancelled: 'bg-red-100 text-red-700',
    'No-Show': 'bg-orange-100 text-orange-700',
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-linear-to-br from-slate-950 to-slate-900' : 'bg-linear-to-br from-indigo-50 to-blue-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="text-gray-500 dark:text-gray-400">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 md:pb-8 ${isDark ? 'bg-linear-to-br from-slate-950 via-slate-900 to-gray-950 text-gray-100' : 'bg-linear-to-br from-indigo-50 via-blue-50 to-cyan-50'}`}>
      {/* Header */}
      <div className="hidden md:block bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Bookings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">View your current and past stays</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'Pending', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === status
                    ? 'bg-linear-to-r from-indigo-500 to-blue-500 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 md:pt-8 pb-8">
        {/* Mobile: compact filter row */}
        <div className="md:hidden mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">My Bookings</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Tap a card to manage</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pt-3 scrollbar-hide">
            {['all', 'Pending', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-2 rounded-xl font-medium transition-all whitespace-nowrap text-sm ${
                  filter === status
                    ? 'bg-linear-to-r from-indigo-500 to-blue-500 text-white shadow-md'
                    : 'bg-white/90 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-slate-700'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-300 font-medium">Error loading bookings</p>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
            <button
              onClick={() => loadBookings(filter)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {bookings.length === 0 && !error ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-transparent dark:border-slate-800">
            <CalendarDays className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No bookings found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              {filter === 'all'
                ? "You haven't made any bookings yet."
                : `No ${filter.toLowerCase()} bookings.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                statusIcon={statusIcons[booking.status]}
                statusColor={statusColors[booking.status]}
                onModify={() => handleModifyClick(booking)}
                onCancel={() => handleCancelClick(booking)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modify Booking Modal */}
      {showModifyModal && selectedBooking && (
        <ModifyBookingModal
          booking={selectedBooking}
          onClose={() => {
            setShowModifyModal(false);
            setSelectedBooking(null);
          }}
          onSuccess={handleModifySuccess}
        />
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && selectedBooking && (
        <CancelBookingModal
          booking={selectedBooking}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedBooking(null);
          }}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const BookingCard = ({ booking, statusIcon, statusColor, onModify, onCancel }) => {
  const checkInDate = booking?.checkIn ? new Date(booking.checkIn) : null;
  const checkOutDate = booking?.checkOut ? new Date(booking.checkOut) : null;
  const nights = checkInDate && checkOutDate
    ? Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)))
    : 0;

  // Format location - handle both object and string formats
  const formatLocation = (location) => {
    if (!location) return 'N/A';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      const parts = [location.city, location.address].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'N/A';
    }
    return 'N/A';
  };

  // Get room display text - show room type if room number not assigned
  const getRoomDisplay = () => {
    if (booking.room?.roomNumber) {
      return booking.room.roomNumber;
    }
    if (booking.room?.type) {
      return `${booking.room.type} Room`;
    }
    return 'TBD';
  };

  // Check if booking can be modified (24h before check-in, status Pending/Confirmed)
  const canModify = () => {
    if (!['Pending', 'Confirmed'].includes(booking.status)) return false;
    if (!checkInDate) return false;
    const hoursUntilCheckIn = (checkInDate - new Date()) / (1000 * 60 * 60);
    return hoursUntilCheckIn >= 24;
  };

  // Check if booking can be cancelled
  const canCancel = () => {
    return !['Cancelled', 'Checked-Out', 'No-Show'].includes(booking.status);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-100 dark:border-slate-800">
      {booking.hotel?.images?.[0] && (
        <img
          src={booking.hotel.images[0]}
          alt={booking.hotel.name}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{booking.hotel?.name || 'N/A'}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{formatLocation(booking.hotel?.location)}</span>
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${statusColor} shrink-0`}
          >
            {statusIcon}
            {booking.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Check-in</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {checkInDate ? checkInDate.toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Check-out</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {checkOutDate ? checkOutDate.toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Room</p>
            <div className="flex items-center gap-1">
              <BedDouble className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {getRoomDisplay()}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Duration</p>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <p className="font-medium text-gray-900 dark:text-gray-100">{nights} {nights === 1 ? 'night' : 'nights'}</p>
            </div>
          </div>
        </div>

        {/* Booking ID and confirmation code */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-sm">
          <div className="text-gray-500 dark:text-gray-400">
            <span className="font-medium">Booking ID: </span>
            <span className="text-gray-700 dark:text-gray-300">{booking.bookingId || booking._id?.slice(-8) || 'N/A'}</span>
          </div>
          {booking.confirmationCode && (
            <div className="text-gray-500 dark:text-gray-400">
              <span className="font-medium">Confirmation: </span>
              <span className="text-gray-700 dark:text-gray-300">{booking.confirmationCode}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {(canModify() || canCancel()) && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex gap-3">
            {canModify() && (
              <button
                onClick={onModify}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Modify Booking
              </button>
            )}
            {canCancel() && (
              <button
                onClick={onCancel}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <X className="w-4 h-4" />
                Cancel Booking
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Modify Booking Modal
// ────────────────────────────────────────

const ModifyBookingModal = ({ booking, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    checkIn: booking.checkIn ? new Date(booking.checkIn).toISOString().split('T')[0] : '',
    checkOut: booking.checkOut ? new Date(booking.checkOut).toISOString().split('T')[0] : '',
    numGuests: booking.numGuests || 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await modifyBooking(booking._id, formData);

      if (res?.success) {
        toast.success('Booking modified successfully!');
        onSuccess();
      }
    } catch (error) {
      console.error('Modify booking error:', error);
      toast.error(error.response?.data?.message || 'Failed to modify booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Modify Booking</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Check-in Date
            </label>
            <input
              type="date"
              value={formData.checkIn}
              onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Check-out Date
            </label>
            <input
              type="date"
              value={formData.checkOut}
              onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
              min={formData.checkIn}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Guests
            </label>
            <input
              type="number"
              value={formData.numGuests}
              onChange={(e) => setFormData({ ...formData, numGuests: parseInt(e.target.value) })}
              min="1"
              max="10"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Note: Modifications can only be made at least 24 hours before check-in.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Cancel Booking Modal
// ─────────────────────────────────────────

const CancelBookingModal = ({ booking, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  // Calculate refund info
  const calculateRefund = () => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);

    let refundPercentage = 0;
    let refundPolicy = '';

    if (hoursUntilCheckIn >= 48) {
      refundPercentage = 100;
      refundPolicy = 'Full refund (48+ hours before check-in)';
    } else if (hoursUntilCheckIn >= 24) {
      refundPercentage = 50;
      refundPolicy = '50% refund (24-48 hours before check-in)';
    } else {
      refundPercentage = 0;
      refundPolicy = 'No refund (less than 24 hours before check-in)';
    }

    const refundAmount = (booking.totalAmount * refundPercentage) / 100;

    return { refundAmount, refundPercentage, refundPolicy };
  };

  const { refundAmount, refundPercentage, refundPolicy } = calculateRefund();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await cancelBooking(booking._id, { reason });

      if (res?.success) {
        toast.success('Booking cancelled successfully!');
        onSuccess();
      }
    } catch (error) {
      console.error('Cancel booking error:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Cancel Booking</h2>

        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Cancellation Policy</p>
          <p className="text-sm text-red-700 dark:text-red-400">{refundPolicy}</p>
          <p className="text-lg font-bold text-red-900 dark:text-red-200 mt-2">
            Refund: ${refundAmount.toFixed(2)} ({refundPercentage}%)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Cancellation (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Please let us know why you're cancelling..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Cancelling...
                </span>
              ) : (
                'Confirm Cancellation'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors"
            >
              Keep Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingsView;
