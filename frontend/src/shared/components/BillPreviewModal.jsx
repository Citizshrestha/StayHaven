/**
 * Professional Bill Preview Modal
 * Industry-standard invoice design with print and send functionality
 * Used across Waiter, Receptionist, and Admin dashboards
 *
 * VAT / service charge come from the hotel's restaurant billing settings
 * (GET /api/v1/staff/dining/settings), never a hard-coded rate. Everything that
 * reaches the print window is HTML-escaped.
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Send, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import apiClient from '../../core/api/client';
import useModalA11y from '../hooks/useModalA11y';
import { esc, money, openPrintWindow } from './dining/diningFormat';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-NP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const resolveHotelId = (order, hotel) => {
  const fromOrder = order?.hotel?._id || (typeof order?.hotel === 'string' ? order.hotel : null) || order?.hotelId;
  if (fromOrder) return String(fromOrder);
  if (hotel?._id) return String(hotel._id);
  try {
    return JSON.parse(sessionStorage.getItem('activeProperty') || 'null')?._id || null;
  } catch {
    return null;
  }
};

// Same formula as backend/services/diningBilling.js computeTotals (no discount).
const computeBill = (items, charges) => {
  const subtotal = round2(items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0));
  if (!charges) return { subtotal, serviceCharge: null, tax: null, total: null };
  const serviceCharge = round2((subtotal * (Number(charges.serviceChargeRate) || 0)) / 100);
  const taxBase = round2(subtotal + (charges.taxOnServiceCharge !== false ? serviceCharge : 0));
  const tax = round2((taxBase * (Number(charges.taxRate) || 0)) / 100);
  return { subtotal, serviceCharge, tax, total: round2(subtotal + serviceCharge + tax) };
};

const locationLabel = (order) => (order.orderType === 'takeaway'
  ? 'Takeaway'
  : order.orderType === 'roomService'
    ? `Room ${order.roomNumber ?? '—'}`
    : `Table ${order.tableNumber ?? '—'}`);

const BillPreviewModal = ({
  order,
  hotel,
  onClose,
  onSendBill,
  isOpen
}) => {
  const [sendMethod, setSendMethod] = useState('app');
  const [email, setEmail] = useState(order?.customerEmail || '');
  const [emailError, setEmailError] = useState('');
  const [sending, setSending] = useState(false);
  const [charges, setCharges] = useState(null);
  const [chargesState, setChargesState] = useState('loading'); // loading | ready | error
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();
  const emailId = useId();
  const emailErrorId = useId();

  const hotelId = resolveHotelId(order, hotel);
  const handleClose = useCallback(() => {
    if (!sending) onClose();
  }, [sending, onClose]);

  useModalA11y(dialogRef, { isOpen: Boolean(isOpen && order), onClose: handleClose, canClose: !sending, initialFocusRef: closeRef });

  const loadCharges = useCallback(async () => {
    if (!hotelId) {
      setChargesState('error');
      return;
    }
    setChargesState('loading');
    try {
      const { data } = await apiClient.get('/api/v1/staff/dining/settings', { params: { hotelId } });
      setCharges(data?.data || null);
      setChargesState(data?.data ? 'ready' : 'error');
    } catch {
      setChargesState('error');
    }
  }, [hotelId]);

  useEffect(() => {
    if (isOpen && order) loadCharges();
  }, [isOpen, order, loadCharges]);

  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order]);
  const bill = useMemo(() => computeBill(items, chargesState === 'ready' ? charges : null), [items, charges, chargesState]);

  if (!isOpen || !order) return null;

  const isPaid = order.paymentStatus === 'paid';
  const billSent = order.billSent;
  const hotelName = hotel?.name || order.hotel?.name || '';
  const hotelAddress = hotel?.location?.address || hotel?.address || '';
  const hotelPhone = hotel?.contact?.phone || hotel?.phone || '';
  const totalsReady = chargesState === 'ready';

  // Handle print (escaped HTML in a popup; reports a blocked popup instead of crashing)
  const handlePrint = () => {
    if (!totalsReady) {
      toast.error('Tax settings are still loading. Try again in a moment.');
      return;
    }
    const rows = items.map((item) => `<tr><td>${esc(item.quantity)} × ${esc(item.name)}<br><span class="muted">@ ${esc(money(item.price))}</span></td><td class="r">${esc(money((Number(item.price) || 0) * (Number(item.quantity) || 0)))}</td></tr>`).join('');
    const row = (label, value, cls = '') => `<tr class="${cls}"><td>${esc(label)}</td><td class="r">${esc(value)}</td></tr>`;
    const body = `
      <h1>${esc(hotelName || 'Restaurant')}</h1>
      ${hotelAddress ? `<div class="c muted">${esc(hotelAddress)}</div>` : ''}
      ${hotelPhone ? `<div class="c muted">Tel ${esc(hotelPhone)}</div>` : ''}
      <hr>
      <div class="c b">BILL #${esc(order.orderNumber)}</div>
      <div>${esc(locationLabel(order))} · ${esc(order.customerName || 'Guest')}</div>
      <div class="muted">${esc(formatDate(order.createdAt))}</div>
      <hr>
      <table>${rows}</table>
      <hr>
      <table>
        ${row('Subtotal', money(bill.subtotal))}
        ${bill.serviceCharge ? row(`Service charge (${charges.serviceChargeRate}%)`, money(bill.serviceCharge)) : ''}
        ${row(`VAT (${charges.taxRate}%)`, money(bill.tax))}
        ${row('TOTAL', money(bill.total), 'b big')}
      </table>
      ${isPaid ? `<hr><div class="c b">PAID ${esc(formatDate(order.paidAt))}</div>` : ''}
      <hr>
      <div class="c">Thank you for your visit!</div>
    `;
    if (!openPrintWindow(`Bill #${order.orderNumber}`, body)) {
      toast.error('Allow pop-ups for this site to print the bill.');
    }
  };

  // Handle send bill
  const handleSendBill = async () => {
    if (sending) return;
    if (sendMethod === 'email') {
      const value = email.trim();
      if (!EMAIL_PATTERN.test(value) || value.length > 254) {
        setEmailError('Enter a valid email address, for example name@example.com.');
        return;
      }
    }
    setEmailError('');

    const orderId = order._id || order.id;
    if (!orderId) {
      toast.error('This order has not been saved yet, so its bill cannot be sent.');
      return;
    }

    try {
      setSending(true);
      await onSendBill(orderId, {
        method: sendMethod,
        email: sendMethod === 'email' ? email.trim() : undefined,
      });

      const methodLabel = sendMethod === 'app' ? 'app notification' : 'email';
      toast.success(`Bill sent via ${methodLabel}. The guest can now pay.`);
      setSending(false);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send bill');
      setSending(false);
    }
  };

  const methodButton = (value, label, icon) => (
    <button
      type="button"
      onClick={() => setSendMethod(value)}
      aria-pressed={sendMethod === value}
      disabled={sending}
      className={`min-h-[44px] px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
        sendMethod === value
          ? 'bg-teal-600 text-white shadow-md'
          : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-800 dark:hover:bg-teal-900/50'
      }`}
    >
      <span className="text-lg" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );

  const amount = (value) => (value == null ? '…' : money(value));

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={sending || undefined}
        tabIndex={-1}
        className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[calc(100vh-32px)] max-h-[calc(100dvh-32px)] focus:outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between">
          <h2 id={titleId} className="text-xl sm:text-2xl font-bold">Bill Preview</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            disabled={sending}
            aria-label="Close bill preview"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
          >
            <X className="w-6 h-6 text-slate-600 dark:text-slate-300" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body: bill + send options */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-8">
            <div className="max-w-md mx-auto">
              {/* Header */}
              <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-slate-300 dark:border-slate-600">
                <div className="text-2xl font-bold mb-2 break-words">{hotelName || 'Restaurant'}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {hotelAddress && <div className="break-words">{hotelAddress}</div>}
                  {hotelPhone && <div>Tel: {hotelPhone}</div>}
                </div>
              </div>

              {/* Bill Details */}
              <dl className="text-sm space-y-2 mb-6">
                {[
                  ['Bill No:', `#${order.orderNumber ?? '—'}`],
                  ['Date:', formatDate(order.createdAt)],
                  ['Location:', locationLabel(order)],
                  ['Customer:', order.customerName || 'Guest'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-slate-600 dark:text-slate-400">{label}</dt>
                    <dd className="font-semibold text-right break-words min-w-0">{value}</dd>
                  </div>
                ))}
              </dl>

              {/* Items Table */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-slate-900 dark:border-slate-300">
                    <th scope="col" className="text-left py-2">ITEM</th>
                    <th scope="col" className="text-center py-2">QTY</th>
                    <th scope="col" className="text-right py-2 hidden sm:table-cell">PRICE</th>
                    <th scope="col" className="text-right py-2">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item._id || item.id || index} className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-2 pr-2 break-words">{item.name}</td>
                      <td className="text-center py-2 tabular-nums">{item.quantity}</td>
                      <td className="text-right py-2 tabular-nums hidden sm:table-cell whitespace-nowrap">{money(item.price)}</td>
                      <td className="text-right py-2 font-semibold tabular-nums whitespace-nowrap">
                        {money((Number(item.price) || 0) * (Number(item.quantity) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-2 text-sm tabular-nums" aria-live="polite">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                  <span className="font-semibold">{money(bill.subtotal)}</span>
                </div>
                {bill.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Service charge ({charges.serviceChargeRate}%):</span>
                    <span className="font-semibold">{money(bill.serviceCharge)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    VAT{totalsReady ? ` (${charges.taxRate}%)` : ''}:
                  </span>
                  <span className="font-semibold">{amount(bill.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t-2 border-slate-900 dark:border-slate-300 pt-3 mt-3">
                  <span>GRAND TOTAL:</span>
                  <span>{amount(bill.total)}</span>
                </div>
                {chargesState === 'loading' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400" role="status">Loading the hotel&apos;s tax settings…</p>
                )}
                {chargesState === 'error' && (
                  <div className="flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300" role="alert">
                    <span>Couldn&apos;t load the hotel&apos;s tax settings, so VAT isn&apos;t shown.</span>
                    <button type="button" onClick={loadCharges} className="min-h-[36px] px-2 inline-flex items-center gap-1 font-semibold underline">
                      <RefreshCw className="w-3 h-3" aria-hidden="true" /> Retry
                    </button>
                  </div>
                )}
              </div>

              {isPaid && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/40 border-2 border-green-500 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 font-semibold">
                    <CheckCircle className="w-5 h-5" aria-hidden="true" />
                    <span>PAID</span>
                  </div>
                  <div className="text-center text-sm text-green-700 dark:text-green-300 mt-1">{formatDate(order.paidAt)}</div>
                </div>
              )}

              <div className="text-center mt-6 pt-4 border-t-2 border-dashed border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400">
                <div className="mb-2">Thank you for your visit!</div>
                <div>Please visit again</div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-4 space-y-4">
            {billSent && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-300 shrink-0" aria-hidden="true" />
                <span className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  Bill sent on {formatDate(order.billSentAt)}{order.billSentTo?.method ? ` via ${order.billSentTo.method}` : ''}
                </span>
              </div>
            )}

            <div className={`flex items-center gap-2 p-3 rounded-lg border ${isPaid
              ? 'bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-800'
              : 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'}`}
            >
              {isPaid
                ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300 shrink-0" aria-hidden="true" />
                : <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-300 shrink-0" aria-hidden="true" />}
              <span className={`text-sm font-medium ${isPaid ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
                {isPaid ? `Payment received on ${formatDate(order.paidAt)}` : 'Payment pending - Guest will pay after receiving the bill'}
              </span>
            </div>

            {!billSent && (
              <fieldset className="space-y-3" disabled={sending}>
                <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Send Bill Via:</legend>
                <div className="grid grid-cols-2 gap-3">
                  {methodButton('app', 'App Notification', '🔔')}
                  {methodButton('email', 'Email', '📧')}
                </div>

                {sendMethod === 'email' && (
                  <div>
                    <label htmlFor={emailId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Guest email address
                    </label>
                    <input
                      id={emailId}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={254}
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                      placeholder="name@example.com"
                      aria-invalid={emailError ? 'true' : 'false'}
                      aria-describedby={emailError ? emailErrorId : undefined}
                      className="w-full min-h-[44px] px-4 py-2 text-base bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    {emailError && <p id={emailErrorId} className="mt-1 text-sm text-red-700 dark:text-red-300">{emailError}</p>}
                  </div>
                )}

                {sendMethod === 'app' && (
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-teal-600 dark:text-teal-300 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm text-teal-800 dark:text-teal-200 font-medium">Instant notification to guest dashboard</p>
                        <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
                          Guest will receive the bill notification in their dashboard immediately. No email or phone number required.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </fieldset>
            )}
          </div>
        </div>

        {/* Sticky actions */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:pb-3 flex gap-3">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!totalsReady}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <Printer className="w-5 h-5" aria-hidden="true" />
            Print Bill
          </button>

          <button
            type="button"
            onClick={handleSendBill}
            disabled={sending || billSent}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                Sending...
              </>
            ) : billSent ? (
              <>
                <CheckCircle className="w-5 h-5" aria-hidden="true" />
                Bill Sent
              </>
            ) : (
              <>
                <Send className="w-5 h-5" aria-hidden="true" />
                Send Bill
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
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
