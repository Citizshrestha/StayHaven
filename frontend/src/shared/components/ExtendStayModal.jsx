/**
 * Extend Stay Modal Component
 * 
 * Allows guests to extend their current booking
 * with real-time availability checking and pricing
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';

const ExtendStayModal = ({ 
  isOpen, 
  onClose, 
  booking,
  onExtendSuccess 
}) => {
  const [additionalNights, setAdditionalNights] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [extending, setExtending] = useState(false);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAdditionalNights(1);
      setAvailability(null);
      setSuccess(false);
      setExtending(false);
    }
  }, [isOpen]);

  // Check availability when nights change
  useEffect(() => {
    if (isOpen && booking && additionalNights > 0) {
      checkAvailability();
    }
  }, [isOpen, booking, additionalNights]);

  if (!isOpen || !booking) return null;

  const checkAvailability = async () => {
    try {
      setChecking(true);
      const { checkExtensionAvailability } = await import('../../features/guest/dashboard/guestDashboardApi');
      const result = await checkExtensionAvailability(booking._id, additionalNights);
      
      if (result.success) {
        setAvailability(result.data);
      }
    } catch (error) {
      console.error('Availability check error:', error);
      toast.error(error.response?.data?.message || 'Failed to check availability');
    } finally {
      setChecking(false);
    }
  };

  const handleExtend = async () => {
    if (extending) return;

    // Validate
    if (!availability?.canExtend) {
      toast.error('Room is not available for extension');
      return;
    }

    if (!availability?.requestedAvailable) {
      toast.error(`Only ${availability.maxAvailableNights} nights available`);
      return;
    }

    setExtending(true);

    try {
      const { extendBooking } = await import('../../features/guest/dashboard/guestDashboardApi');
      const result = await extendBooking(booking._id, additionalNights);

      if (result.success) {
        setSuccess(true);
        toast.success(`Booking extended by ${additionalNights} night(s)!`);
        
        // Call success callback after short delay
        setTimeout(() => {
          onExtendSuccess(result.data);
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Extend booking error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to extend booking';
      toast.error(errorMsg);
      setExtending(false);
    }
  };

  const currentCheckOut = new Date(booking.checkOut);
  const newCheckOut = new Date(currentCheckOut);
  newCheckOut.setDate(newCheckOut.getDate() + additionalNights);

  const pricePerNight = availability?.pricePerNight || 0;
  const totalCost = pricePerNight * additionalNights;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Extend Your Stay</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add more nights to your booking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={extending}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Booking Info */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-teal-100 dark:border-teal-800">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Current Booking</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Room</span>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{booking.room?.roomNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Current Checkout</span>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {currentCheckOut.toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Nights Remaining</span>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{booking.nightsLeft || 0}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Status</span>
                <p className="font-semibold text-teal-600 dark:text-teal-400">{booking.status}</p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start gap-3 animate-slideDown">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">Booking Extended!</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your stay has been extended by {additionalNights} night(s). Redirecting...
                </p>
              </div>
            </div>
          )}

          {/* Extension Configuration */}
          {!success && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  How many additional nights?
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setAdditionalNights(Math.max(1, additionalNights - 1))}
                    disabled={additionalNights <= 1 || extending}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={additionalNights}
                      onChange={(e) => setAdditionalNights(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                      disabled={extending}
                      className="w-full text-center text-4xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none focus:outline-none"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {additionalNights === 1 ? 'night' : 'nights'}
                    </p>
                  </div>
                  <button
                    onClick={() => setAdditionalNights(Math.min(30, additionalNights + 1))}
                    disabled={additionalNights >= 30 || extending}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Availability Status */}
              {checking ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">Checking availability...</p>
                </div>
              ) : availability ? (
                availability.canExtend ? (
                  availability.requestedAvailable ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                          Room Available
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Room {availability.room.roomNumber} is available for {additionalNights} additional night(s)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                          Limited Availability
                        </h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          Only {availability.maxAvailableNights} night(s) available. Another booking starts on{' '}
                          {new Date(availability.blockedBy?.checkIn).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                        Room Not Available
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        This room is not available for extension. Please contact the front desk for alternative options.
                      </p>
                    </div>
                  </div>
                )
              ) : null}

              {/* New Dates */}
              {availability?.requestedAvailable && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">New Booking Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">New Checkout Date</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {newCheckOut.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Nights</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {(booking.durationNights || 0) + additionalNights}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Price per Night</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          Rs. {pricePerNight.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-900 dark:text-gray-100 font-semibold">Additional Cost</span>
                        <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                          Rs. {totalCost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Notice */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Payment Information
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    The additional cost will be added to your bill. You can pay at checkout or through the billing section.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              disabled={extending}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExtend}
              disabled={extending || !availability?.requestedAvailable || checking}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {extending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Extending...
                </>
              ) : (
                <>
                  <DollarSign className="w-5 h-5" />
                  Extend Stay - Rs. {totalCost.toLocaleString()}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

ExtendStayModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  booking: PropTypes.object,
  onExtendSuccess: PropTypes.func.isRequired,
};

export default ExtendStayModal;
