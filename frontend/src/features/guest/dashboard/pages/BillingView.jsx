/**
 * Guest Dashboard - Billing View
 * Invoice list, payment history, Stripe integration
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getGuestInvoices, payOrder, confirmPayment } from "../guestDashboardApi";
import { useSocket } from '../../../../core/context/SocketContext';
import { useTheme } from '../../../../core/hooks/useTheme';
import { toast } from 'react-toastify';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react';

const BillingView = () => {
  const { isDark } = useTheme();
  const { subscribe, isConnected } = useSocket();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(null);

  const formatNrs = useCallback((amount) => {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `Nrs ${safeAmount.toFixed(2)}`;
  }, []);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
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
  };

  // Handle real-time bill received notification
  const handleBillReceived = useCallback((payload) => {
    console.log('📄 Bill received:', payload);
    toast.info(`📄 New bill received for Order #${payload?.orderNumber || '--'}`, {
      autoClose: 5000,
    });
    // Refresh invoices to show the new bill
    loadInvoices();
  }, []);

  // Subscribe to bill-received events
  useEffect(() => {
    if (!subscribe || !isConnected) return;
    const unsubBill = subscribe('bill-received', handleBillReceived);
    return () => {
      unsubBill();
    };
  }, [subscribe, isConnected, handleBillReceived]);

  const handlePayNow = async (invoice) => {
    if (processingPayment) return;

    try {
      setProcessingPayment(invoice._id);

      // If dev mode (no Stripe key configured), simulate payment
      const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      if (!stripeKey) {
        // Simulate payment — call confirmPayment which handles dev-mode recording
        const res = await confirmPayment(`simulated_pi_${Date.now()}`, invoice._id);
        if (res?.success) {
          toast.success('Payment successful (simulated)');
          loadInvoices();
          return;
        }
        throw new Error(res?.message || 'Payment recording failed');
      }

      // Real Stripe payment
      const res = await payOrder(invoice._id, {
        amount: invoice.balance,
        currency: 'npr',
      });

      if (!res?.success) {
        throw new Error(res?.message || 'Payment initiation failed');
      }

      if (res.data?.simulated) {
        toast.success('Payment successful (simulated)');
        loadInvoices();
        return;
      }

      // Client-secret-based Stripe flow
      const stripe = await import('@stripe/stripe-js').then(m => m.loadStripe(stripeKey));
      const { error } = await stripe.confirmPayment({
        clientSecret: res.data.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/guest-dashboard/billing?payment=success`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setProcessingPayment(null);
    }
  };

  const statusColors = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
    partial: 'bg-orange-100 text-orange-700',
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-linear-to-br from-slate-950 to-slate-900' : 'bg-linear-to-br from-green-50 to-emerald-50'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 md:pb-8 ${isDark ? 'bg-linear-to-br from-slate-950 via-slate-900 to-gray-950 text-gray-100' : 'bg-linear-to-br from-green-50 via-emerald-50 to-teal-50'}`}>
      {/* Header */}
      <div className="hidden md:block bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Billing & Payments</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your invoices and payments</p>
            </div>
            {outstandingBalance > 0 && (
              <div className="bg-linear-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl shadow-lg">
                <p className="text-sm">Outstanding Balance</p>
                <p className="text-2xl font-bold">{formatNrs(outstandingBalance)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 md:pt-8 pb-8">
        <div className="md:hidden mb-4">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Billing</p>
          <div className="mt-2 rounded-2xl border bg-white/80 dark:bg-slate-900/60 p-4 flex items-center justify-between gap-3"
               style={{ borderColor: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(2,6,23,0.08)' }}>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatNrs(outstandingBalance)}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${outstandingBalance > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
              {outstandingBalance > 0 ? 'Due' : 'All clear'}
            </span>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-transparent dark:border-slate-800">
            <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No invoices found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <InvoiceCard
                key={invoice._id}
                invoice={invoice}
                onPay={() => handlePayNow(invoice)}
                processing={processingPayment === invoice._id}
                formatNrs={formatNrs}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const InvoiceCard = ({ invoice, onPay, processing, formatNrs }) => {
  const statusColors = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
    partial: 'bg-orange-100 text-orange-700',
    refunded: 'bg-gray-100 text-gray-700',
  };

  const statusIcon = {
    paid: <CheckCircle2 className="w-5 h-5" />,
    pending: <Clock className="w-5 h-5" />,
    overdue: <XCircle className="w-5 h-5" />,
    partial: <Clock className="w-5 h-5" />,
    refunded: <XCircle className="w-5 h-5" />,
  };

  // charges could be an object { room, extras, tax, total } or a plain number
  const totalCharges = typeof invoice.charges === 'object' ? (invoice.charges.total ?? 0) : (invoice.charges ?? 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6 border border-gray-100 dark:border-slate-800 hover:shadow-lg transition-all">
      <div className="grid md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Invoice ID</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.invoiceId || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount</p>
          <p className="font-bold text-lg text-gray-900 dark:text-gray-100">{formatNrs(totalCharges)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Balance</p>
          <p className="font-bold text-lg text-red-600">{formatNrs(invoice.balance ?? 0)}</p>
        </div>
        <div className="flex items-center justify-end">
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
              statusColors[invoice.status] || 'bg-gray-100 text-gray-700'
            }`}
          >
            {statusIcon[invoice.status] || <Clock className="w-5 h-5" />}
            {invoice.status}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <span>Hotel: {invoice.hotel?.name || 'N/A'}</span>
          {invoice.dueDate && (
            <span className="ml-4">
              Due: {new Date(invoice.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
        {invoice.status !== 'paid' && invoice.status !== 'refunded' && (invoice.balance ?? 0) > 0 && (
          <button
            onClick={onPay}
            disabled={processing}
            className="px-6 py-2 bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay Now
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default BillingView;
