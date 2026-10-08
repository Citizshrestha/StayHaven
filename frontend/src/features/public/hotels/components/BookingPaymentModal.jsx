import { useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, Loader2, CheckCircle2, AlertCircle, Shield, Lock, ExternalLink, LogIn, Landmark } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import PropTypes from 'prop-types';
import axiosClient from '../../../../core/api/client';
import {
  createBookingWithPayment, verifyCardPayment, isAuthenticated,
  getPaymentGatewayConfig, getCheckoutIdempotencyKey, rememberPaymentAttempt, redirectToWalletPayment,
} from '../../../../core/api/services/publicBooking.service';
import Sheet from '../lib/Sheet';
import { formatRs } from '../lib/money';

// Stripe.js is loaded lazily, and only when a publishable key exists. Calling loadStripe(undefined)
// at import time threw on every page of the app whenever no key was configured.
const stripeCache = new Map();
const getStripePromise = (key) => {
  if (!key || typeof key !== 'string') return null;
  if (!stripeCache.has(key)) stripeCache.set(key, loadStripe(key));
  return stripeCache.get(key);
};

const inputClass = 'w-full min-h-[48px] px-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent text-base text-[#263238]';
const primaryBtn = 'w-full min-h-[48px] px-6 bg-gradient-to-r from-[#00BFA6] to-[#00E5CC] hover:from-[#00A896] hover:to-[#00D4BB] text-white font-semibold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

/**
 * Card payment step: rendered once the backend has created a pending booking and a Stripe
 * PaymentIntent. Card number/CVV are typed directly into Stripe's own iframe (PaymentElement)
 * and never touch this app's server.
 */
const CardCheckoutForm = ({ amount, onSuccess }) => {
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
      // Card-only intent: 3-D Secure opens in Stripe's own overlay, so no redirect is needed.
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (stripeError) {
        setFormError(stripeError.message || 'Card payment failed. Please check your card and try again.');
        setSubmitting(false);
        return;
      }
      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        setFormError(paymentIntent?.status === 'processing'
          ? 'Your payment is still processing. Do not pay again: check My bookings in a few minutes.'
          : 'Payment could not be completed. Please try again.');
        setSubmitting(false);
        return;
      }
      // Stripe confirmed the charge. Only the server's own check with Stripe finalizes the booking.
      await onSuccess(paymentIntent.id);
    } catch {
      setFormError('Payment could not be confirmed. Check your bookings before paying again.');
      setSubmitting(false);
    }
  };

  return (
    <form id="card-checkout-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-gray-500 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-700">Your card details are encrypted and handled directly by Stripe</span>
        </div>
        <PaymentElement options={{ layout: { type: 'tabs', defaultCollapsed: false } }} />
      </div>
      {formError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}
      <button type="submit" disabled={!stripe || submitting} className={primaryBtn}>
        {submitting ? (<><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Processing...</>) : (<><Lock className="w-5 h-5" aria-hidden="true" /> Pay {formatRs(amount)}</>)}
      </button>
    </form>
  );
};

CardCheckoutForm.propTypes = {
  amount: PropTypes.number.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

const BookingPaymentModal = ({ isOpen, onClose, bookingData, onPaymentSuccess, onPaymentError }) => {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState('esewa');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [cardClientSecret, setCardClientSecret] = useState(null);
  const [cardBookingInfo, setCardBookingInfo] = useState(null);
  const [confirmedIntentId, setConfirmedIntentId] = useState(null);
  const [gatewayConfig, setGatewayConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [configReload, setConfigReload] = useState(0);
  const [walletAttemptId, setWalletAttemptId] = useState(null);
  const [bankAccount, setBankAccount] = useState(undefined); // undefined = loading, null = not offered
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const submittingRef = useRef(false);
  const authenticated = isAuthenticated();
  const walletSelected = selectedMethod === 'esewa' || selectedMethod === 'khalti';
  const walletUnavailable = walletSelected && (configLoading || gatewayConfig?.[selectedMethod]?.enabled !== true);
  const stripeKey = gatewayConfig?.stripe?.enabled ? gatewayConfig.stripe.publishableKey : '';
  const cardUnavailable = configLoading || !gatewayConfig?.stripe?.enabled || !getStripePromise(stripeKey);
  const bankUnavailable = bankAccount === undefined || bankAccount === null;
  const methodUnavailable = walletUnavailable || (selectedMethod === 'card' && cardUnavailable) || (selectedMethod === 'bank' && bankUnavailable);
  const [bankTransferDetails, setBankTransferDetails] = useState({ accountName: '', accountNumber: '', bankName: '', transactionId: '' });

  useEffect(() => {
    if (!isOpen) return undefined;
    const controller = new AbortController();
    setConfigLoading(true);
    setConfigError(false);
    setGatewayConfig(null);
    getPaymentGatewayConfig({ signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setGatewayConfig(result.data); })
      .catch(() => { if (!controller.signal.aborted) setConfigError(true); })
      .finally(() => { if (!controller.signal.aborted) setConfigLoading(false); });
    return () => controller.abort();
  }, [isOpen, configReload]);

  // The hotel's real receiving account (never a hard-coded one). Needs a signed-in guest.
  useEffect(() => {
    if (!isOpen || !authenticated || !bookingData?.hotelId) return undefined;
    const controller = new AbortController();
    setBankAccount(undefined);
    axiosClient.get(`/api/v1/hotels/${encodeURIComponent(bookingData.hotelId)}/bank-transfer-details`, { signal: controller.signal, timeout: 10000 })
      .then(({ data }) => { if (!controller.signal.aborted) setBankAccount(data?.enabled ? data.account : null); })
      .catch(() => { if (!controller.signal.aborted) setBankAccount(null); });
    return () => controller.abort();
  }, [isOpen, authenticated, bookingData?.hotelId]);

  // Reset transient state each time the dialog opens.
  useEffect(() => {
    if (isOpen) return;
    setPaymentStatus(null);
    setErrorMessage('');
    setCardClientSecret(null);
    setCardBookingInfo(null);
    setConfirmedIntentId(null);
    setSubmittedBooking(null);
    submittingRef.current = false;
    setProcessing(false);
  }, [isOpen]);

  const handleLoginRedirect = useCallback(() => {
    sessionStorage.setItem('pendingBooking', JSON.stringify({ ...bookingData, returnUrl: window.location.pathname }));
    onClose();
    navigate('/login', { state: { from: window.location.pathname, message: 'Please login to complete your booking' } });
  }, [bookingData, navigate, onClose]);

  if (!bookingData) return null;

  // Card checkouts show the amount the SERVER quoted; the page preview is only an estimate.
  const amount = Number(cardBookingInfo?.totalAmount ?? bookingData.totalAmount) || 0;
  const stripePromise = getStripePromise(stripeKey);

  const paymentMethods = [
    { id: 'esewa', name: 'eSewa', icon: '🟢', description: 'Pay with eSewa wallet', badge: 'Popular' },
    { id: 'khalti', name: 'Khalti', icon: '🟣', description: 'Pay with Khalti wallet', badge: 'Secure' },
    { id: 'card', name: 'Credit/Debit card', icon: '💳', description: 'Visa, Mastercard, etc.', badge: null },
    { id: 'bank', name: 'Bank transfer', icon: '🏦', description: 'Verified by the hotel within 24-48 hours', badge: null },
  ];

  const availabilityNote = (id) => {
    if (id === 'esewa' || id === 'khalti') {
      if (configLoading) return 'Checking availability…';
      if (gatewayConfig?.[id]?.enabled !== true) return 'Currently unavailable';
      return gatewayConfig[id].testMode ? 'Test mode: no live payments' : '';
    }
    if (id === 'card') {
      if (configLoading) return 'Checking availability…';
      return cardUnavailable ? 'Currently unavailable' : (gatewayConfig?.stripe?.testMode ? 'Test mode: no live payments' : '');
    }
    if (id === 'bank') {
      if (bankAccount === undefined) return 'Checking availability…';
      return bankAccount === null ? 'Not offered by this hotel' : '';
    }
    return '';
  };
  const isOptionDisabled = (id) => processing
    || ((id === 'esewa' || id === 'khalti') && (configLoading || gatewayConfig?.[id]?.enabled !== true))
    || (id === 'card' && cardUnavailable)
    || (id === 'bank' && bankUnavailable);

  const validateBankTransferDetails = () => {
    const d = bankTransferDetails;
    if (d.accountName.trim().length < 3) { toast.error('Please enter the account holder name'); return false; }
    if (d.accountNumber.length < 5) { toast.error('Please enter a valid account number'); return false; }
    if (d.bankName.trim().length < 3) { toast.error('Please enter your bank name'); return false; }
    if (d.transactionId.trim().length < 5) { toast.error('Please enter the transaction/reference ID from your receipt'); return false; }
    return true;
  };

  // Called once Stripe has confirmed the charge: the server re-checks it with Stripe and marks the booking paid.
  const handleCardPaymentConfirmed = async (paymentIntentId) => {
    setConfirmedIntentId(paymentIntentId);
    try {
      const result = await verifyCardPayment(paymentIntentId);
      if (!result.success) throw new Error(result.message || 'Payment verification failed');
      setPaymentStatus('success');
      toast.success('Payment successful!');
      setTimeout(() => {
        onPaymentSuccess({ booking: { ...cardBookingInfo, ...result.data, _id: result.data?.bookingId || cardBookingInfo?._id, paymentStatus: result.data?.paymentStatus, status: result.data?.status, paidAmount: cardBookingInfo?.totalAmount } });
        onClose();
      }, 1200);
    } catch (err) {
      setPaymentStatus('error');
      const message = err?.message && !/^Failed to verify/.test(err.message)
        ? err.message
        : 'We could not confirm your payment yet. If you were charged, do not pay again: use "Check payment again" or contact support.';
      setErrorMessage(message);
      toast.error(message, { position: 'top-center', autoClose: 6000, toastId: 'payment-error' });
      onPaymentError?.(new Error(message));
    }
  };

  const handlePayment = async () => {
    if (processing || submittingRef.current || methodUnavailable) return;
    if (selectedMethod === 'bank' && !validateBankTransferDetails()) return;

    submittingRef.current = true;
    setProcessing(true);
    setErrorMessage('');
    let isRedirecting = false;

    try {
      const payload = {
        ...bookingData,
        paymentMethod: selectedMethod === 'bank' ? 'bank-transfer' : selectedMethod,
        ...(selectedMethod === 'bank' && { bankTransferDetails }),
      };
      delete payload.totalAmount; // the server prices the stay; never send our estimate
      delete payload.nights;
      delete payload.hotelName;
      // The API treats an omitted optional field as "use the account's value", but rejects an empty
      // string (400 "Validation failed"). An empty email used to make every such booking fail.
      Object.keys(payload).forEach((key) => { if (payload[key] === '') delete payload[key]; });

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
        setCardClientSecret(result.clientSecret);
        setCardBookingInfo(result.booking);
        return;
      }

      if (result.requiresVerification) {
        setSubmittedBooking(result.data?.booking || null);
        setPaymentStatus('submitted');
        return;
      }

      if (result.success && result.data?.booking?.paymentStatus === 'paid') {
        setPaymentStatus('success');
        toast.success('Payment successful!');
        setTimeout(() => { onPaymentSuccess(result.data); onClose(); }, 1200);
      } else {
        throw new Error(result.message || 'Payment failed');
      }
    } catch (err) {
      setPaymentStatus(walletSelected ? 'pending' : 'error');
      // Wallet checkouts can be in an unknown state, so they get a deliberately cautious message.
      // Card / bank failures carry a safe, specific server message (e.g. "room already booked").
      const errorMsg = walletSelected
        ? 'Payment could not be confirmed. Check the same checkout before making another payment.'
        : (err?.message || 'Payment could not be started. Please try again.');
      setErrorMessage(errorMsg);
      toast.error(errorMsg, { position: 'top-center', autoClose: 5000, toastId: 'payment-error' });
      if (onPaymentError && !walletSelected) onPaymentError(new Error(errorMsg));
    } finally {
      if (!isRedirecting) {
        submittingRef.current = false;
        setProcessing(false);
      }
    }
  };

  const showMethodStep = !paymentStatus && authenticated && !cardClientSecret;
  const locked = processing || paymentStatus === 'redirecting';

  const footer = showMethodStep ? (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onClose} disabled={processing} className="min-h-[48px] px-5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50">
        Cancel
      </button>
      <button type="button" onClick={handlePayment} disabled={processing || methodUnavailable} className={`${primaryBtn} flex-1`}>
        {processing ? (
          <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Processing...</>
        ) : walletSelected ? (
          <><ExternalLink className="w-5 h-5" aria-hidden="true" /> Pay via {selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'} · {formatRs(amount)}</>
        ) : selectedMethod === 'card' ? (
          <><Lock className="w-5 h-5" aria-hidden="true" /> Continue to card payment</>
        ) : (
          <><Lock className="w-5 h-5" aria-hidden="true" /> Submit transfer · {formatRs(amount)}</>
        )}
      </button>
    </div>
  ) : (cardClientSecret && !paymentStatus) ? (
    <button type="submit" form="card-checkout-form" className={primaryBtn}>
      <Lock className="w-5 h-5" aria-hidden="true" /> Pay {formatRs(amount)}
    </button>
  ) : null;

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      closeDisabled={locked}
      icon={<CreditCard className="w-5 h-5" aria-hidden="true" />}
      title="Complete payment"
      subtitle="Secure payment gateway"
      maxWidth="sm:max-w-2xl"
      footer={footer}
    >
      <div className="space-y-5">
        <div className="bg-gradient-to-br from-[#E5F5F2] to-[#B2EBF2]/30 rounded-xl p-4 sm:p-5 border border-[rgba(0,191,166,0.2)]">
          <h3 className="font-bold text-[#263238] mb-3">{bookingData.hotelName}</h3>
          <dl className="space-y-2 text-sm text-[#546E7A]">
            <div className="flex justify-between gap-3"><dt>Check-in</dt><dd className="font-semibold text-[#263238]">{new Date(bookingData.checkIn).toLocaleDateString()}</dd></div>
            <div className="flex justify-between gap-3"><dt>Check-out</dt><dd className="font-semibold text-[#263238]">{new Date(bookingData.checkOut).toLocaleDateString()}</dd></div>
            <div className="flex justify-between gap-3"><dt>Guests</dt><dd className="font-semibold text-[#263238]">{bookingData.guests?.adults || 2} adult{(bookingData.guests?.adults || 2) > 1 ? 's' : ''}{bookingData.guests?.children ? `, ${bookingData.guests.children} child${bookingData.guests.children > 1 ? 'ren' : ''}` : ''}</dd></div>
          </dl>
          <div className="border-t border-[rgba(0,191,166,0.3)] pt-3 mt-3 flex items-center justify-between gap-3">
            <span className="text-base sm:text-lg font-semibold text-[#263238]">Total amount</span>
            <span className="text-xl sm:text-2xl font-bold text-[#00A896] tabular-nums">{formatRs(amount)}</span>
          </div>
          {!cardBookingInfo && <p className="mt-2 text-xs text-[#546E7A]">The final amount is confirmed by our server from the hotel&apos;s current rate when you pay.</p>}
        </div>

        {paymentStatus === 'submitted' && (
          <div role="status" className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Landmark className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-amber-900">Bank transfer submitted</h3>
                <p className="text-sm text-amber-900">
                  Your room is held for 48 hours while the hotel matches your transfer to its bank statement.
                  The booking is <strong>not confirmed</strong> until then, and you will get an email.
                </p>
                {submittedBooking?.confirmationCode && <p className="text-sm text-amber-900 mt-2">Reference: <strong className="font-mono">{submittedBooking.confirmationCode}</strong></p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); navigate('/guest-dashboard/bookings'); }}
              className={primaryBtn}
            >
              View my bookings
            </button>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div role="status" className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Payment successful</h3>
              <p className="text-sm text-green-700">Your payment has been processed. Taking you to your confirmation…</p>
            </div>
          </div>
        )}

        {paymentStatus === 'redirecting' && (
          <div role="status" className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Loader2 className="w-6 h-6 text-blue-600 shrink-0 mt-0.5 animate-spin" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Redirecting to the payment gateway…</h3>
              <p className="text-sm text-blue-700">You are being sent to {selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'} to finish paying. Please keep this tab open.</p>
            </div>
          </div>
        )}

        {(paymentStatus === 'error' || paymentStatus === 'pending') && (
          <div role="alert" className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-red-900">{walletSelected ? 'Payment status not confirmed' : confirmedIntentId ? 'Payment not confirmed yet' : 'Payment failed'}</h3>
              <p className="text-sm text-red-700">{errorMessage}</p>
              {walletSelected && walletAttemptId && (
                <button type="button" onClick={() => navigate(`/payment-callback?attempt=${encodeURIComponent(walletAttemptId)}`)} className="block min-h-[44px] text-sm font-semibold text-teal-700 underline">
                  Check payment status
                </button>
              )}
              {!walletSelected && confirmedIntentId && (
                <button
                  type="button"
                  onClick={() => { setPaymentStatus(null); handleCardPaymentConfirmed(confirmedIntentId); }}
                  className="block min-h-[44px] text-sm font-semibold text-teal-700 underline"
                >
                  Check payment again
                </button>
              )}
              {!confirmedIntentId && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => {
                    if (walletSelected) {
                      if (walletAttemptId) navigate(`/payment-callback?attempt=${encodeURIComponent(walletAttemptId)}`);
                      else handlePayment();
                    } else { setPaymentStatus(null); setErrorMessage(''); }
                  }}
                  className="block min-h-[44px] text-sm font-semibold text-red-600 underline"
                >
                  {walletSelected ? 'Retry same checkout' : 'Try again'}
                </button>
              )}
            </div>
          </div>
        )}

        {!authenticated && (
          <div role="alert" className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><LogIn className="w-6 h-6 text-amber-600" aria-hidden="true" /></div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 mb-1 text-lg">Login required</h3>
                <p className="text-sm text-amber-800 mb-4">Sign in to complete your booking so it appears in your account.</p>
                <button type="button" onClick={handleLoginRedirect} className={`${primaryBtn} sm:w-auto`}>
                  <LogIn className="w-5 h-5" aria-hidden="true" /> Login to continue
                </button>
              </div>
            </div>
          </div>
        )}

        {!paymentStatus && authenticated && cardClientSecret && stripePromise && (
          <div className="space-y-4">
            <button type="button" onClick={() => { setCardClientSecret(null); setCardBookingInfo(null); }} className="min-h-[44px] text-sm font-semibold text-[#00A896] underline">
              &larr; Change payment method
            </button>
            <Elements options={{ clientSecret: cardClientSecret }} stripe={stripePromise}>
              <CardCheckoutForm amount={amount} onSuccess={handleCardPaymentConfirmed} />
            </Elements>
          </div>
        )}

        {showMethodStep && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-[#263238] mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-[#00BFA6]" aria-hidden="true" /> Select payment method</h3>
              {configError && (
                <p className="text-sm text-amber-700 mb-3" role="status">
                  Payment options could not be loaded.{' '}
                  <button type="button" disabled={processing} onClick={() => setConfigReload((v) => v + 1)} className="underline font-semibold min-h-[44px]">Retry</button>
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Payment method">
                {paymentMethods.map((method) => {
                  const note = availabilityNote(method.id);
                  const selected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSelectedMethod(method.id)}
                      disabled={isOptionDisabled(method.id)}
                      className={`relative min-h-[64px] p-4 rounded-xl border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${selected ? 'border-[#00BFA6] bg-[#E5F5F2]' : 'border-[rgba(0,191,166,0.2)] hover:border-[#00BFA6]/50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl" aria-hidden="true">{method.icon}</span>
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-[#263238]">{method.name}</h4>
                            {method.badge && <span className="text-[10px] px-1.5 py-0.5 bg-[#00BFA6] text-white rounded-full font-bold uppercase">{method.badge}</span>}
                          </div>
                          <p className="text-xs text-[#546E7A] mt-1">{method.description}</p>
                          {note && <p className="text-xs text-amber-700 mt-1">{note}</p>}
                        </div>
                      </div>
                      {selected && (
                        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#00BFA6] flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" aria-hidden="true" /></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {walletSelected && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900 mb-1">Redirect payment</h4>
                  <p className="text-xs text-amber-700">You will be redirected to {selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'}&apos;s secure payment page and brought back here.</p>
                </div>
              </div>
            )}

            {selectedMethod === 'card' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">Secure card payment</h4>
                  <p className="text-xs text-blue-700">You enter your card on the next step, directly in Stripe&apos;s secure form. We never see or store your card number.</p>
                </div>
              </div>
            )}

            {selectedMethod === 'bank' && bankAccount && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 sm:p-5 border border-gray-200">
                  <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
                    <h4 className="text-sm font-bold text-[#263238] mb-3">Transfer exactly {formatRs(amount)} to:</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3"><dt className="text-[#546E7A]">Account name</dt><dd className="font-semibold text-[#263238] text-right break-words">{bankAccount.accountName}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-[#546E7A]">Bank</dt><dd className="font-semibold text-[#263238] text-right break-words">{bankAccount.bankName}{bankAccount.branch ? `, ${bankAccount.branch}` : ''}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-[#546E7A]">Account number</dt><dd className="font-mono font-bold text-blue-700 text-right break-all select-all">{bankAccount.accountNumber}</dd></div>
                    </dl>
                  </div>
                  <p className="text-xs text-[#546E7A] mb-3">After you send the money, enter the details from your receipt so the hotel can match it.</p>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="bt-name" className="block text-sm font-medium text-[#263238] mb-1.5">Your account name <span className="text-red-500" aria-hidden="true">*</span></label>
                      <input id="bt-name" type="text" autoComplete="off" maxLength={100} value={bankTransferDetails.accountName} onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, accountName: e.target.value })} placeholder="John Doe" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="bt-number" className="block text-sm font-medium text-[#263238] mb-1.5">Your account number <span className="text-red-500" aria-hidden="true">*</span></label>
                      <input id="bt-number" type="text" inputMode="numeric" autoComplete="off" maxLength={30} value={bankTransferDetails.accountNumber} onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, accountNumber: e.target.value.replace(/\D/g, '') })} placeholder="1234567890" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="bt-bank" className="block text-sm font-medium text-[#263238] mb-1.5">Your bank name <span className="text-red-500" aria-hidden="true">*</span></label>
                      <input id="bt-bank" type="text" autoComplete="off" maxLength={100} value={bankTransferDetails.bankName} onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, bankName: e.target.value })} placeholder="e.g. Nabil Bank, NIC Asia" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="bt-ref" className="block text-sm font-medium text-[#263238] mb-1.5">Transaction / reference ID <span className="text-red-500" aria-hidden="true">*</span></label>
                      <input id="bt-ref" type="text" autoComplete="off" autoCapitalize="characters" maxLength={60} value={bankTransferDetails.transactionId} onChange={(e) => setBankTransferDetails({ ...bankTransferDetails, transactionId: e.target.value.toUpperCase() })} placeholder="TXN123456789" className={`${inputClass} font-mono`} />
                      <p className="text-xs text-[#546E7A] mt-1">From your bank transfer receipt. Each reference can be used once.</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800"><strong>Important:</strong> your booking stays pending and the room is held for 48 hours until the hotel verifies the transfer.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Secure payment</h4>
                <p className="text-xs text-blue-700">Payments are processed by verified gateways. A booking is confirmed only after the payment is verified on our server.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </Sheet>
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
