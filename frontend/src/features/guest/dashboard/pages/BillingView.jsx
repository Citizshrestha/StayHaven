/**
 * Guest Dashboard - Billing View
 * Invoice list, payment history, multi-gateway payment (eSewa/Khalti/Card/Bank)
 *
 * The payment flow (idempotency key, submitLock, gateway gating, redirect /
 * client-confirmation / verification branches and the "creation is not proof
 * of payment" pending state) is behaviour-critical. This file restyles it;
 * the logic in InvoicePaymentModal.handlePay / handleCardConfirmed and the
 * card_return effect is intentionally unchanged.
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPaymentGatewayConfig, getCheckoutIdempotencyKey, rememberPaymentAttempt, redirectToWalletPayment } from '../../../../core/api/services/publicBooking.service';
import { getGuestInvoices, payOrder, confirmPayment } from '../guestDashboardApi';
import { useSocket } from '../../../../core/context/SocketContext';
import { toast } from 'react-toastify';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  Receipt, CreditCard, Wallet, CheckCircle2, Clock, AlertTriangle, Loader2, Lock,
  ExternalLink, Shield, Building2, UtensilsCrossed, BedDouble, RefreshCw, ArrowLeft, Info,
} from 'lucide-react';
import { cn } from '../../../../core/utils/cn';
import usePullToRefresh from '../hooks/usePullToRefresh';
import { formatDate, formatMoney } from '../utils/format';
import Button from '../components/ui/Button';
import Money from '../components/ui/Money';
import PageHeader from '../components/ui/PageHeader';
import FilterTabs from '../components/ui/FilterTabs';
import StatusBadge from '../components/ui/StatusBadge';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import Sheet from '../components/ui/Sheet';
import PullIndicator from '../components/ui/PullIndicator';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';

// loadStripe(undefined) throws on import, which broke every page that loaded
// this chunk when no publishable key is configured.
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = typeof STRIPE_KEY === 'string' && STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const FILTERS = ['all', 'pending', 'partial', 'overdue', 'paid'];
const FILTER_LABELS = { all: 'All', pending: 'Pending', partial: 'Partial', overdue: 'Overdue', paid: 'Paid' };
const INVOICE_LIST_ID = 'invoice-list';

const isPayable = (invoice) =>
  invoice.status !== 'paid' && invoice.status !== 'refunded' && (invoice.balance ?? 0) > 0;

const BillingView = () => {
  const { subscribe, isConnected } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [payTarget, setPayTarget] = useState(null);
  const cardReturnStarted = useRef(false);

  const statusParam = searchParams.get('status');
  const filter = FILTERS.includes(statusParam) ? statusParam : 'all';
  const setFilter = (value) => setSearchParams(value === 'all' ? {} : { status: value });

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await getGuestInvoices();
      if (res?.success) {
        setInvoices(res.data || []);
        setOutstandingBalance(res.outstandingBalance || 0);
        setLoaded(true);
      } else {
        setLoadError(res?.message || 'We couldn’t load your invoices.');
      }
    } catch (error) {
      console.error('Invoices load error:', error);
      const msg = error.response?.data?.message || 'Failed to load invoices';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const { pull, refreshing } = usePullToRefresh(loadInvoices);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('card_return') !== '1' || cardReturnStarted.current) return;
    cardReturnStarted.current = true;
    const paymentIntentId = query.get('payment_intent');
    const targetId = query.get('target');
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId || '') || !/^[a-f\d]{24}$/i.test(targetId || '')) {
      window.history.replaceState({}, '', window.location.pathname);
      toast.error('Card payment return could not be verified. Please contact support before retrying.');
      return;
    }
    confirmPayment(paymentIntentId, targetId).then(() => {
      window.history.replaceState({}, '', window.location.pathname);
      toast.success('Card payment confirmed.');
      loadInvoices();
    }).catch(() => toast.error('Card payment needs verification. Reload this page to check again before starting another payment.'));
  }, [loadInvoices]);

  // Real-time "bill received" notification (e.g. room-service order billed)
  const handleBillReceived = useCallback((payload) => {
    toast.info(`New bill received for Order #${payload?.orderNumber || '--'}`, { autoClose: 5000 });
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    if (!subscribe || !isConnected) return undefined;
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

  // "Pay now" on the balance card opens the oldest unpaid invoice.
  const oldestPayable = useMemo(() => {
    const payable = invoices.filter(isPayable);
    const when = (inv) => new Date(inv.dueDate || inv.issuedAt || 0).getTime() || 0;
    return payable.sort((a, b) => when(a) - when(b))[0] || null;
  }, [invoices]);

  const filterOptions = useMemo(() => FILTERS.map((value) => ({
    value,
    label: FILTER_LABELS[value],
    count: value === 'all' ? invoices.length : invoices.filter((inv) => inv.status === value).length,
  })), [invoices]);

  const handlePaymentSuccess = () => {
    setPayTarget(null);
    loadInvoices();
  };

  if (!loaded && loading) return <BillingSkeleton />;

  if (!loaded && loadError) {
    return (
      <div>
        <PageHeader title="Billing & payments" subtitle="Invoices and payments for your stays" />
        <div role="alert">
          <EmptyState
            icon={AlertTriangle}
            title="Invoices unavailable"
            description={loadError}
            action={<Button variant="secondary" icon={RefreshCw} onClick={loadInvoices}>Try again</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PullIndicator pull={pull} refreshing={refreshing} />

      <PageHeader title="Billing & payments" subtitle="Invoices and payments for your stays" />

      {/* Outstanding balance — rendered once, responsive */}
      {outstandingBalance > 0 ? (
        <section
          aria-label="Outstanding balance"
          className="mb-5 rounded-(--g-radius-lg) bg-(--g-danger-fill) text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <p className="g-label text-white/85">Outstanding balance</p>
            <Money amount={outstandingBalance} size="lg" className="block mt-1" />
            <p className="g-small text-white/85 mt-1">
              <span className="guestNum">{totals.dueCount}</span> invoice{totals.dueCount === 1 ? '' : 's'} due
            </p>
          </div>
          {oldestPayable && (
            <button
              type="button"
              onClick={() => setPayTarget(oldestPayable)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-(--g-radius-sm) bg-white text-(--g-danger-fill) g-small font-bold hover:bg-white/90 transition-colors duration-150"
            >
              <CreditCard className="w-4 h-4" aria-hidden="true" />
              Pay now
            </button>
          )}
        </section>
      ) : invoices.length > 0 && (
        <section
          aria-label="Outstanding balance"
          className="mb-5 rounded-(--g-radius-lg) bg-(--g-success-bg) text-(--g-success-text) p-4 flex items-center gap-3"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
          <p className="g-body-strong">All settled — nothing due right now.</p>
        </section>
      )}

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
        <StatCard icon={Receipt} tone="indigo" label="Total invoices" value={<span className="guestNum">{totals.totalInvoices}</span>} />
        <StatCard icon={Wallet} tone="success" label="Total paid" value={formatMoney(totals.totalPaid, 0)} />
        <StatCard
          icon={Clock}
          tone={totals.dueCount > 0 ? 'warning' : 'neutral'}
          label="Awaiting payment"
          value={<span className="guestNum">{totals.dueCount}</span>}
        />
      </div>

      <div className="mb-4">
        <FilterTabs label="Filter invoices" options={filterOptions} value={filter} onChange={setFilter} controls={INVOICE_LIST_ID} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filter === 'all' ? 'No invoices yet' : `No ${FILTER_LABELS[filter].toLowerCase()} invoices`}
          description="Your bills and receipts will show up here."
          action={filter !== 'all' && <Button variant="secondary" onClick={() => setFilter('all')}>Show all invoices</Button>}
        />
      ) : (
        <ul id={INVOICE_LIST_ID} className="space-y-3">
          {filtered.map((invoice) => (
            <li key={invoice._id}>
              <InvoiceCard invoice={invoice} onPay={() => setPayTarget(invoice)} />
            </li>
          ))}
        </ul>
      )}

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

const BillingSkeleton = () => (
  <div role="status" aria-live="polite">
    <span className="sr-only">Loading your invoices…</span>
    <div aria-hidden="true">
      <Skeleton className="h-7 w-56 mb-2" />
      <Skeleton className="h-4 w-72 mb-6" />
      <Skeleton className="h-28 w-full mb-5 rounded-(--g-radius-lg)" />
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
        {[0, 1, 2].map((i) => <SkeletonCard key={i} lines={1} />)}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <SkeletonCard key={i} lines={2} />)}
      </div>
    </div>
  </div>
);

const AmountCell = ({ label, amount, className }) => (
  <div className="rounded-(--g-radius-sm) bg-(--g-surface-sunken) px-3 py-2.5 text-right">
    <p className="g-label text-(--g-text-muted)">{label}</p>
    <Money amount={amount} className={cn('block g-small font-semibold mt-0.5', className)} />
  </div>
);

AmountCell.propTypes = { label: PropTypes.string.isRequired, amount: PropTypes.number, className: PropTypes.string };

const InvoiceCard = ({ invoice, onPay }) => {
  const totalCharges = typeof invoice.charges === 'object' ? (invoice.charges.total ?? 0) : (invoice.charges ?? 0);
  const payable = isPayable(invoice);
  const SourceIcon = invoice.orderType === 'food-service' ? UtensilsCrossed : BedDouble;
  const balance = invoice.balance ?? 0;

  return (
    <article className="rounded-(--g-radius-md) border border-(--g-border) bg-(--g-surface) shadow-(--g-shadow-sm) p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className={cn('w-11 h-11 shrink-0 rounded-(--g-radius-sm) flex items-center justify-center', invoice.orderType === 'food-service' ? 'g-tone-orange' : 'g-tone-sky')}>
            <SourceIcon className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">{invoice.orderType === 'food-service' ? 'Food service' : 'Room stay'}</span>
          </span>
          <div className="min-w-0">
            <h3 className="g-body-strong truncate">{invoice.invoiceId || 'Invoice'}</h3>
            <p className="g-small text-(--g-text-muted) truncate">
              {invoice.hotel?.name || 'Hotel'}{invoice.bookingRef ? ` · ${invoice.bookingRef}` : ''}
            </p>
          </div>
        </div>
        <StatusBadge domain="invoice" status={invoice.status} className="shrink-0" />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <AmountCell label="Amount" amount={totalCharges} className="text-(--g-text)" />
        <AmountCell label="Paid" amount={invoice.paid ?? 0} className="text-(--g-success-text)" />
        <AmountCell label="Balance" amount={balance} className={balance > 0 ? 'text-(--g-danger-text)' : 'text-(--g-text)'} />
      </div>

      <div className="mt-4 pt-4 border-t border-(--g-border) flex items-center justify-between gap-3">
        <span className="g-small text-(--g-text-muted) guestNum">
          {invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : `Issued ${formatDate(invoice.issuedAt)}`}
        </span>
        {payable && (
          <Button icon={CreditCard} onClick={onPay} aria-label={`Pay invoice ${invoice.invoiceId || ''}`.trim()}>
            Pay now
          </Button>
        )}
      </div>
    </article>
  );
};

InvoiceCard.propTypes = { invoice: PropTypes.object.isRequired, onPay: PropTypes.func.isRequired };

// One banner for every payment status; tones come from the status tokens.
const BANNER_TONE = {
  success: 'bg-(--g-success-bg) text-(--g-success-text)',
  info: 'bg-(--g-info-bg) text-(--g-info-text)',
  warning: 'bg-(--g-warning-bg) text-(--g-warning-text)',
  danger: 'bg-(--g-danger-bg) text-(--g-danger-text)',
};

const StatusBanner = ({ tone, icon: Icon, title, children, role = 'status', spin }) => (
  <div role={role} className={cn('rounded-(--g-radius-md) p-4 flex items-start gap-3', BANNER_TONE[tone])}>
    <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', spin && 'animate-spin')} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <p className="g-body-strong">{title}</p>
      {children && <div className="g-small mt-0.5">{children}</div>}
    </div>
  </div>
);

StatusBanner.propTypes = {
  tone: PropTypes.oneOf(Object.keys(BANNER_TONE)).isRequired,
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.node.isRequired,
  children: PropTypes.node,
  role: PropTypes.string,
  spin: PropTypes.bool,
};

// ─────────────────────────────────────────
// Payment Modal
// ─────────────────────────────────────────

const CardCheckoutForm = ({ amount, targetId, onSuccess, onError }) => {
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
        confirmParams: { return_url: `${window.location.origin}/guest-dashboard/billing?card_return=1&target=${encodeURIComponent(targetId)}` },
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
      setFormError('Payment could not be confirmed. Check your invoice before paying again.');
      setSubmitting(false);
      onError?.(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-(--g-radius-md) border border-(--g-border) bg-(--g-surface-sunken) p-4">
        <p className="flex items-center gap-2 mb-4 g-small text-(--g-text-muted)">
          <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
          Your card details are encrypted and handled directly by Stripe
        </p>
        <PaymentElement options={{ layout: { type: 'tabs', defaultCollapsed: false } }} />
      </div>

      {formError && (
        <StatusBanner tone="danger" icon={AlertTriangle} title="Card payment failed" role="alert">
          {formError}
        </StatusBanner>
      )}

      <Button type="submit" className="w-full" icon={Lock} loading={submitting} disabled={!stripe}>
        {submitting ? 'Processing…' : `Pay ${formatMoney(amount)}`}
      </Button>
    </form>
  );
};

CardCheckoutForm.propTypes = {
  amount: PropTypes.number.isRequired,
  targetId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func,
};

const PAYMENT_METHODS = [
  { id: 'esewa', name: 'eSewa', icon: Wallet, description: 'Pay with eSewa wallet', badge: 'Popular' },
  { id: 'khalti', name: 'Khalti', icon: Wallet, description: 'Pay with Khalti wallet', badge: 'Secure' },
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, etc.' },
  { id: 'bank', name: 'Bank Transfer', icon: Building2, description: 'Manual verification' },
];

const BANK_FIELDS = [
  { key: 'accountName', label: 'Your account name', autoComplete: 'name' },
  { key: 'accountNumber', label: 'Your account number', inputMode: 'numeric', transform: (v) => v.replace(/\D/g, '') },
  { key: 'bankName', label: 'Your bank name' },
  { key: 'transactionId', label: 'Transaction / reference ID', transform: (v) => v.toUpperCase(), mono: true },
];

const InvoicePaymentModal = ({ invoice, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const submitLock = useRef(false);
  const [gatewayConfig, setGatewayConfig] = useState(null);
  const [configState, setConfigState] = useState('loading');
  const [configRun, setConfigRun] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('esewa');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState(null); // null | 'redirecting' | 'success' | 'error' | 'pending' | 'submitted'
  const [errorMessage, setErrorMessage] = useState('');
  const [cardClientSecret, setCardClientSecret] = useState(null);
  const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', bankName: '', transactionId: '' });
  const [bankErrors, setBankErrors] = useState({});

  const amount = invoice.balance ?? 0;
  const receivingAccount = invoice.hotel?.bankTransferAccount;
  const bankAvailable = receivingAccount?.enabled === true && Boolean(receivingAccount.accountName && receivingAccount.bankName && receivingAccount.accountNumber);
  const walletSelected = ['esewa', 'khalti'].includes(selectedMethod);
  const walletUnavailable = walletSelected && gatewayConfig?.[selectedMethod]?.enabled !== true;

  useEffect(() => {
    const controller = new AbortController();
    setConfigState('loading');
    getPaymentGatewayConfig({ signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setGatewayConfig(result.data);
      setSelectedMethod((current) => {
        if (!['esewa', 'khalti'].includes(current) || result.data?.[current]?.enabled === true) return current;
        return ['khalti', 'esewa'].find((gateway) => result.data?.[gateway]?.enabled === true) || 'card';
      });
      setConfigState('ready');
    }).catch(() => {
      if (!controller.signal.aborted) {
        setSelectedMethod((current) => ['esewa', 'khalti'].includes(current) ? 'card' : current);
        setConfigState('error');
      }
    });
    return () => controller.abort();
  }, [configRun]);

  // Same rules as before; errors now render inline next to each field.
  const validateBank = () => {
    const errors = {};
    if (!bankDetails.accountName || bankDetails.accountName.length < 3) errors.accountName = 'Please enter account holder name';
    if (!bankDetails.accountNumber || bankDetails.accountNumber.length < 5) errors.accountNumber = 'Please enter a valid account number';
    if (!bankDetails.bankName || bankDetails.bankName.length < 3) errors.bankName = 'Please enter your bank name';
    if (!bankDetails.transactionId || bankDetails.transactionId.length < 5) errors.transactionId = 'Please enter the transaction/reference ID';
    setBankErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) document.getElementById(`bank-${first}`)?.focus();
    return !first;
  };

  const handleCardConfirmed = async (paymentIntentId) => {
    try {
      const res = await confirmPayment(paymentIntentId, invoice._id);
      if (!res?.success) throw new Error(res?.message || 'Payment verification failed');
      setStatus('success');
      toast.success('Payment successful!');
      setTimeout(onSuccess, 1500);
    } catch {
      setStatus('error');
      const msg = 'Payment could not be confirmed. Contact support if you were charged.';
      setErrorMessage(msg);
      toast.error(msg, { autoClose: 5000 });
    }
  };

  const handlePay = async () => {
    if (processing || submitLock.current || walletUnavailable) return;
    if (selectedMethod === 'bank' && !bankAvailable) return;
    if (selectedMethod === 'bank' && !validateBank()) return;

    submitLock.current = true;
    setProcessing(true);
    setErrorMessage('');
    let redirecting = false;

    try {
      const payload = { paymentMethod: selectedMethod };
      if (selectedMethod === 'bank') payload.bankTransferDetails = bankDetails;

      const key = walletSelected ? await getCheckoutIdempotencyKey(`invoice:${invoice._id}`, payload) : undefined;
      const result = await payOrder(invoice._id, payload, key);
      if (!result?.success) throw new Error(result?.message || 'Payment initiation failed');

      if (walletSelected) {
        if (!/^[a-f\d]{24}$/i.test(result.paymentAttemptId || '')) throw new Error('Missing payment reference');
        rememberPaymentAttempt(key, result.paymentAttemptId);
        setAttemptId(result.paymentAttemptId);
        if (result.requiresRedirect && !result.requiresStatusCheck) {
          redirectToWalletPayment(result);
          redirecting = true;
          setStatus('redirecting');
        } else {
          navigate(`/payment-callback?attempt=${result.paymentAttemptId}`);
        }
        return;
      }

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
        setStatus('submitted');
        toast.info('Bank transfer submitted — awaiting staff verification against the bank statement.');
        return;
      }

      // Creation alone is never proof that money was received.
      setStatus('pending');
      setErrorMessage('Payment is not confirmed yet. Check your invoice before paying again.');
    } catch {
      setStatus(walletSelected ? 'pending' : 'error');
      const msg = 'Payment could not be confirmed. Check the same payment again before starting another payment.';
      setErrorMessage(msg);
      toast.error(msg, { autoClose: 5000 });
    } finally {
      if (!redirecting) {
        submitLock.current = false;
        setProcessing(false);
      }
    }
  };

  const methodDisabled = (id) =>
    processing || (['esewa', 'khalti'].includes(id) && gatewayConfig?.[id]?.enabled !== true) || (id === 'bank' && !bankAvailable);

  const methodCaption = (id) => {
    if (['esewa', 'khalti'].includes(id)) {
      if (gatewayConfig?.[id]?.enabled === true) return gatewayConfig[id].testMode ? 'Test mode' : 'Available';
      return 'Unavailable';
    }
    if (id === 'bank' && !bankAvailable) return 'Hotel bank account not configured';
    return null;
  };

  const showSelector = !status && !cardClientSecret;

  const footer = showSelector && (
    <div className="flex items-center gap-3">
      <Button variant="secondary" onClick={onClose} disabled={processing}>Cancel</Button>
      <Button
        className="flex-1"
        onClick={handlePay}
        loading={processing}
        disabled={walletUnavailable}
        icon={walletSelected ? ExternalLink : Lock}
      >
        {processing ? 'Processing…' : selectedMethod === 'card' ? 'Continue to card payment' : `Pay ${formatMoney(amount)}`}
      </Button>
    </div>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!(processing || status === 'redirecting')}
      title={`Pay invoice ${invoice.invoiceId || ''}`.trim()}
      description={<><span className="guestNum">{formatMoney(amount)}</span> due</>}
      footer={footer}
    >
      <div className="space-y-5">
        {status === 'submitted' && (
          <StatusBanner tone="info" icon={Building2} title="Bank transfer submitted">
            Your payment is awaiting manual verification.
          </StatusBanner>
        )}

        {status === 'pending' && (
          <StatusBanner tone="warning" icon={Clock} title="Payment pending confirmation">
            <p>{errorMessage}</p>
            <button
              type="button"
              disabled={processing}
              className="mt-2 min-h-[44px] font-semibold underline disabled:opacity-50"
              onClick={() => {
                if (attemptId) navigate(`/payment-callback?attempt=${attemptId}`);
                else handlePay();
              }}
            >
              {attemptId ? 'Check payment status' : 'Retry same checkout'}
            </button>
          </StatusBanner>
        )}

        {status === 'success' && (
          <StatusBanner tone="success" icon={CheckCircle2} title="Payment successful">
            Your invoice has been updated.
          </StatusBanner>
        )}

        {status === 'redirecting' && (
          <StatusBanner tone="info" icon={Loader2} spin title="Redirecting to payment gateway…">
            Please don’t close this window.
          </StatusBanner>
        )}

        {status === 'error' && (
          <StatusBanner tone="danger" icon={AlertTriangle} title="Payment failed" role="alert">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => { setStatus(null); setErrorMessage(''); }}
              className="mt-2 min-h-[44px] font-semibold underline"
            >
              Try again
            </button>
          </StatusBanner>
        )}

        {/* Stripe card step */}
        {!status && cardClientSecret && (
          <div className="space-y-4">
            <Button variant="ghost" icon={ArrowLeft} className="-ml-2" onClick={() => setCardClientSecret(null)}>
              Change payment method
            </Button>
            {stripePromise ? (
              <Elements options={{ clientSecret: cardClientSecret }} stripe={stripePromise}>
                <CardCheckoutForm amount={amount} targetId={invoice._id} onSuccess={handleCardConfirmed} />
              </Elements>
            ) : (
              <StatusBanner tone="warning" icon={AlertTriangle} title="Card payments are unavailable" role="alert">
                Card checkout isn’t configured right now. Please choose another payment method or pay at the front desk.
              </StatusBanner>
            )}
          </div>
        )}

        {/* Method selector */}
        {showSelector && (
          <>
            <fieldset>
              <legend className="g-small font-semibold text-(--g-text) mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-(--g-primary-text)" aria-hidden="true" />
                Select payment method
              </legend>
              {configState === 'loading' && (
                <p role="status" className="g-small text-(--g-text-muted) mb-3 inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Loading wallet availability…
                </p>
              )}
              {configState === 'error' && (
                <div role="alert" className="mb-3 g-small text-(--g-warning-text) bg-(--g-warning-bg) rounded-(--g-radius-sm) px-3 py-2 flex items-center justify-between gap-3">
                  <span>Wallet options unavailable.</span>
                  <button type="button" className="min-h-[44px] font-semibold underline" onClick={() => setConfigRun((value) => value + 1)}>
                    Reload options
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const selected = selectedMethod === method.id;
                  const disabled = methodDisabled(method.id);
                  const caption = methodCaption(method.id);
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      disabled={disabled}
                      aria-pressed={selected}
                      className={cn(
                        'relative min-h-[44px] p-4 rounded-(--g-radius-md) border-2 text-left transition-colors duration-150',
                        selected
                          ? 'border-(--g-primary) bg-(--g-primary-tint)'
                          : 'border-(--g-border) bg-(--g-surface) hover:border-(--g-border-strong)',
                        disabled && 'opacity-60 cursor-not-allowed bg-(--g-surface-sunken) hover:border-(--g-border)'
                      )}
                    >
                      <div className="flex items-start gap-3 pr-6">
                        <span className={cn(
                          'w-10 h-10 shrink-0 rounded-(--g-radius-sm) flex items-center justify-center',
                          disabled ? 'bg-(--g-neutral-bg) text-(--g-neutral-text)' : 'bg-(--g-primary-tint) text-(--g-primary-text)'
                        )}>
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="g-small font-semibold text-(--g-text)">{method.name}</span>
                            {method.badge && !disabled && (
                              <span className="g-label px-1.5 py-0.5 rounded-(--g-radius-pill) bg-(--g-primary-fill) text-(--g-on-primary)">{method.badge}</span>
                            )}
                          </span>
                          <span className="block g-small text-(--g-text-muted) mt-0.5">{method.description}</span>
                          {caption && (
                            <span className={cn(
                              'block g-small font-semibold mt-1',
                              caption === 'Test mode' ? 'text-(--g-warning-text)'
                                : caption === 'Available' ? 'text-(--g-success-text)'
                                  : 'text-(--g-text-muted)'
                            )}>
                              {caption}
                            </span>
                          )}
                        </div>
                      </div>
                      {selected && (
                        <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-(--g-primary-text)" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {walletSelected && (
              <StatusBanner tone="warning" icon={ExternalLink} title={`You’ll continue on ${selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'}`}>
                You’ll be redirected to {selectedMethod === 'khalti' ? 'Khalti' : 'eSewa'}’s secure payment page and brought back here once you’re done.
              </StatusBanner>
            )}

            {selectedMethod === 'card' && (
              <StatusBanner tone="info" icon={Lock} title="Secure card entry">
                You’ll enter your card details on the next step, directly through Stripe’s secure form. We never see or store your card number.
              </StatusBanner>
            )}

            {selectedMethod === 'bank' && (
              <div className="space-y-4 rounded-(--g-radius-md) border border-(--g-border) bg-(--g-surface-sunken) p-4">
                <div className="rounded-(--g-radius-sm) border border-(--g-border) bg-(--g-surface) p-3 flex items-start gap-3">
                  <Building2 className="w-5 h-5 shrink-0 mt-0.5 text-(--g-primary-text)" aria-hidden="true" />
                  <dl className="g-small grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <dt className="text-(--g-text-muted)">Account</dt>
                    <dd className="font-semibold">{receivingAccount?.accountName}</dd>
                    <dt className="text-(--g-text-muted)">Bank</dt>
                    <dd className="font-semibold">{receivingAccount?.bankName}</dd>
                    <dt className="text-(--g-text-muted)">A/C No</dt>
                    <dd className="font-mono font-semibold text-(--g-primary-text)">{receivingAccount?.accountNumber}</dd>
                    {receivingAccount?.branch && (
                      <>
                        <dt className="text-(--g-text-muted)">Branch</dt>
                        <dd>{receivingAccount.branch}</dd>
                      </>
                    )}
                  </dl>
                </div>

                {BANK_FIELDS.map((field) => {
                  const id = `bank-${field.key}`;
                  const error = bankErrors[field.key];
                  return (
                    <div key={field.key}>
                      <label htmlFor={id} className="g-label text-(--g-text-muted)">{field.label}</label>
                      <input
                        id={id}
                        type="text"
                        inputMode={field.inputMode}
                        autoComplete={field.autoComplete || 'off'}
                        value={bankDetails[field.key]}
                        onChange={(e) => {
                          const value = field.transform ? field.transform(e.target.value) : e.target.value;
                          setBankDetails({ ...bankDetails, [field.key]: value });
                          if (error) setBankErrors((prev) => ({ ...prev, [field.key]: undefined }));
                        }}
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={error ? `${id}-error` : undefined}
                        className={cn(
                          'mt-1 w-full min-h-[44px] px-3 rounded-(--g-radius-sm) border bg-(--g-surface) text-(--g-text) g-body outline-none focus:border-(--g-primary)',
                          field.mono && 'font-mono',
                          error ? 'border-(--g-danger)' : 'border-(--g-border)'
                        )}
                      />
                      {error && <p id={`${id}-error`} className="g-small text-(--g-danger-text) mt-1">{error}</p>}
                    </div>
                  );
                })}

                <p className="g-small text-(--g-warning-text) flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  Keep your bank receipt. Staff will mark this paid only after the transfer appears on the hotel bank statement.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
};

InvoicePaymentModal.propTypes = {
  invoice: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default BillingView;
