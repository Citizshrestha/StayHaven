import { useState, useEffect, useRef } from 'react';
import { X, CreditCard, Loader2, CheckCircle2, AlertCircle, Shield, Lock, ExternalLink, LogIn } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  createBookingWithPayment, verifyCardPayment, isAuthenticated,
  getPaymentGatewayConfig, getCheckoutIdempotencyKey, rememberPaymentAttempt, redirectToWalletPayment,
} from '../../../../core/api/services/publicBooking.service';
import PropTypes from 'prop-types';

// Loaded once at module scope, same pattern as StripePaymentModal.jsx
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Card payment step — rendered once the backend has created a pending
 * booking + Stripe PaymentIntent. Card number/CVV are typed directly into
 * Stripe's own hosted iframe (PaymentElement) and never touch this app's
 * server; only Stripe's `stripe.confirmPayment` call sees them.
 */
const CardCheckoutForm = ({ amount, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (stripeError) {
        setFormError(stripeError.message || 'Card payment failed.');
        setSubmitting(false);
        return;
      }

      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        setFormError('Payment could not be completed. Please try again.');
        setSubmitting(false);
        return;
      }

      // Stripe confirmed the charge — now ask our server to verify it
      // directly with Stripe and mark the booking paid. This is the only
      // point at which the booking is actually finalized.
      await onSuccess(paymentIntent.id);
    } catch (err) {
      setFormError('Payment could not be confirmed. Check your booking before paying again.');
      setSubmitting(false);
      onError?.(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-slideDown">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Your card details are encrypted and handled directly by Stripe</span>
        </div>
        <PaymentElement options={{ layout: { type: 'tabs', defaultCollapsed: false } }} />
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full px-6 py-3 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] hover:from-[#00A896] hover:to-[#00D4BB] text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Pay NPR {amount.toLocaleString()}
          </>
        )}
      </button>
    </form>
  );
};

CardCheckoutForm.propTypes = {
  amount: PropTypes.number.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func,
};

const BookingPaymentModal = ({
  isOpen,
  onClose,
  bookingData,
  onPaymentSuccess,
  onPaymentError
}) => {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState('esewa');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [cardClientSecret, setCardClientSecret] = useState(null);
  const [cardBookingInfo, setCardBookingInfo] = useState(null);
  const [gatewayConfig, setGatewayConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [configReload, setConfigReload] = useState(0);
  const [walletAttemptId, setWalletAttemptId] = useState(null);
  const submittingRef = useRef(false);
  const walletSelected = selectedMethod === 'esewa' || selectedMethod === 'khalti';
  const walletUnavailable = walletSelected && (configLoading || gatewayConfig?.[selectedMethod]?.enabled !== true);
  const [bankTransferDetails, setBankTransferDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    transactionId: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setConfigLoading(true);
    setConfigError(false);
    setGatewayConfig(null);
    getPaymentGatewayConfig({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setGatewayConfig(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setConfigError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setConfigLoading(false);
      });
    return () => controller.abort();
  }, [isOpen, configReload]);

  useEffect(() => {
    // Check authentication status when modal opens
    if (isOpen) {
      const authenticated = isAuthenticated();
      setIsUserAuthenticated(authenticated);

      if (!authenticated) {
        toast.warning('Please login to continue with booking', {
          position: 'top-center',
          autoClose: 2000,
        });

        const timer = setTimeout(() => {
          sessionStorage.setItem('pendingBooking', JSON.stringify({
            ...bookingData,
            returnUrl: window.location.pathname
          }));
          onClose();
          navigate('/login', {
            state: {
              from: window.location.pathname,
              message: 'Please login to complete your booking'
            }
          });
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, bookingData, navigate, onClose]);

  if (!isOpen || !bookingData) return null;

  const amount = bookingData.totalAmount || 0;

  const handleLoginRedirect = () => {
    // Store the current booking data in sessionStorage to restore after login
    sessionStorage.setItem('pendingBooking', JSON.stringify({
      ...bookingData,
      returnUrl: window.location.pathname
    }));

    toast.info('Redirecting to login...', { autoClose: 2000 });

    setTimeout(() => {
      onClose();
      navigate('/login', {
        state: {
          from: window.location.pathname,
          message: 'Please login to complete your booking'
        }
      });
    }, 500);
  };

  const paymentMethods = [
    {
      id: 'esewa',
      name: 'eSewa',
      icon: '🟢',
      description: 'Pay with eSewa wallet',
      badge: 'Popular'
    },
    {
      id: 'khalti',
      name: 'Khalti',
      icon: '🟣',
      description: 'Pay with Khalti wallet',
      badge: 'Secure'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: '💳',
      description: 'Visa, Mastercard, etc.',
      badge: null
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: '🏦',
      description: 'Direct bank transfer',
      badge: null
    }
  ];

  const validateBankTransferDetails = () => {
    if (!bankTransferDetails.accountName || bankTransferDetails.accountName.length < 3) {
      toast.error('Please enter account holder name');
      return false;
    }
    if (!bankTransferDetails.accountNumber || bankTransferDetails.accountNumber.length < 5) {
      toast.error('Please enter valid account number');
      return false;
    }
    if (!bankTransferDetails.bankName || bankTransferDetails.bankName.length < 3) {
      toast.error('Please enter bank name');
      return false;
    }
    if (!bankTransferDetails.transactionId || bankTransferDetails.transactionId.length < 5) {
      toast.error('Please enter transaction/reference ID');
      return false;
    }
    return true;
  };

  // Called by CardCheckoutForm once Stripe has confirmed the charge —
  // finalizes the booking server-side (server re-verifies with Stripe).
  const handleCardPaymentConfirmed = async (paymentIntentId) => {
    try {
      const result = await verifyCardPayment(paymentIntentId);
      if (!result.success) throw new Error(result.message || 'Payment verification failed');

      setPaymentStatus('success');
      toast.success('Payment successful!');
      setTimeout(() => {
        onPaymentSuccess({ ...cardBookingInfo, ...result.data });
        onClose();
      }, 2000);
    } catch {
      setPaymentStatus('error');
      const errorMsg = 'Payment could not be confirmed. Please contact support if you were charged.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg, { position: 'top-center', autoClose: 5000, toastId: 'payment-error' });
      if (onPaymentError) onPaymentError(new Error(errorMsg));
    }
  };

  const handlePayment = async () => {
    if (processing || submittingRef.current || walletUnavailable) return;

    if (selectedMethod === 'bank' && !validateBankTransferDetails()) return;

    submittingRef.current = true;
    setProcessing(true);
    setErrorMessage('');
    let isRedirecting = false;

    try {
      const payload = {
        ...bookingData,
        paymentMethod: selectedMethod === 'bank' ? 'bank-transfer' : selectedMethod,
        ...(selectedMethod === 'bank' && { bankTransferDetails })
      };

      const idempotencyKey = walletSelected ? await getCheckoutIdempotencyKey('booking', payload) : undefined;
      const result = await createBookingWithPayment(payload, idempotencyKey);

      if (walletSelected) {
        if (!result.success) throw new Error(result.message || 'Payment could not be started. Please check again.');
        if (!/^[a-f\d]{24}$/i.test(result.paymentAttemptId || '')) {
          throw new Error('The server did not return a payment reference. Check your bookings before paying again.');
        }
        rememberPaymentAttempt(idempotencyKey, result.paymentAttemptId);
        setWalletAttemptId(result.paymentAttemptId);
        if (result.requiresRedirect && !result.requiresStatusCheck) {
          redirectToWalletPayment(result);
          isRedirecting = true;
          setPaymentStatus('redirecting');
        } else {
          // A replayed checkout can already be pending or complete. Only the callback may confirm it.
          navigate(`/payment-callback?attempt=${encodeURIComponent(result.paymentAttemptId)}`);
        }
        return;
      }

      if (result.requiresClientConfirmation) {
        // Card path: booking created as Pending/unpaid, backend gave us a
        // Stripe PaymentIntent clientSecret. Render the Stripe Elements
        // form so the guest enters their card directly with Stripe.
        setCardClientSecret(result.clientSecret);
        setCardBookingInfo(result.booking);
        setProcessing(false);
        return;
      }

      if (result.requiresRedirect) {
        isRedirecting = true;
        setPaymentStatus('redirecting');
        toast.info(`Redirecting to ${selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'}...`);

        if (result.redirectType === 'url') {
          setTimeout(() => {
            window.location.href = result.paymentUrl;
          }, 1000);
        } else if (result.redirectType === 'form-post') {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = result.formUrl;
          form.style.display = 'none';
          Object.entries(result.formData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
          });
          document.body.appendChild(form);
          setTimeout(() => form.submit(), 500);
        }
        return;
      }

      if (result.requiresVerification) {
        setPaymentStatus('submitted');
        toast.info('Bank transfer details submitted — awaiting verification.');
        toast.info('Your payment will be verified within 24 hours', { autoClose: 5000 });
        return;
      }

      if (result.success && result.data?.booking?.paymentStatus === 'paid') {
        setPaymentStatus('success');
        toast.success('Payment successful!');
        setTimeout(() => {
          onPaymentSuccess(result.data);
          onClose();
        }, 2000);
      } else {
        throw new Error(result.message || 'Payment failed');
      }
    } catch {
      setPaymentStatus(walletSelected ? 'pending' : 'error');
      const errorMsg = 'Payment could not be confirmed. Check the same checkout before making another payment.';

      setErrorMessage(errorMsg);

      // Show toast only once
      toast.error(errorMsg, {
        position: 'top-center',
        autoClose: 5000,
        toastId: 'payment-error', // Prevent duplicates
      });

      if (onPaymentError && !walletSelected) onPaymentError(new Error(errorMsg));
    } finally {
      if (!isRedirecting) {
        submittingRef.current = false;
        setProcessing(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose} // Close when clicking backdrop
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[rgba(0,191,166,0.2)] animate-slideUp"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside modal
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[rgba(0,191,166,0.2)] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#263238]">Complete Payment</h2>
              <p className="text-sm text-[#546E7A]">Secure payment gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={processing || paymentStatus === 'redirecting'}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#546E7A]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Booking Summary */}
          <div className="bg-gradient-to-br from-[#E5F5F2] to-[#B2EBF2]/30 rounded-xl p-5 border border-[rgba(0,191,166,0.2)]">
            <h3 className="font-bold text-[#263238] mb-3">{bookingData.hotelName}</h3>
            <div className="space-y-2 text-sm text-[#546E7A]">
              <div className="flex justify-between">
                <span>Check-in:</span>
                <span className="font-semibold text-[#263238]">{new Date(bookingData.checkIn).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out:</span>
                <span className="font-semibold text-[#263238]">{new Date(bookingData.checkOut).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Guests:</span>
                <span className="font-semibold text-[#263238]">{bookingData.guests?.adults || 2} Adults</span>
              </div>
            </div>
            <div className="border-t border-[rgba(0,191,166,0.3)] pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-[#263238]">Total Amount</span>
                <span className="text-2xl font-bold text-[#00BFA6]">NPR {amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Status Messages */}
          {paymentStatus === 'submitted' && <p role="status" className="bg-amber-50 p-4 rounded-xl text-amber-900">Bank transfer submitted. Your payment is awaiting manual verification.</p>}
          {paymentStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-slideDown">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Payment Successful!</h3>
                <p className="text-sm text-green-700">Your payment has been processed successfully. Redirecting...</p>
              </div>
            </div>
          )}

          {paymentStatus === 'redirecting' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 animate-slideDown">
              <Loader2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Redirecting to Payment Gateway...</h3>
                <p className="text-sm text-blue-700">
                  You will be redirected to {selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'} to complete your payment.
                  Please do not close this window.
                </p>
              </div>
            </div>
          )}

          {(paymentStatus === 'error' || paymentStatus === 'pending') && (
            <div role="status" className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-slideDown">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">{walletSelected ? 'Payment status not confirmed' : 'Payment Failed'}</h3>
                <p className="text-sm text-red-700 mb-3">{errorMessage}</p>
                {walletSelected && walletAttemptId && (
                  <button
                    onClick={() => navigate(`/payment-callback?attempt=${encodeURIComponent(walletAttemptId)}`)}
                    className="block text-sm font-semibold text-teal-700 hover:underline mb-3"
                  >
                    Check payment status
                  </button>
                )}
                <button
                  onClick={() => {
                    if (walletSelected) {
                      if (walletAttemptId) navigate(`/payment-callback?attempt=${walletAttemptId}`);
                      else handlePayment();
                    } else {
                      setPaymentStatus(null);
                      setErrorMessage('');
                    }
                  }}
                  disabled={processing}
                  className="text-sm font-semibold text-red-600 hover:underline"
                >
                  {walletSelected ? 'Retry same checkout' : 'Try Again'}
                </button>
              </div>
            </div>
          )}

          {/* Authentication Required Message */}
          {!isUserAuthenticated && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 animate-slideDown">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <LogIn className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 mb-2 text-lg">Login Required</h3>
                  <p className="text-sm text-amber-800 mb-4">
                    You need to be logged in to complete your booking. This helps us keep track of your reservations and provide you with better service.
                  </p>
                  <button
                    onClick={handleLoginRedirect}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-5 h-5" />
                    Login to Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Card confirmation step — Stripe Elements, shown after a pending
              booking + PaymentIntent is created */}
          {!paymentStatus && isUserAuthenticated && cardClientSecret && (
            <div className="space-y-4">
              <button
                onClick={() => { setCardClientSecret(null); setCardBookingInfo(null); }}
                className="text-sm font-semibold text-[#00BFA6] hover:underline"
              >
                &larr; Change payment method
              </button>
              <Elements options={{ clientSecret: cardClientSecret }} stripe={stripePromise}>
                <CardCheckoutForm
                  amount={amount}
                  onSuccess={handleCardPaymentConfirmed}
                  onError={onPaymentError}
                />
              </Elements>
            </div>
          )}

          {/* Payment Methods */}
          {!paymentStatus && isUserAuthenticated && !cardClientSecret && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-[#263238] mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00BFA6]" />
                  Select Payment Method
                </h3>
                {configLoading && <p className="text-sm text-gray-600 mb-3" role="status">Checking wallet availability…</p>}
                {configError && (
                  <p className="text-sm text-amber-700 mb-3" role="status">
                    Wallet availability could not be loaded.{' '}
                    <button disabled={processing} onClick={() => setConfigReload((value) => value + 1)} className="underline font-semibold">Retry</button>
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      disabled={processing || ((method.id === 'esewa' || method.id === 'khalti') && (configLoading || gatewayConfig?.[method.id]?.enabled !== true))}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        selectedMethod === method.id
                          ? 'border-[#00BFA6] bg-[#E5F5F2]'
                          : 'border-[rgba(0,191,166,0.2)] hover:border-[#00BFA6]/50'
                      } cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-[#263238]">{method.name}</h4>
                            {method.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-[#00BFA6] text-white rounded-full font-bold uppercase">
                                {method.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#546E7A] mt-1">{method.description}</p>
                          {(method.id === 'esewa' || method.id === 'khalti') && (
                            <p className="text-xs text-amber-700 mt-1">
                              {configLoading ? 'Checking availability…' : gatewayConfig?.[method.id]?.enabled !== true ? 'Currently unavailable' : gatewayConfig[method.id].testMode ? 'Test mode — no live payments' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedMethod === method.id && (
                        <div className="absolute top-3 right-3">
                          <div className="w-5 h-5 rounded-full bg-[#00BFA6] flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Redirect notice */}
              {(selectedMethod === 'khalti' || selectedMethod === 'esewa') && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900 mb-1">Redirect Payment</h4>
                    <p className="text-xs text-amber-700">
                      You will be redirected to {selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'}'s secure payment page.
                    </p>
                  </div>
                </div>
              )}

              {/* Card notice — actual card entry happens in the next step via Stripe */}
              {selectedMethod === 'card' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Secure Card Payment</h4>
                    <p className="text-xs text-blue-700">
                      You'll enter your card details on the next step, directly through Stripe's secure payment form. We never see or store your card number.
                    </p>
                  </div>
                </div>
              )}

              {/* Bank Transfer Form */}
              {selectedMethod === 'bank' && (
                <div className="space-y-4 animate-slideDown">
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-5 border border-gray-200">
                    <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
                      <h4 className="text-sm font-bold text-[#263238] mb-3">Transfer to:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#546E7A]">Account Name:</span>
                          <span className="font-semibold text-[#263238]">StayHaven Hotels Pvt. Ltd.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#546E7A]">Bank:</span>
                          <span className="font-semibold text-[#263238]">Nabil Bank Limited</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#546E7A]">Account Number:</span>
                          <span className="font-mono font-bold text-blue-600">0123456789012345</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#546E7A]">Amount:</span>
                          <span className="font-bold text-lg text-[#00BFA6]">NPR {amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#263238] mb-2">
                          Your Account Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bankTransferDetails.accountName}
                          onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, accountName: e.target.value })}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#263238] mb-2">
                          Your Account Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bankTransferDetails.accountNumber}
                          onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, accountNumber: e.target.value.replace(/\D/g, '') })}
                          placeholder="1234567890"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#263238] mb-2">
                          Your Bank Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bankTransferDetails.bankName}
                          onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, bankName: e.target.value })}
                          placeholder="e.g., Nabil Bank, NIC Asia Bank"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#263238] mb-2">
                          Transaction/Reference ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bankTransferDetails.transactionId}
                          onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, transactionId: e.target.value.toUpperCase() })}
                          placeholder="TXN123456789"
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-[#263238] font-mono"
                        />
                        <p className="text-xs text-[#546E7A] mt-1">Enter the transaction ID from your bank transfer receipt</p>
                      </div>
                    </div>
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-800">
                        <strong>Important:</strong> Your payment will be verified manually within 24 hours.
                        You will receive a confirmation email once verified.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">Secure Payment</h4>
                  <p className="text-xs text-blue-700">
                    Your payment information is encrypted and secure. All transactions are processed through verified payment gateways.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer — hidden during the Stripe card-confirmation step, which
            has its own submit button inside CardCheckoutForm */}
        {!paymentStatus && isUserAuthenticated && !cardClientSecret && (
          <div className="sticky bottom-0 bg-gray-50 border-t border-[rgba(0,191,166,0.2)] px-6 py-4 flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={processing || walletUnavailable}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] hover:from-[#00A896] hover:to-[#00D4BB] text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {selectedMethod === 'khalti' || selectedMethod === 'esewa' ? (
                    <ExternalLink className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  {selectedMethod === 'khalti' || selectedMethod === 'esewa'
                    ? `Pay via ${selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'} — NPR ${amount.toLocaleString()}`
                    : selectedMethod === 'card'
                    ? 'Continue to Card Payment'
                    : `Pay NPR ${amount.toLocaleString()}`
                  }
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
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

BookingPaymentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  bookingData: PropTypes.object,
  onPaymentSuccess: PropTypes.func.isRequired,
  onPaymentError: PropTypes.func,
};

export default BookingPaymentModal;
