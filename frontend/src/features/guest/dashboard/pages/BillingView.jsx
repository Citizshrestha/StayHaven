/**
 * Guest Dashboard - Billing View
 * Invoice list, payment history, integrated with PaymentModal
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getGuestInvoices } from "../guestDashboardApi";
import { useSocket } from '../../../../core/context/SocketContext';
import { useTheme } from '../../../../core/hooks/useTheme';
import { toast } from 'react-toastify';
import PaymentModal from '../../../../shared/components/PaymentModal';
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
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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

  // Handle real-time payment confirmation
  const handlePaymentConfirmed = useCallback((payload) => {
    console.log('✅ Payment confirmed:', payload);
    toast.success(`✅ Payment confirmed! Transaction ID: ${payload?.transactionId || '--'}`, {
      autoClose: 5000,
    });
    // Refresh invoices to show updated payment status
    loadInvoices();
  }, []);

  // Subscribe to bill-received and payment-confirmed events
  useEffect(() => {
    if (!subscribe || !isConnected) return;
    const unsubBill = subscribe('bill-received', handleBillReceived);
    const unsubPayment = subscribe('payment-confirmed', handlePaymentConfirmed);
    return () => {
      unsubBill();
      unsubPayment();
    };
  }, [subscribe, isConnected, handleBillReceived, handlePaymentConfirmed]);

  const handlePayNow = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (paymentResult) => {
    console.log('Payment successful:', paymentResult);
    toast.success('Payment completed successfully!');
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    // Refresh invoices to show updated status
    loadInvoices();
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    // Error toast is already shown by PaymentModal
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
    <div className={`min-h-screen pb-12 ${isDark ? 'bg-linear-to-br from-slate-950 via-slate-900 to-gray-950 text-gray-100' : 'bg-linear-to-br from-green-50 via-emerald-50 to-teal-50'}`}>
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Billing & Payments</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your invoices and payments</p>
            </div>
            {outstandingBalance > 0 && (
              <div className="bg-linear-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl shadow-lg">
                <p className="text-sm">Outstanding Balance</p>
                <p className="text-2xl font-bold">Rs. {outstandingBalance.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const InvoiceCard = ({ invoice, onPay }) => {
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
          <p className="font-bold text-lg text-gray-900 dark:text-gray-100">Rs. {totalCharges.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Balance</p>
          <p className="font-bold text-lg text-red-600">Rs. {(invoice.balance ?? 0).toLocaleString()}</p>
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
            className="px-6 py-2 bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-md transition-all flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Pay Now
          </button>
        )}
      </div>
    </div>
  );
};

export default BillingView;
