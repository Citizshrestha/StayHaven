/**
 * Professional Bill Preview Modal
 * Industry-standard invoice design with print and send functionality
 * Used across Waiter, Receptionist, and Admin dashboards
 */

import React, { useState, useRef } from 'react';
import { X, Printer, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';

const BillPreviewModal = ({ 
  order, 
  hotel, 
  onClose, 
  onSendBill,
  isOpen 
}) => {
  const [sendMethod, setSendMethod] = useState('app');
  const [email, setEmail] = useState(order?.customerEmail || '');
  const [phone, setPhone] = useState(order?.customerPhone || '');
  const [sending, setSending] = useState(false);
  const printRef = useRef();

  if (!isOpen || !order) return null;

  // Calculate bill details
  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = 0.13; // 13% VAT in Nepal
  const tax = subtotal * taxRate;
  const serviceCharge = 0; // Can be configured
  const grandTotal = subtotal + tax + serviceCharge;

  const isPaid = order.paymentStatus === 'paid';
  const billSent = order.billSent;

  // Handle print
  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '', 'height=600,width=800');
    
    printWindow.document.write('<html><head><title>Bill #' + order.orderNumber + '</title>');
    printWindow.document.write(`
      <style>
        body { font-family: 'Courier New', monospace; padding: 20px; }
        .bill-container { max-width: 400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
        .hotel-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
        .hotel-info { font-size: 12px; }
        .bill-details { margin: 15px 0; font-size: 12px; }
        .bill-details div { display: flex; justify-content: space-between; margin: 5px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
        .items-table th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
        .items-table td { padding: 5px 0; }
        .totals { margin-top: 15px; border-top: 1px solid #000; padding-top: 10px; }
        .totals div { display: flex; justify-content: space-between; margin: 5px 0; }
        .grand-total { font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; font-size: 11px; border-top: 2px dashed #000; padding-top: 10px; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  // Handle send bill
  const handleSendBill = async () => {
    // Validate based on method
    if (sendMethod === 'email' && !email) {
      toast.error('Please enter email address');
      return;
    }

    try {
      setSending(true);
      const orderId = order._id || order.id;

      console.log('🔍 Send Bill Debug:', {
        order,
        orderId,
        hasId: !!order.id,
        has_id: !!order._id,
        orderKeys: Object.keys(order),
      });

      if (!orderId) {
        console.error('❌ Order ID not found. Order object:', order);
        toast.error('Order ID not found');
        setSending(false);
        return;
      }

      await onSendBill(orderId, {
        method: sendMethod,
        email: sendMethod === 'email' ? email : undefined,
      });

      const methodLabel = sendMethod === 'app' ? 'app notification' : sendMethod;
      toast.success(`📧 Bill sent successfully via ${methodLabel}! Guest will make the payment.`);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error('Send bill error:', error);
      toast.error(error.response?.data?.message || 'Failed to send bill');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'transparent' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-200"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Bill Preview</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Bill Content - Printable */}
        <div ref={printRef} className="p-8">
          <div className="bill-container max-w-md mx-auto">
            {/* Header */}
            <div className="header text-center mb-6 pb-4 border-b-2 border-dashed border-gray-400">
              <div className="hotel-name text-2xl font-bold text-gray-900 mb-2">
                {hotel?.name || 'Test Hotel'}
              </div>
              <div className="hotel-info text-sm text-gray-600">
                <div>{hotel?.location?.address || '123 Test Street, Dhulikhel, Kathmandu'}</div>
                <div>Tel: {hotel?.contact?.phone || '+977 1 4321000'}</div>
              </div>
            </div>

            {/* Bill Details */}
            <div className="bill-details text-sm space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Bill No:</span>
                <span className="font-semibold">#{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-semibold">
                  {new Date(order.createdAt).toLocaleString('en-NP', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span className="font-semibold">
                  {order.orderType === 'takeaway'
                    ? 'Takeaway'
                    : order.orderType === 'roomService'
                      ? `Room ${order.roomNumber}`
                      : `Table ${order.tableNumber}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-semibold">{order.customerName || 'Guest'}</span>
              </div>
            </div>

            {/* Items Table */}
            <table className="items-table w-full text-sm mb-6">
              <thead>
                <tr className="border-b border-gray-900">
                  <th className="text-left py-2">ITEM</th>
                  <th className="text-center py-2">QTY</th>
                  <th className="text-right py-2">PRICE</th>
                  <th className="text-right py-2">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-2">{item.name}</td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">Nrs {item.price.toFixed(2)}</td>
                    <td className="text-right py-2 font-semibold">
                      Nrs {(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="totals space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">Nrs {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT (13%):</span>
                <span className="font-semibold">Nrs {tax.toFixed(2)}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Charge:</span>
                  <span className="font-semibold">Nrs {serviceCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="grand-total flex justify-between text-lg font-bold border-t-2 border-gray-900 pt-3 mt-3">
                <span>GRAND TOTAL:</span>
                <span>Nrs {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Status */}
            {isPaid && (
              <div className="mt-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  <span>PAID</span>
                </div>
                <div className="text-center text-sm text-green-600 mt-1">
                  {new Date(order.paidAt).toLocaleString('en-NP')}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="footer text-center mt-6 pt-4 border-t-2 border-dashed border-gray-400 text-xs text-gray-600">
              <div className="mb-2">Thank you for your visit!</div>
              <div>Please visit again</div>
            </div>
          </div>
        </div>

        {/* Actions - Not Printable */}
        <div className="no-print sticky bottom-0 bg-gray-50 border-t px-6 py-4 space-y-4">
          {/* Bill Sent Status */}
          {billSent && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-800 font-medium">
                Bill sent on {new Date(order.billSentAt).toLocaleString('en-NP')} via {order.billSentTo?.method}
              </span>
            </div>
          )}

          {/* Payment Status Info */}
          {!isPaid && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-800 font-medium">
                Payment pending - Guest will pay after receiving the bill
              </span>
            </div>
          )}

          {isPaid && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                Payment received on {new Date(order.paidAt).toLocaleString('en-NP')}
              </span>
            </div>
          )}

          {/* Send Method Selection */}
          {!billSent && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Send Bill Via:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSendMethod('app')}
                  className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    sendMethod === 'app'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                  }`}
                >
                  <span className="text-lg">🔔</span>
                  <span>App Notification</span>
                </button>
                <button
                  onClick={() => setSendMethod('email')}
                  className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    sendMethod === 'email'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                  }`}
                >
                  <span className="text-lg">📧</span>
                  <span>Email</span>
                </button>
              </div>

              {sendMethod === 'email' && (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              )}

              {sendMethod === 'app' && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-teal-800 font-medium">
                        Instant notification to guest dashboard
                      </p>
                      <p className="text-xs text-teal-700 mt-1">
                        Guest will receive the bill notification in their dashboard immediately. No email or phone number required.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              <Printer className="w-5 h-5" />
              Print Bill
            </button>

            <button
              onClick={handleSendBill}
              disabled={sending || billSent}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : billSent ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Bill Sent
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Bill
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

BillPreviewModal.propTypes = {
  order: PropTypes.object.isRequired,
  hotel: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSendBill: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
};

export default BillPreviewModal;
