import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Clock, Home, RefreshCw } from 'lucide-react';
import {
  completePaymentCheckout,
  getBookingDetails,
  getPaymentAttempt,
  verifyPaymentAttempt,
} from '../../../core/api/services/publicBooking.service';
import { usePageMeta } from '../hotels/lib/pageMeta';

const MAX_POLLS = 12;
const POLL_INTERVAL = 2500;
const MAX_WAIT = 45000;
const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'expired', 'refunded']);
const STATUS_COPY = {
  initiated: ['Payment pending', 'Your payment has started. We are waiting for confirmation.'],
  pending: ['Payment pending', 'Your payment is still being confirmed. Please avoid starting another payment.'],
  unknown: ['Payment status not confirmed', 'We cannot confirm the result yet. Please check again before making another payment.'],
  succeeded: ['Payment successful', 'The server has confirmed your payment.'],
  failed: ['Payment failed', 'The payment provider reported that this payment failed. If you were debited, contact support before paying again.'],
  cancelled: ['Payment cancelled', 'The payment provider reported that this payment was cancelled.'],
  expired: ['Payment expired', 'This payment attempt has expired. Check your booking or bill before starting another payment.'],
  review: ['Payment under review', 'This payment needs review. Please avoid paying again and contact support if you need help.'],
  refunded: ['Payment refunded', 'The server reports that this payment has been refunded.'],
};

const confirmationState = (booking) => {
  const dateOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  const adults = booking.guests?.adults ?? 0;
  const children = booking.guests?.children ?? 0;
  return {
    bookingId: booking._id,
    bookingReference: booking.confirmationCode || booking.bookingId || booking._id,
    hotelName: booking.hotelName ?? '',
    hotelAddress: booking.hotelAddress ?? '',
    hotelImage: booking.hotelImage ?? '',
    checkIn: new Date(booking.checkIn).toLocaleDateString('en-US', dateOptions),
    checkOut: new Date(booking.checkOut).toLocaleDateString('en-US', dateOptions),
    guests: adults + ' Adult' + (adults === 1 ? '' : 's') + (children > 0 ? ', ' + children + (children === 1 ? ' Child' : ' Children') : ''),
    roomType: booking.roomType ?? '',
    totalPaid: booking.paidAmount ?? 0,
    paymentMethod: { esewa: 'eSewa', khalti: 'Khalti' }[booking.paymentMethod] || booking.paymentMethod || 'Online payment',
  };
};

const PaymentCallback = () => {
  usePageMeta({ title: "Payment status", description: "Check the status of your StayHaven payment." });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const attemptId = searchParams.get('attempt') || '';
  const validAttempt = /^[a-f\d]{24}$/i.test(attemptId);
  const [status, setStatus] = useState('unknown');
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [run, setRun] = useState({ count: 0, verify: true });
  const retryLock = useRef(false);

  useEffect(() => {
    // Redirect query parameters (including legacy status=success) are not evidence of payment.
    if (!validAttempt) {
      setStatus('unknown');
      setChecking(false);
      setTargetType(null);
      setPaymentDetails(null);
      setMessage('This return link is missing a valid payment reference. Open your bookings or billing page to check the payment.');
      retryLock.current = false;
      return;
    }

    const controller = new AbortController();
    let active = true;
    let pollTimer;
    let navigationTimer;
    let polls = 0;
    let confirmedSuccess = false;
    setChecking(true);
    setNeedsLogin(false);
    setStatus('unknown');
    setTargetType(null);
    setPaymentDetails(null);
    setMessage('');

    const finish = () => {
      clearTimeout(deadlineTimer);
      setChecking(false);
      retryLock.current = false;
    };
    const deadlineTimer = setTimeout(() => {
      active = false;
      controller.abort();
      clearTimeout(pollTimer);
      setChecking(false);
      retryLock.current = false;
      setMessage(confirmedSuccess
        ? 'Payment is confirmed, but booking details are taking longer to load. Check again to open your confirmation.'
        : 'Confirmation is taking longer than expected. You can safely check this same payment again.');
    }, MAX_WAIT);

    const check = async () => {
      polls += 1;
      try {
        const payment = await getPaymentAttempt(attemptId, { signal: controller.signal });
        if (!active) return;
        const nextStatus = Object.hasOwn(STATUS_COPY, payment.status) ? payment.status : 'unknown';
        setStatus(nextStatus);
        setTargetType(payment.targetType);
        setPaymentDetails({
          gateway: { khalti: 'Khalti', esewa: 'eSewa' }[payment.gateway] || 'Online payment',
          amount: Number(payment.amount),
          currency: payment.currency || 'NPR',
        });
        setMessage('');

        if (TERMINAL_STATUSES.has(nextStatus)) completePaymentCheckout(attemptId);
        if (nextStatus === 'succeeded') {
          confirmedSuccess = true;
          if (payment.targetType === 'booking' && payment.targetId) {
            // Fetch authenticated details for the existing booking confirmation page.
            const booking = await getBookingDetails(payment.targetId, { signal: controller.signal });
            if (!active) return;
            if (!booking._id || String(booking._id) !== String(payment.targetId)) {
              throw new Error('Booking details do not match this payment.');
            }
            finish();
            setMessage('Opening your booking confirmation…');
            navigationTimer = setTimeout(() => navigate('/booking-confirmed', {
              replace: true,
              state: confirmationState(booking),
            }), 1500);
          } else if (payment.targetType === 'order' || payment.targetType === 'invoice') {
            finish();
            setMessage('Returning to your billing page…');
            navigationTimer = setTimeout(() => navigate('/guest-dashboard/billing', { replace: true }), 1500);
          } else {
            finish();
            setMessage('Your payment is confirmed, but its booking or billing details are unavailable. Please contact support.');
          }
          return;
        }
        if (TERMINAL_STATUSES.has(nextStatus) || nextStatus === 'review') {
          finish();
          return;
        }
      } catch (error) {
        if (!active) return;
        if ([401, 403].includes(error.response?.status)) setNeedsLogin(true);
        if (confirmedSuccess) {
          // A details request failing must never undo an authoritative successful payment.
          setMessage('Payment is confirmed, but booking details could not be loaded. Check again to open your confirmation.');
          finish();
          return;
        }
        setMessage('We could not retrieve the latest payment status. Please check again before paying again.');
        if ([401, 403, 404].includes(error.response?.status)) {
          setMessage(error.response.status === 404
            ? 'This payment reference could not be found. Check your bookings or billing page, or contact support.'
            : 'Please sign in with the account that made this payment, then reopen this return link.');
          finish();
          return;
        }
      }
      if (polls < MAX_POLLS) {
        pollTimer = setTimeout(check, POLL_INTERVAL);
      } else {
        setMessage('Confirmation is taking longer than expected. You can safely check this same payment again.');
        finish();
      }
    };

    const start = async () => {
      if (run.verify) {
        try {
          await verifyPaymentAttempt(attemptId, { signal: controller.signal });
        } catch {
          // Lookup may have completed despite a timeout; read authoritative status either way.
        }
      }
      if (active) await check();
    };
    start();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(deadlineTimer);
      clearTimeout(pollTimer);
      clearTimeout(navigationTimer);
      retryLock.current = false;
    };
  }, [attemptId, validAttempt, navigate, run]);

  const [title, description] = STATUS_COPY[status];
  const succeeded = status === 'succeeded';
  const unsuccessful = ['failed', 'cancelled', 'expired'].includes(status);
  const Icon = checking ? Loader2 : succeeded ? CheckCircle : unsuccessful ? XCircle : Clock;
  const destination = targetType === 'booking' ? '/guest-dashboard/bookings' : '/guest-dashboard/billing';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center" role="status" aria-live="polite" aria-busy={checking}>
        <Icon className={'w-16 h-16 mx-auto mb-6 ' + (checking ? 'animate-spin text-teal-600' : succeeded ? 'text-green-600' : unsuccessful ? 'text-red-600' : 'text-amber-600')} />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-600 mb-4">{description}</p>
        {message && <p className="text-sm text-gray-600 mb-4">{message}</p>}
        {checking && <p className="text-sm text-teal-700 mb-4">Checking payment status…</p>}
        {paymentDetails && Number.isFinite(paymentDetails.amount) && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment via</p>
              <p className="font-semibold text-gray-900">{paymentDetails.gateway}</p>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {paymentDetails.currency} {paymentDetails.amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {needsLogin && <button className="px-6 py-3 bg-teal-600 text-white rounded-xl" onClick={() => navigate(`/login?paymentAttempt=${attemptId}`)}>Sign in to check this payment</button>}
          {validAttempt && (
            <button
              disabled={checking}
              onClick={() => {
                if (retryLock.current) return;
                retryLock.current = true;
                setRun((previous) => ({ count: previous.count + 1, verify: status !== 'succeeded' }));
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              {succeeded ? 'Open confirmation again' : 'Check payment again'}
            </button>
          )}
          <button onClick={() => navigate(destination)} className="px-6 py-3 border border-teal-600 text-teal-700 font-semibold rounded-xl">
            {targetType === 'booking' ? 'View my bookings' : 'View my billing'}
          </button>
          <button onClick={() => navigate('/')} className="flex items-center justify-center gap-2 text-gray-600 py-2">
            <Home className="w-4 h-4" /> Go to home
          </button>
        </div>
        <p className="mt-6 text-sm text-gray-500">Need help? <a href="mailto:support@stayhaven.com" className="text-teal-700 underline">Contact support</a></p>
      </div>
    </div>
  );
};

export default PaymentCallback;
