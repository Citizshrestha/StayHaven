import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Lock, CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import * as paymentService from '../../core/api/services/payment.service'; // Ensure correct relative path

// Initialize Stripe (Load asynchronously)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * StripePaymentModal Component
 * Handles the creation of PaymentIntent via backend and wraps the Stripe Elements.
 */
const StripePaymentModal = ({ isOpen, onClose, invoice, onSuccess }) => {
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && invoice?.balance > 0) {
      setLoading(true);
      setError('');
      setClientSecret(null); // Reset previous session

      // Create Payment Intent on the server
      paymentService.createPaymentIntent({
        amount: invoice.balance,
        currency: 'usd', // Match your backend logic
        bookingId: invoice.bookingId || invoice._id,
      })
        .then((response) => {
          if (response.success && response.data?.clientSecret) {
            setClientSecret(response.data.clientSecret);
          } else {
            setError('Could not initialize payment session.');
          }
        })
        .catch((err) => {
          console.error(err);
          setError(err.message || 'Failed to connect to payment gateway.');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, invoice]);

  // Handle closing and resetting
  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null);
      setError('');
    }
  }, [isOpen]);

  // --- UI Render ---

  if (!isOpen) return null;

  if (!invoice || invoice.balance <= 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Invoice Settled</h3>
          <p className="text-gray-500 mt-2 mb-6">No balance due for this invoice.</p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock size={16} className="text-green-600" />
            Secure Payment
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Invoice Info */}
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Amount to Pay</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">${invoice.balance?.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Invoice Ref</p>
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300 font-medium">{invoice.id || 'N/A'}</p>
            </div>
          </div>

          {/* Errors */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
              <p className="text-gray-500 text-sm">Connecting to payment gateway...</p>
            </div>
          )}

          {/* Stripe Elements */}
          {clientSecret && !loading && (
            <Elements options={{ clientSecret }} stripe={stripePromise}>
              <CheckoutForm
                amount={invoice.balance}
                onSuccess={onSuccess}
                onClose={onClose}
              />
            </Elements>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-950 text-center border-t dark:border-gray-800">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <Lock size={12} /> Encrypted & Powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Internal Checkout Form
 * Uses Stripe Hooks to handle the actual payment confirmation
 */
const CheckoutForm = ({ amount, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // Confirm Payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-confirmation',
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message);
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment Success: Notify parent component to update Backend DB
        onSuccess(paymentIntent);
      } else {
        setError('Payment processing failed. Please try again.');
        setProcessing(false);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: { type: 'tabs', defaultCollapsed: false },
        }}
      />
      
      {error && (
        <div className="text-xs text-red-600 mb-2">{error}</div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20"
      >
        {processing ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Processing...
          </>
        ) : (
          <>
            <CreditCard size={18} />
            Pay ${amount.toFixed(2)}
          </>
        )}
      </button>
    </form>
  );
};

export default StripePaymentModal;