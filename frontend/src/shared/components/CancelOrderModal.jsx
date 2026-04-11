/**
 * Cancel Order Modal Component
 * 
 * Allows guests to cancel their orders with reason selection
 * Shows cancellation policy and confirmation
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';

const CancelOrderModal = ({ 
  isOpen, 
  onClose, 
  order,
  onCancelSuccess 
}) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [canCancel, setCanCancel] = useState(null);
  const [success, setSuccess] = useState(false);

  // Predefined cancellation reasons
  const reasons = [
    'Changed my mind',
    'Ordered by mistake',
    'Taking too long',
    'Want to order something else',
    'No longer hungry',
    'Other (specify below)',
  ];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setCustomReason('');
      setCanCancel(null);
      setSuccess(false);
      setCancelling(false);
    }
  }, [isOpen]);

  // Check if order can be cancelled when modal opens
  useEffect(() => {
    if (isOpen && order) {
      checkCancellable();
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const checkCancellable = async () => {
    try {
      setChecking(true);
      const { checkOrderCancellable } = await import('../../features/guest/dashboard/guestDashboardApi');
      const result = await checkOrderCancellable(order._id);
      
      if (result.success) {
        setCanCancel(result.data);
      }
    } catch (error) {
      console.error('Cancellable check error:', error);
      toast.error(error.response?.data?.message || 'Failed to check cancellation status');
    } finally {
      setChecking(false);
    }
  };

  const handleCancel = async () => {
    if (cancelling) return;

    // Validate reason
    const finalReason = reason === 'Other (specify below)' 
      ? customReason.trim() 
      : reason;

    if (!finalReason) {
      toast.error('Please select or enter a cancellation reason');
      return;
    }

    if (!canCancel?.canCancel) {
      toast.error('This order cannot be cancelled');
      return;
    }

    setCancelling(true);

    try {
      const { cancelOrder } = await import('../../features/guest/dashboard/guestDashboardApi');
      const result = await cancelOrder(order._id, finalReason);

      if (result.success) {
        setSuccess(true);
        toast.success('Order cancelled successfully!');
        
        // Call success callback after short delay
        setTimeout(() => {
          onCancelSuccess(result.data);
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Cancel order error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to cancel order';
      toast.error(errorMsg);
      setCancelling(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-sky-100 text-sky-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cancel Order</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Order #{order.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={cancelling}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Order Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Order Number</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">#{order.orderNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {order.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Items</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{order.items?.length || 0} items</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">Rs. {order.totalPrice?.toLocaleString()}</span>
              </div>
              {order.roomNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Room</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{order.roomNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start gap-3 animate-slideDown">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">Order Cancelled!</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your order has been cancelled successfully. Closing...
                </p>
              </div>
            </div>
          )}

          {/* Checking Status */}
          {checking && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">Checking cancellation status...</p>
            </div>
          )}

          {/* Cannot Cancel Message */}
          {!checking && canCancel && !canCancel.canCancel && !success && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                  Cannot Cancel Order
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                  {canCancel.reason}
                </p>
                {canCancel.contactStaff && (
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Please contact hotel staff for assistance.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cancellation Form */}
          {!checking && canCancel?.canCancel && !success && (
            <>
              {/* Cancellation Policy */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Cancellation Policy
                  </h4>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Orders can be cancelled before preparation starts</li>
                    <li>• No charges for cancelled orders</li>
                    <li>• Kitchen and staff will be notified immediately</li>
                    <li>• You can place a new order anytime</li>
                  </ul>
                </div>
              </div>

              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Why are you cancelling? *
                </label>
                <div className="space-y-2">
                  {reasons.map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        reason === r
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={cancelling}
                        className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Reason Input */}
              {reason === 'Other (specify below)' && (
                <div className="animate-slideDown">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Please specify your reason
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    disabled={cancelling}
                    placeholder="Enter your reason for cancellation..."
                    rows="3"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-900 dark:text-gray-100 resize-none"
                  />
                </div>
              )}

              {/* Warning */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                    Are you sure?
                  </h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    This action cannot be undone. The kitchen and staff will be notified immediately.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && canCancel?.canCancel && (
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              disabled={cancelling}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Keep Order
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling || !reason || (reason === 'Other (specify below)' && !customReason.trim())}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Cancel Order
                </>
              )}
            </button>
          </div>
        )}

        {/* Close Button for Cannot Cancel */}
        {!success && canCancel && !canCancel.canCancel && (
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
            >
              Close
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

CancelOrderModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  order: PropTypes.object,
  onCancelSuccess: PropTypes.func.isRequired,
};

export default CancelOrderModal;
