/**
 * Guest Dashboard - Bookings View
 * Current and past bookings list with modify/cancel functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getGuestBookings, modifyBooking, cancelBooking } from "../guestDashboardApi";
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
  Hash,
  BadgeCheck,
} from 'lucide-react';

const statusMeta = {
  Pending: { icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  Confirmed: { icon: CheckCircle2, className: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300' },
  'Checked-In': { icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  'Checked-Out': { icon: CheckCircle2, className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300' },
  Cancelled: { icon: XCircle, className: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  'No-Show': { icon: XCircle, className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' },
};

const FILTERS = ['all', 'Pending', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled'];

const BookingsView = () => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b1220]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8 bg-gray-50 dark:bg-[#0b1220]">
      {/* Header */}
      <div className="hidden lg:block bg-white/90 dark:bg-[#0f1c2e]/90 backdrop-blur-lg border-b border-gray-100 dark:border-white/5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-7">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">View and manage your current and past stays</p>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 flex-wrap mt-5 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
            {FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === status
                    ? 'bg-white dark:bg-teal-600 text-teal-700 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 lg:pt-8 pb-8">
        {/* Mobile: compact header + filter row */}
        <div className="lg:hidden mb-5">
          <p className="text-xl font-bold text-gray-900 dark:text-white">My Bookings</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Tap a card to manage</p>
          <div className="flex gap-2 overflow-x-auto pt-4 -mx-4 px-4 scrollbar-hide">
            {FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3.5 py-2 rounded-full font-semibold transition-all whitespace-nowrap text-sm shrink-0 ${
                  filter === status
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-300 font-semibold">Error loading bookings</p>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
            <button
              onClick={() => loadBookings(filter)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {bookings.length === 0 && !error ? (
          <div className="text-center py-16 bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
              <CalendarDays className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-gray-700 dark:text-gray-200 text-lg font-semibold">No bookings found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {filter === 'all'
                ? "You haven't made any bookings yet."
                : `No ${filter.toLowerCase()} bookings.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {bookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
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

const BookingCard = ({ booking, onModify, onCancel }) => {
  const checkInDate = booking?.checkIn ? new Date(booking.checkIn) : null;
  const checkOutDate = booking?.checkOut ? new Date(booking.checkOut) : null;
  const nights = checkInDate && checkOutDate
    ? Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)))
    : 0;

  const meta = statusMeta[booking.status] || { icon: BadgeCheck, className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300' };
  const StatusIcon = meta.icon;

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
    <div className="group bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm hover:shadow-lg dark:hover:shadow-black/30 transition-all overflow-hidden border border-gray-100 dark:border-white/5">
      {/* Image with gradient overlay + hotel name */}
      <div className="relative h-44 bg-gradient-to-br from-teal-500 to-emerald-600 overflow-hidden">
        {booking.hotel?.images?.[0] && (
          <img
            src={booking.hotel.images[0]}
            alt={booking.hotel.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span
          className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm ${meta.className}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {booking.status}
        </span>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-bold text-white drop-shadow-sm">{booking.hotel?.name || 'N/A'}</h3>
          <div className="flex items-center gap-1.5 text-xs text-white/85 mt-0.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{formatLocation(booking.hotel?.location)}</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Detail chips */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Check-in</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-0.5">
              {checkInDate ? checkInDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Check-out</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-0.5">
              {checkOutDate ? checkOutDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2.5 flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-teal-500 shrink-0" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Room</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{getRoomDisplay()}</p>
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-500 shrink-0" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Duration</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{nights} {nights === 1 ? 'night' : 'nights'}</p>
            </div>
          </div>
        </div>

        {/* Booking ID and confirmation code */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            {booking.bookingId || booking._id?.slice(-8) || 'N/A'}
          </span>
          {booking.confirmationCode && (
            <span className="font-mono text-gray-600 dark:text-gray-300">{booking.confirmationCode}</span>
          )}
        </div>

        {/* Action Buttons */}
        {(canModify() || canCancel()) && (
          <div className="mt-4 flex gap-2.5">
            {canModify() && (
              <button
                onClick={onModify}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors font-semibold text-sm"
              >
                <Edit2 className="w-4 h-4" />
                Modify
              </button>
            )}
            {canCancel() && (
              <button
                onClick={onCancel}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors font-semibold text-sm"
              >
                <X className="w-4 h-4" />
                Cancel
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-transparent dark:border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modify Booking</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
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
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
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
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              required
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Note: Modifications can only be made at least 24 hours before check-in.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-transparent dark:border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cancel Booking</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1.5">Cancellation Policy</p>
          <p className="text-sm text-red-700 dark:text-red-400">{refundPolicy}</p>
          <p className="text-lg font-bold text-red-900 dark:text-red-200 mt-2">
            Refund: NPR {refundAmount.toFixed(2)} ({refundPercentage}%)
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
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              placeholder="Please let us know why you're cancelling..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
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
