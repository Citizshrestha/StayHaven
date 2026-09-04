/**
 * Guest Dashboard - Billing View
 * Invoice list, payment history, multi-gateway payment (eSewa/Khalti/Card/Bank)
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getGuestInvoices, payOrder, confirmPayment } from "../guestDashboardApi";
import { useSocket } from '../../../../core/context/SocketContext';
import { toast } from 'react-toastify';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  Receipt,
  CreditCard,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
  Lock,
  ExternalLink,
  Shield,
  Building2,
  UtensilsCrossed,
  BedDouble,
} from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const statusMeta = {
  paid: { label: 'Paid', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  partial: { label: 'Partial', icon: Clock, className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' },
  overdue: { label: 'Overdue', icon: AlertTriangle, className: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  refunded: { label: 'Refunded', icon: XCircle, className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300' },
};

const FILTERS = ['all', 'pending', 'partial', 'overdue', 'paid'];

const formatNrs = (amount) => `Rs ${(Number.isFinite(amount) ? amount : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BillingView = () => {
  const { subscribe, isConnected } = useSocket();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [filter, setFilter] = useState('all');
  const [payTarget, setPayTarget] = useState(null);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getGuestInvoices();
      if (res?.success) {
        setInvoices(res.data || []);
        setOutstandingBalance(res.outstandingBalance || 0);
      }
    } catch (error) {
      console.error('Invoices load error:', error);
      toast.error(error.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Real-time "bill received" notification (e.g. room-service order billed)
  const handleBillReceived = useCallback((payload) => {
    toast.info(`New bill received for Order #${payload?.orderNumber || '--'}`, { autoClose: 5000 });
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    if (!subscribe || !isConnected) return;
    const unsub = subscribe('bill-received', handleBillReceived);
    return () => unsub();
  }, [subscribe, isConnected, handleBillReceived]);

  const filtered = useMemo(
    () => (filter === 'all' ? invoices : invoices.filter((inv) => inv.status === filter)),
    [invoices, filter]
  );

  const totals = useMemo(() => {
    const totalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.paid) || 0), 0);
    const dueCount = invoices.filter((inv) => (inv.balance || 0) > 0).length;
    return { totalPaid, dueCount, totalInvoices: invoices.length };
  }, [invoices]);

  const handlePaymentSuccess = () => {
    setPayTarget(null);
    loadInvoices();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b1220]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading your invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8 bg-gray-50 dark:bg-[#0b1220]">
      {/* Header */}
      <div className="hidden lg:block bg-white/90 dark:bg-[#0f1c2e]/90 backdrop-blur-lg border-b border-gray-100 dark:border-white/5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-7">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Payments</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage your invoices and payments</p>
            </div>
            {outstandingBalance > 0 && (
              <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-rose-500/20">
                <p className="text-xs text-white/85">Outstanding Balance</p>
                <p className="text-xl font-bold">{formatNrs(outstandingBalance)}</p>
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 flex-wrap mt-5 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
            {FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                  filter === status
                    ? 'bg-white dark:bg-teal-600 text-teal-700 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 lg:pt-8 pb-8">
        {/* Mobile header */}
        <div className="lg:hidden mb-5">
          <p className="text-xl font-bold text-gray-900 dark:text-white">Billing</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Invoices and payments</p>
          <div className="mt-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white p-4 flex items-center justify-between shadow-lg shadow-rose-500/20">
            <div>
              <p className="text-xs text-white/85">Outstanding</p>
              <p className="text-xl font-bold">{formatNrs(outstandingBalance)}</p>
            </div>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm">
              {outstandingBalance > 0 ? `${totals.dueCount} due` : 'All clear'}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pt-4 -mx-4 px-4 scrollbar-hide">
            {FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3.5 py-2 rounded-full font-semibold capitalize transition-all whitespace-nowrap text-sm shrink-0 ${
                  filter === status
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <StatCard icon={Receipt} label="Total Invoices" value={totals.totalInvoices} />
          <StatCard icon={Wallet} label="Total Paid" value={formatNrs(totals.totalPaid)} />
          <StatCard icon={Clock} label="Awaiting Payment" value={totals.dueCount} accent={totals.dueCount > 0 ? 'warn' : undefined} />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
              <Receipt className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-gray-700 dark:text-gray-200 text-lg font-semibold">
              {filter === 'all' ? 'No invoices yet' : `No ${filter} invoices`}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Your bills and receipts will show up here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((invoice) => (
              <InvoiceCard key={invoice._id} invoice={invoice} onPay={() => setPayTarget(invoice)} />
            ))}
          </div>
        )}
      </div>

      {payTarget && (
        <InvoicePaymentModal
          invoice={payTarget}
          onClose={() => setPayTarget(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 p-4">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
      accent === 'warn' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-teal-50 dark:bg-teal-500/10'
    }`}>
      <Icon className={`w-[18px] h-[18px] ${accent === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}`} />
    </div>
    <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
  </div>
);

const InvoiceCard = ({ invoice, onPay }) => {
  const meta = statusMeta[invoice.status] || statusMeta.pending;
  const StatusIcon = meta.icon;
  const totalCharges = typeof invoice.charges === 'object' ? (invoice.charges.total ?? 0) : (invoice.charges ?? 0);
  const isPayable = invoice.status !== 'paid' && invoice.status !== 'refunded' && (invoice.balance ?? 0) > 0;
  const SourceIcon = invoice.orderType === 'food-service' ? UtensilsCrossed : BedDouble;

  return (
    <div className="group bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-sm hover:shadow-lg dark:hover:shadow-black/30 transition-all overflow-hidden border border-gray-100 dark:border-white/5">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center shrink-0">
              <SourceIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-gray-100">{invoice.invoiceId || 'N/A'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{invoice.hotel?.name || 'N/A'}{invoice.bookingRef ? ` · ${invoice.bookingRef}` : ''}</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 ${meta.className}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {meta.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Amount</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-0.5">{formatNrs(totalCharges)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Paid</p>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">{formatNrs(invoice.paid ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Balance</p>
            <p className={`font-semibold text-sm mt-0.5 ${(invoice.balance ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {formatNrs(invoice.balance ?? 0)}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {invoice.dueDate ? `Due ${new Date(invoice.dueDate).toLocaleDateString()}` : `Issued ${new Date(invoice.issuedAt).toLocaleDateString()}`}
          </span>
          {isPayable && (
            <button
              onClick={onPay}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              Pay Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Payment Modal
// ─────────────────────────────────────────

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
      await onSuccess(paymentIntent.id);
    } catch (err) {
      setFormError(err.message || 'An unexpected error occurred.');
      setSubmitting(false);
      onError?.(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your card details are encrypted and handled directly by Stripe</span>
        </div>
        <PaymentElement options={{ layout: { type: 'tabs', defaultCollapsed: false } }} />
      </div>

      {formError && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Pay {formatNrs(amount)}
          </>
        )}
      </button>
    </form>
  );
};

const PAYMENT_METHODS = [
  { id: 'esewa', name: 'eSewa', icon: '🟢', description: 'Pay with eSewa wallet', badge: 'Popular' },
  { id: 'khalti', name: 'Khalti', icon: '🟣', description: 'Pay with Khalti wallet', badge: 'Secure' },
  { id: 'card', name: 'Credit/Debit Card', icon: '💳', description: 'Visa, Mastercard, etc.' },
  { id: 'bank', name: 'Bank Transfer', icon: '🏦', description: 'Manual verification' },
];

const InvoicePaymentModal = ({ invoice, onClose, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState('esewa');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState(null); // null | 'redirecting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [cardClientSecret, setCardClientSecret] = useState(null);
  const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', bankName: '', transactionId: '' });

  const amount = invoice.balance ?? 0;

  const validateBank = () => {
    if (!bankDetails.accountName || bankDetails.accountName.length < 3) {
      toast.error('Please enter account holder name');
      return false;
    }
    if (!bankDetails.accountNumber || bankDetails.accountNumber.length < 5) {
      toast.error('Please enter a valid account number');
      return false;
    }
    if (!bankDetails.bankName || bankDetails.bankName.length < 3) {
      toast.error('Please enter your bank name');
      return false;
    }
    if (!bankDetails.transactionId || bankDetails.transactionId.length < 5) {
      toast.error('Please enter the transaction/reference ID');
      return false;
    }
    return true;
  };

  const handleCardConfirmed = async (paymentIntentId) => {
    try {
      const res = await confirmPayment(paymentIntentId, invoice._id);
      if (!res?.success) throw new Error(res?.message || 'Payment verification failed');
      setStatus('success');
      toast.success('Payment successful!');
      setTimeout(onSuccess, 1500);
    } catch (error) {
      setStatus('error');
      const msg = error.message || 'Payment verification failed. Contact support if you were charged.';
      setErrorMessage(msg);
      toast.error(msg, { autoClose: 5000 });
    }
  };

  const handlePay = async () => {
    if (processing) return;
    if (selectedMethod === 'bank' && !validateBank()) return;

    setProcessing(true);
    setErrorMessage('');
    let redirecting = false;

    try {
      const payload = { paymentMethod: selectedMethod };
      if (selectedMethod === 'bank') payload.bankTransferDetails = bankDetails;

      const result = await payOrder(invoice._id, payload);
      if (!result?.success) throw new Error(result?.message || 'Payment initiation failed');

      if (result.requiresClientConfirmation) {
        setCardClientSecret(result.clientSecret);
        setProcessing(false);
        return;
      }

      if (result.requiresRedirect) {
        redirecting = true;
        setStatus('redirecting');
        toast.info(`Redirecting to ${selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'}...`);
        if (result.redirectType === 'url') {
          setTimeout(() => { window.location.href = result.paymentUrl; }, 800);
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
          setTimeout(() => form.submit(), 400);
        }
        return;
      }

      if (result.requiresVerification) {
        setStatus('success');
        toast.success('Bank transfer submitted — verified within 24 hours.');
        setTimeout(onSuccess, 1500);
        return;
      }

      // Dev-mode simulated success (no gateway keys configured)
      setStatus('success');
      toast.success('Payment successful!');
      setTimeout(onSuccess, 1500);
    } catch (error) {
      setStatus('error');
      const msg = error.response?.data?.message || error.message || 'Payment failed. Please try again.';
      setErrorMessage(msg);
      toast.error(msg, { autoClose: 5000 });
    } finally {
      if (!redirecting) setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0f1c2e] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-transparent dark:border-white/10">
        <div className="sticky top-0 bg-white dark:bg-[#0f1c2e] border-b border-gray-100 dark:border-white/5 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pay Invoice {invoice.invoiceId}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatNrs(amount)} due</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={processing || status === 'redirecting'}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {status === 'success' && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-300">Payment Successful!</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">Your invoice has been updated.</p>
              </div>
            </div>
          )}

          {status === 'redirecting' && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-300">Redirecting to payment gateway...</p>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">Please don't close this window.</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900 dark:text-red-300">Payment Failed</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{errorMessage}</p>
                <button
                  onClick={() => { setStatus(null); setErrorMessage(''); }}
                  className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline mt-2"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Stripe card step */}
          {!status && cardClientSecret && (
            <div className="space-y-4">
              <button
                onClick={() => setCardClientSecret(null)}
                className="text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                &larr; Change payment method
              </button>
              <Elements options={{ clientSecret: cardClientSecret }} stripe={stripePromise}>
                <CardCheckoutForm amount={amount} onSuccess={handleCardConfirmed} />
              </Elements>
            </div>
          )}

          {/* Method selector */}
          {!status && !cardClientSecret && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-500" />
                  Select Payment Method
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      disabled={processing}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        selectedMethod === method.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10'
                          : 'border-gray-200 dark:border-white/10 hover:border-teal-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{method.name}</p>
                            {method.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-teal-500 text-white rounded-full font-bold uppercase">{method.badge}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{method.description}</p>
                        </div>
                      </div>
                      {selectedMethod === method.id && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {(selectedMethod === 'khalti' || selectedMethod === 'esewa') && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    You'll be redirected to {selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'}'s secure payment page and brought back here once you're done.
                  </p>
                </div>
              )}

              {selectedMethod === 'card' && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    You'll enter your card details on the next step, directly through Stripe's secure form. We never see or store your card number.
                  </p>
                </div>
              )}

              {selectedMethod === 'bank' && (
                <div className="space-y-3 bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <div className="bg-white dark:bg-[#0f1c2e] rounded-lg p-3 border border-gray-200 dark:border-white/10 flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p><span className="text-gray-400 dark:text-gray-500">Account:</span> <span className="font-semibold text-gray-900 dark:text-gray-200">StayHaven Hotels Pvt. Ltd.</span></p>
                      <p><span className="text-gray-400 dark:text-gray-500">Bank:</span> <span className="font-semibold text-gray-900 dark:text-gray-200">Nabil Bank Limited</span></p>
                      <p><span className="text-gray-400 dark:text-gray-500">A/C No:</span> <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">0123456789012345</span></p>
                    </div>
                  </div>
                  <input
                    type="text" placeholder="Your account name"
                    value={bankDetails.accountName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="text" placeholder="Your account number"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="text" placeholder="Your bank name"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="text" placeholder="Transaction / reference ID"
                    value={bankDetails.transactionId}
                    onChange={(e) => setBankDetails({ ...bankDetails, transactionId: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 dark:text-gray-100 font-mono"
                  />
                  <p className="text-xs text-amber-700 dark:text-amber-400">Verified manually within 24 hours.</p>
                </div>
              )}
            </>
          )}
        </div>

        {!status && !cardClientSecret && (
          <div className="sticky bottom-0 bg-gray-50 dark:bg-[#0b1220]/60 border-t border-gray-100 dark:border-white/5 px-6 py-4 flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-5 py-3 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePay}
              disabled={processing}
              className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {selectedMethod === 'khalti' || selectedMethod === 'esewa' ? <ExternalLink className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  {selectedMethod === 'card' ? 'Continue to Card Payment' : `Pay ${formatNrs(amount)}`}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingView;
