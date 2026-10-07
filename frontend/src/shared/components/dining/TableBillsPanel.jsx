/**
 * TableBillsPanel — restaurant cashier screen for waiters, reception and
 * managers. One place to see every open table/takeaway tab, take payment
 * (cash with change, card, wallet, bank, split), print the bill/receipt,
 * move a party, apply a discount, void a mistaken tab and run the day report.
 *
 * All amounts come from the server (/api/v1/staff/dining); this screen never
 * computes a bill itself.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import {
  Receipt, Printer, CreditCard, Percent, ArrowRightLeft, Ban, RefreshCw, X, Settings, BarChart3,
  UtensilsCrossed, ShoppingBag, BellRing, ChefHat, CheckCircle2, Search,
} from "lucide-react";
import { useSocket } from "../../../core/context/SocketContext";
import { getActiveProperty, getStaffProfile, getStaffRole } from "../../../core/api/services/staff.service";
import {
  applyDiningDiscount, closeDiningSession, getDiningReport, getDiningSession, getDiningSessions,
  getDiningSettings, getHotelTables, newIdempotencyKey, printDiningBill, recordDiningPayment,
  refundDiningPayment, removeDiningDiscount, saveDiningSettings, transferDiningSession, voidDiningSession,
} from "../../../core/api/services/dining.service";
import {
  METHOD_LABELS, REFERENCE_METHODS, dateTime, errorText, money, printBill, printReport, tabTitle, timeAgo,
} from "./diningFormat";
import "./TableBills.css";

const SUPERVISORS = ["manager", "owner"];
const REPORTERS = ["receptionist", "manager", "owner"];
const ORDER_STATUS_LABEL = {
  pending: "New", confirmed: "Confirmed", preparing: "Cooking", ready: "Ready", delivered: "Served", cancelled: "Cancelled",
};

const resolveHotelId = async () => {
  const cached = getActiveProperty();
  if (cached?._id) return cached._id;
  try {
    const profile = await getStaffProfile();
    const property = profile?.user?.assignedProperties?.[0];
    if (property?._id) {
      sessionStorage.setItem("activeProperty", JSON.stringify(property));
      return property._id;
    }
  } catch {
    /* surfaced below */
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────
// Accessible modal: Esc closes, focus moves in and is restored on close.
// ─────────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, busy = false }) => {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const first = ref.current?.querySelector("input, select, textarea, button:not([data-close])");
    (first || ref.current)?.focus();
    return () => { if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  const onKeyDown = (e) => {
    if (e.key === "Escape" && !busy) { e.stopPropagation(); onClose(); }
    if (e.key !== "Tab") return;
    const nodes = ref.current?.querySelectorAll("button:not([disabled]), input:not([disabled]), select, textarea");
    if (!nodes?.length) return;
    const firstNode = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === firstNode) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); firstNode.focus(); }
  };
  return (
    <div className="tb tb-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }} onKeyDown={onKeyDown}>
      <div className="tb-modal" role="dialog" aria-modal="true" aria-labelledby="tb-modal-title" ref={ref} tabIndex={-1}>
        <div className="tb-modal-head">
          <h2 id="tb-modal-title">{title}</h2>
          <button type="button" className="tb-btn" data-close onClick={onClose} disabled={busy} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="tb-modal-body">{children}</div>
      </div>
    </div>
  );
};
Modal.propTypes = { title: PropTypes.node.isRequired, onClose: PropTypes.func.isRequired, children: PropTypes.node, busy: PropTypes.bool };

// ─────────────────────────────────────────────────────────────────────────
// Take payment
// ─────────────────────────────────────────────────────────────────────────
const PaymentDialog = ({ session, onClose, onPaid }) => {
  const balance = session.totals?.balance || 0;
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const keyRef = useRef(newIdempotencyKey("pay"));

  const amt = Number(amount);
  const handed = tendered === "" ? amt : Number(tendered);
  const change = method === "cash" && Number.isFinite(handed) && handed >= amt ? handed - amt : 0;
  const needsRef = REFERENCE_METHODS.includes(method);

  const validate = () => {
    if (!Number.isFinite(amt) || amt <= 0) return "Enter an amount greater than zero";
    if (amt > balance + 0.001) return `The balance due is ${money(balance)}`;
    if (method === "cash" && (!Number.isFinite(handed) || handed < amt)) return "Cash received is less than the amount";
    if (needsRef && reference.trim().length < 4) return "Enter the transaction ID from the customer's payment confirmation";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError("");
    try {
      const res = await recordDiningPayment(session._id, {
        method,
        amount: Math.round(amt * 100) / 100,
        tendered: method === "cash" ? Math.round(handed * 100) / 100 : undefined,
        reference: reference.trim() || undefined,
        idempotencyKey: keyRef.current,
      });
      keyRef.current = newIdempotencyKey("pay");
      const p = res.data.payment;
      toast.success(p.change ? `${money(p.amount)} received · give ${money(p.change)} change` : `${money(p.amount)} received`);
      onPaid(res.data);
    } catch (err) {
      setError(errorText(err, "Payment could not be recorded"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Take payment · ${tabTitle(session)}`} onClose={onClose} busy={busy}>
      <form className="tb-form" onSubmit={submit} noValidate>
        <div className="tb-alert info">Balance due <strong>{money(balance)}</strong></div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="tb-field" style={{ padding: 0 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Method</span></legend>
          <div className="tb-methods">
            {Object.entries(METHOD_LABELS).map(([id, label]) => (
              <button key={id} type="button" className="tb-chip" aria-pressed={method === id} onClick={() => { setMethod(id); setError(""); }}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="tb-field">
          <label htmlFor="tb-amount">Amount (split the bill by entering less than the balance)</label>
          <input id="tb-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-describedby="tb-pay-error" />
        </div>
        {method === "cash" && (
          <div className="tb-field">
            <label htmlFor="tb-tendered">Cash received</label>
            <input id="tb-tendered" inputMode="decimal" value={tendered} placeholder={Number.isFinite(amt) ? amt.toFixed(2) : ""} onChange={(e) => setTendered(e.target.value)} />
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>Change to return: <span className="tb-change">{money(change)}</span></p>
          </div>
        )}
        {(needsRef || method === "card" || method === "upi") && (
          <div className="tb-field">
            <label htmlFor="tb-ref">{needsRef ? "Transaction ID (required)" : "Reference (optional)"}</label>
            <input id="tb-ref" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} autoComplete="off" />
          </div>
        )}
        {error && <div id="tb-pay-error" className="tb-alert error" role="alert">{error}</div>}
        <button type="submit" className="tb-btn primary block" disabled={busy}>
          <CreditCard size={16} aria-hidden="true" /> {busy ? "Recording…" : `Record ${Number.isFinite(amt) ? money(amt) : "payment"}`}
        </button>
      </form>
    </Modal>
  );
};
PaymentDialog.propTypes = { session: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired, onPaid: PropTypes.func.isRequired };

// ─────────────────────────────────────────────────────────────────────────
// Discount / void / transfer / settings dialogs
// ─────────────────────────────────────────────────────────────────────────
const DiscountDialog = ({ session, onClose, onDone }) => {
  const [kind, setKind] = useState("percent");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await applyDiningDiscount(session._id, { kind, value: Number(value), reason: reason.trim() });
      toast.success("Discount applied");
      onDone(res.data);
    } catch (err) {
      setError(errorText(err, "Discount could not be applied"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Apply discount" onClose={onClose} busy={busy}>
      <form className="tb-form" onSubmit={submit} noValidate>
        <div className="tb-tabs" role="group" aria-label="Discount type">
          <button type="button" className="tb-chip" aria-pressed={kind === "percent"} onClick={() => setKind("percent")}>Percent</button>
          <button type="button" className="tb-chip" aria-pressed={kind === "amount"} onClick={() => setKind("amount")}>Fixed amount</button>
        </div>
        <div className="tb-field">
          <label htmlFor="tb-disc">{kind === "percent" ? "Discount %" : "Discount (Rs)"}</label>
          <input id="tb-disc" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="tb-field">
          <label htmlFor="tb-disc-reason">Reason (kept in the audit log)</label>
          <input id="tb-disc-reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error && <div className="tb-alert error" role="alert">{error}</div>}
        <button type="submit" className="tb-btn primary block" disabled={busy}>{busy ? "Applying…" : "Apply discount"}</button>
      </form>
    </Modal>
  );
};
DiscountDialog.propTypes = { session: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired, onDone: PropTypes.func.isRequired };

const refundedFor = (session, paymentId) =>
  (session.refunds || []).filter((r) => String(r.payment) === String(paymentId)).reduce((s, r) => s + r.amount, 0);

const RefundDialog = ({ session, payment, onClose, onDone }) => {
  const refundable = Math.round((payment.amount - refundedFor(session, payment._id)) * 100) / 100;
  const [amount, setAmount] = useState(refundable.toFixed(2));
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const keyRef = useRef(newIdempotencyKey("rf"));
  const closed = session.status === "closed";

  const submit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setError("Enter an amount greater than zero"); return; }
    if (amt > refundable + 0.001) { setError(`At most ${money(refundable)} can be refunded on this payment`); return; }
    if (reason.trim().length < 3) { setError("Give a reason for the refund"); return; }
    setBusy(true);
    setError("");
    try {
      const res = await refundDiningPayment(session._id, {
        paymentId: payment._id,
        amount: Math.round(amt * 100) / 100,
        reason: reason.trim(),
        reference: reference.trim() || undefined,
        idempotencyKey: keyRef.current,
      });
      keyRef.current = newIdempotencyKey("rf");
      toast.success(`${money(res.data.refund.amount)} refunded by ${METHOD_LABELS[payment.method] || payment.method}`);
      onDone(res.data);
    } catch (err) {
      setError(errorText(err, "Refund could not be recorded"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Refund payment" onClose={onClose} busy={busy}>
      <form className="tb-form" onSubmit={submit} noValidate>
        <div className="tb-alert info">
          {METHOD_LABELS[payment.method] || payment.method} payment of {money(payment.amount)} · up to <strong>{money(refundable)}</strong> refundable
        </div>
        <p className="tb-note" style={{ margin: 0 }}>
          {closed
            ? "This tab is already settled. The receipt stays as issued; the refund is recorded separately and shows in today's report."
            : "The balance on this tab goes back up by the refunded amount, so you can then cancel or change orders."}
          {payment.method !== "cash" && " Return the money through the card terminal or wallet merchant portal first, then record it here."}
        </p>
        <div className="tb-field">
          <label htmlFor="tb-rf-amount">Amount to refund</label>
          <input id="tb-rf-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="tb-field">
          <label htmlFor="tb-rf-reason">Reason (kept in the audit log)</label>
          <input id="tb-rf-reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
        </div>
        {payment.method !== "cash" && (
          <div className="tb-field">
            <label htmlFor="tb-rf-ref">Refund reference (optional)</label>
            <input id="tb-rf-ref" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} autoComplete="off" />
          </div>
        )}
        {error && <div className="tb-alert error" role="alert">{error}</div>}
        <button type="submit" className="tb-btn danger block" disabled={busy}>{busy ? "Recording…" : "Record refund"}</button>
      </form>
    </Modal>
  );
};
RefundDialog.propTypes = {
  session: PropTypes.object.isRequired,
  payment: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

const VoidDialog = ({ session, onClose, onDone }) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await voidDiningSession(session._id, reason.trim());
      toast.success("Tab voided");
      onDone(res.data);
    } catch (err) {
      setError(errorText(err, "Tab could not be voided"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Void tab" onClose={onClose} busy={busy}>
      <form className="tb-form" onSubmit={submit} noValidate>
        <p style={{ margin: 0, fontSize: 14 }}>Use this only for a tab opened by mistake or a party that left before anything was served. Cancel its orders first, and refund any money taken.</p>
        <div className="tb-field">
          <label htmlFor="tb-void-reason">Reason</label>
          <textarea id="tb-void-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error && <div className="tb-alert error" role="alert">{error}</div>}
        <button type="submit" className="tb-btn danger block" disabled={busy}>{busy ? "Voiding…" : "Void tab"}</button>
      </form>
    </Modal>
  );
};
VoidDialog.propTypes = { session: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired, onDone: PropTypes.func.isRequired };

const TransferDialog = ({ session, hotelId, onClose, onDone }) => {
  const [tables, setTables] = useState(null);
  const [tableId, setTableId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    getHotelTables(hotelId)
      .then((res) => setTables((res.data || []).filter((t) => String(t._id) !== String(session.table) && t.status !== "maintenance")))
      .catch((err) => setError(errorText(err, "Tables could not be loaded")));
  }, [hotelId, session.table]);
  const submit = async (e) => {
    e.preventDefault();
    if (!tableId) { setError("Choose a table"); return; }
    setBusy(true);
    setError("");
    try {
      const res = await transferDiningSession(session._id, tableId);
      toast.success(`Moved to Table ${res.data.session.tableNumber}`);
      onDone(res.data);
    } catch (err) {
      setError(errorText(err, "The tab could not be moved"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Move ${tabTitle(session)}`} onClose={onClose} busy={busy}>
      <form className="tb-form" onSubmit={submit} noValidate>
        <div className="tb-field">
          <label htmlFor="tb-move">New table</label>
          <select id="tb-move" value={tableId} onChange={(e) => setTableId(e.target.value)} disabled={!tables}>
            <option value="">{tables ? "Choose a table" : "Loading…"}</option>
            {(tables || []).map((t) => (
              <option key={t._id} value={t._id} disabled={t.status === "occupied"}>
                Table {t.tableNumber}{t.tableName && t.tableName !== `Table ${t.tableNumber}` ? ` · ${t.tableName}` : ""}{t.status === "occupied" ? " (occupied)" : ""}
              </option>
            ))}
          </select>
        </div>
        {error && <div className="tb-alert error" role="alert">{error}</div>}
        <button type="submit" className="tb-btn primary block" disabled={busy}>{busy ? "Moving…" : "Move tab"}</button>
      </form>
    </Modal>
  );
};
TransferDialog.propTypes = { session: PropTypes.object.isRequired, hotelId: PropTypes.string.isRequired, onClose: PropTypes.func.isRequired, onDone: PropTypes.func.isRequired };

const SettingsDialog = ({ hotelId, onClose }) => {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    getDiningSettings(hotelId)
      .then((res) => setForm({ taxRate: String(res.data.taxRate), serviceChargeRate: String(res.data.serviceChargeRate), taxOnServiceCharge: res.data.taxOnServiceCharge }))
      .catch((err) => setError(errorText(err, "Settings could not be loaded")));
  }, [hotelId]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await saveDiningSettings({
        hotelId, taxRate: Number(form.taxRate), serviceChargeRate: Number(form.serviceChargeRate), taxOnServiceCharge: form.taxOnServiceCharge,
      });
      toast.success(res.message || "Settings saved");
      onClose();
    } catch (err) {
      setError(errorText(err, "Settings could not be saved"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Restaurant billing settings" onClose={onClose} busy={busy}>
      {!form ? (
        error ? <div className="tb-alert error" role="alert">{error}</div> : <p role="status">Loading…</p>
      ) : (
        <form className="tb-form" onSubmit={submit} noValidate>
          <div className="tb-field">
            <label htmlFor="tb-vat">VAT %</label>
            <input id="tb-vat" inputMode="decimal" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
          </div>
          <div className="tb-field">
            <label htmlFor="tb-sc">Service charge %</label>
            <input id="tb-sc" inputMode="decimal" value={form.serviceChargeRate} onChange={(e) => setForm({ ...form, serviceChargeRate: e.target.value })} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, minHeight: 44 }}>
            <input type="checkbox" checked={form.taxOnServiceCharge} onChange={(e) => setForm({ ...form, taxOnServiceCharge: e.target.checked })} style={{ width: 20, height: 20 }} />
            Charge VAT on the service charge
          </label>
          <p className="tb-note" style={{ margin: 0 }}>Menu prices are VAT-exclusive. New rates apply to tabs opened after you save; open tabs keep the rates they started with.</p>
          {error && <div className="tb-alert error" role="alert">{error}</div>}
          <button type="submit" className="tb-btn primary block" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
        </form>
      )}
    </Modal>
  );
};
SettingsDialog.propTypes = { hotelId: PropTypes.string.isRequired, onClose: PropTypes.func.isRequired };

// ─────────────────────────────────────────────────────────────────────────
// Tab detail
// ─────────────────────────────────────────────────────────────────────────
const SessionDetail = ({ detail, role, hotelId, onChange, onClosed }) => {
  const { session, orders } = detail;
  const [dialog, setDialog] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const t = session.totals || {};
  const open = session.status === "open";
  const supervisor = SUPERVISORS.includes(role);
  const refunds = session.refunds || [];
  const kept = (t.paid || 0) - (t.refunded || 0);

  const act = async (fn, success) => {
    setBusy(true);
    try {
      const res = await fn();
      if (success) toast.success(success);
      onChange(res.data);
      return res.data;
    } catch (err) {
      toast.error(errorText(err));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const doPrint = async () => {
    const data = await act(() => printDiningBill(session._id));
    if (data && !printBill(data)) toast.error("Allow pop-ups for this site to print the bill");
  };

  const doClose = async () => {
    const data = await act(() => closeDiningSession(session._id), "Tab closed");
    if (data?.session?.status === "closed") onClosed(data);
  };

  const afterDialog = (data) => {
    setDialog(null);
    onChange(data);
    if (data?.session?.status && data.session.status !== "open") onClosed(data);
  };

  return (
    <div className="tb-card" aria-live="polite">
      <div className="tb-detail-head">
        <div>
          <h2>{tabTitle(session)}</h2>
          <div className="tb-item-sub" style={{ marginTop: 4 }}>
            {session.type === "dineIn" && session.customerName && <span>{session.customerName}</span>}
            {session.customerPhone && <span>{session.customerPhone}</span>}
            <span>Opened {dateTime(session.openedAt)} by {session.openedByName || "—"}</span>
            {session.status === "closed" && <span className="tb-badge ok">Receipt #{session.receiptNumber}</span>}
            {session.status === "void" && <span className="tb-badge danger">Void — {session.voidReason}</span>}
            {open && session.billRequestedAt && <span className="tb-badge warn"><BellRing size={12} aria-hidden="true" /> Bill requested</span>}
          </div>
        </div>
        <button type="button" className="tb-btn" onClick={doPrint} disabled={busy || t.orderCount === 0}>
          <Printer size={16} aria-hidden="true" /> {session.status === "closed" ? "Reprint receipt" : "Print bill"}
        </button>
      </div>

      <div className="tb-section">
        <h3>Orders ({orders.length})</h3>
        {orders.length === 0 && <p className="tb-note">No orders yet.</p>}
        {orders.map((o) => (
          <div key={o._id} className="tb-order">
            <div className="tb-order-head">
              <span>#{o.orderNumber} · {o.isGuestOrder ? "QR" : o.orderByName || "Staff"}</span>
              <span className={`tb-badge ${o.status === "cancelled" ? "danger" : ["ready", "delivered"].includes(o.status) ? "ok" : "warn"}`}>
                {ORDER_STATUS_LABEL[o.status] || o.status}
              </span>
            </div>
            {(o.items || []).map((i, idx) => (
              <div key={`${o._id}-${idx}`} className={`tb-line${o.status === "cancelled" ? " cancelled" : ""}`}>
                <span>{i.quantity} × {i.name}{i.notes ? <span className="tb-note"> — {i.notes}</span> : null}</span>
                <span>{money(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="tb-section">
        <h3>Bill</h3>
        <div className="tb-totals">
          <span>Subtotal</span><span>{money(t.subtotal)}</span>
          {t.discount > 0 && (<>
            <span>Discount{session.discount?.kind === "percent" ? ` (${session.discount.value}%)` : ""}{session.discount?.reason ? ` · ${session.discount.reason}` : ""}</span>
            <span>− {money(t.discount)}</span>
          </>)}
          {t.serviceCharge > 0 && (<><span>Service charge ({session.charges?.serviceChargeRate}%)</span><span>{money(t.serviceCharge)}</span></>)}
          <span>VAT ({session.charges?.taxRate ?? 0}%)</span><span>{money(t.tax)}</span>
          <span className="grand">Total</span><span className="grand">{money(t.total)}</span>
          {t.paid > 0 && (<><span>Paid</span><span>{money(t.paid)}</span></>)}
          {t.refunded > 0 && (<><span>Refunded{session.status === "closed" ? " after settlement" : ""}</span><span>− {money(t.refunded)}</span></>)}
          {session.status !== "void" && (t.balance > 0
            ? (<><span className="due">Balance due</span><span className="due">{money(t.balance)}</span></>)
            : t.total > 0 && (<><span className="settled">Settled</span><span className="settled">{money(0)}</span></>))}
        </div>
        {(session.payments || []).length > 0 && (
          <table className="tb-table" style={{ marginTop: 12 }}>
            <caption className="tb-sr">Payments</caption>
            <thead><tr><th>Payment</th><th>By</th><th className="r">Amount</th></tr></thead>
            <tbody>
              {session.payments.map((p) => {
                const back = refundedFor(session, p._id);
                const canRefund = supervisor && session.status !== "void" && p.amount - back > 0.004;
                return (
                  <tr key={p._id}>
                    <td>
                      {METHOD_LABELS[p.method] || p.method}{p.reference ? ` · ${p.reference}` : ""}
                      {p.change ? <div className="tb-note">Received {money(p.tendered)} · change {money(p.change)}</div> : null}
                      {back > 0 && <div className="tb-note">Refunded {money(back)}</div>}
                    </td>
                    <td>{p.receivedByName}<div className="tb-note">{dateTime(p.receivedAt)}</div></td>
                    <td className="r">
                      {money(p.amount)}
                      {canRefund && (
                        <div>
                          <button type="button" className="tb-btn danger" style={{ minHeight: 36, padding: "0 10px", marginTop: 4 }}
                            disabled={busy} onClick={() => setRefundTarget(p)} aria-label={`Refund ${METHOD_LABELS[p.method] || p.method} payment of ${money(p.amount)}`}>
                            Refund
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {refunds.length > 0 && (
          <table className="tb-table" style={{ marginTop: 12 }}>
            <caption className="tb-sr">Refunds</caption>
            <thead><tr><th>Refund</th><th>By</th><th className="r">Amount</th></tr></thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r._id}>
                  <td>{METHOD_LABELS[r.method] || r.method} · {r.reason}{r.reference ? <div className="tb-note">Ref {r.reference}</div> : null}</td>
                  <td>{r.refundedByName}<div className="tb-note">{dateTime(r.refundedAt)}</div></td>
                  <td className="r">− {money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div className="tb-section">
          {t.openKitchenOrders > 0 && (
            <div className="tb-alert warn" style={{ marginBottom: 10 }}>
              <ChefHat size={14} aria-hidden="true" /> {t.openKitchenOrders} order{t.openKitchenOrders === 1 ? " is" : "s are"} still with the kitchen — the tab closes once {t.openKitchenOrders === 1 ? "it is" : "they are"} ready.
            </div>
          )}
          <div className="tb-actions">
            <button type="button" className="tb-btn primary" disabled={busy || !(t.balance > 0)} onClick={() => setDialog("pay")}>
              <CreditCard size={16} aria-hidden="true" /> Take payment
            </button>
            <button type="button" className="tb-btn" disabled={busy || t.balance !== 0 || !(t.total > 0) || t.openKitchenOrders > 0} onClick={doClose}>
              <CheckCircle2 size={16} aria-hidden="true" /> Close tab
            </button>
            {session.type === "dineIn" && (
              <button type="button" className="tb-btn" disabled={busy} onClick={() => setDialog("move")}>
                <ArrowRightLeft size={16} aria-hidden="true" /> Move table
              </button>
            )}
            {supervisor && (session.discount?.kind ? (
              <button type="button" className="tb-btn" disabled={busy} onClick={() => act(() => removeDiningDiscount(session._id), "Discount removed")}>
                <Percent size={16} aria-hidden="true" /> Remove discount
              </button>
            ) : (
              <button type="button" className="tb-btn" disabled={busy || !(t.subtotal > 0)} onClick={() => setDialog("discount")}>
                <Percent size={16} aria-hidden="true" /> Discount
              </button>
            ))}
            {supervisor && (
              <button type="button" className="tb-btn danger" disabled={busy || kept > 0.004} onClick={() => setDialog("void")}
                title={kept > 0.004 ? "Refund the money taken before voiding" : undefined}>
                <Ban size={16} aria-hidden="true" /> Void
              </button>
            )}
          </div>
        </div>
      )}

      {dialog === "pay" && <PaymentDialog session={session} onClose={() => setDialog(null)} onPaid={afterDialog} />}
      {dialog === "discount" && <DiscountDialog session={session} onClose={() => setDialog(null)} onDone={afterDialog} />}
      {dialog === "void" && <VoidDialog session={session} onClose={() => setDialog(null)} onDone={afterDialog} />}
      {dialog === "move" && <TransferDialog session={session} hotelId={hotelId} onClose={() => setDialog(null)} onDone={afterDialog} />}
      {refundTarget && (
        <RefundDialog
          session={session}
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onDone={(data) => { setRefundTarget(null); onChange(data); }}
        />
      )}
    </div>
  );
};
SessionDetail.propTypes = {
  detail: PropTypes.shape({ session: PropTypes.object.isRequired, orders: PropTypes.array.isRequired }).isRequired,
  role: PropTypes.string,
  hotelId: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClosed: PropTypes.func.isRequired,
};

// ─────────────────────────────────────────────────────────────────────────
// Day report
// ─────────────────────────────────────────────────────────────────────────
const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const ReportView = ({ hotelId }) => {
  const [day, setDay] = useState(() => toInputDate(new Date()));
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [y, m, d] = day.split("-").map(Number);
    const from = new Date(y, m - 1, d, 0, 0, 0, 0);
    const to = new Date(y, m - 1, d, 23, 59, 59, 999);
    setLoading(true);
    setError("");
    try {
      const res = await getDiningReport({ hotelId, from: from.toISOString(), to: to.toISOString() });
      setReport(res.data);
    } catch (err) {
      setError(errorText(err, "Report could not be loaded"));
    } finally {
      setLoading(false);
    }
  }, [day, hotelId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="tb-card tb-pad" aria-busy={loading}>
      <div className="tb-head" style={{ marginBottom: 12 }}>
        <div className="tb-field" style={{ maxWidth: 220 }}>
          <label htmlFor="tb-day">Day</label>
          <input id="tb-day" type="date" value={day} max={toInputDate(new Date())} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="tb-actions">
          <button type="button" className="tb-btn" onClick={load} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
          <button type="button" className="tb-btn primary" disabled={!report}
            onClick={() => { if (!printReport({ report, hotelName: getActiveProperty()?.name })) toast.error("Allow pop-ups for this site to print"); }}>
            <Printer size={16} aria-hidden="true" /> Print report
          </button>
        </div>
      </div>
      {error && <div className="tb-alert error" role="alert">{error}</div>}
      {report && (
        <>
          <div className="tb-stats">
            <div className="tb-card tb-stat"><div className="v">{money(report.total)}</div><div className="l">Net sales ({report.tabs} tabs)</div></div>
            <div className="tb-card tb-stat"><div className="v">{money(report.tax)}</div><div className="l">VAT collected</div></div>
            <div className="tb-card tb-stat"><div className="v">{money(report.serviceCharge)}</div><div className="l">Service charge</div></div>
            <div className="tb-card tb-stat"><div className="v">{money(report.discount)}</div><div className="l">Discounts given</div></div>
            <div className="tb-card tb-stat"><div className="v">{money(report.netCollected)}</div><div className="l">Net collected{report.refunded ? ` · ${money(report.refunded)} refunded` : ""}</div></div>
            <div className="tb-card tb-stat"><div className="v">{report.open.count}</div><div className="l">Open now · {money(report.open.outstanding)} due</div></div>
          </div>
          <table className="tb-table" style={{ marginTop: 16 }}>
            <caption className="tb-sr">Payments by method</caption>
            <thead><tr><th>Method</th><th className="r">Received</th><th className="r">Refunded</th><th className="r">Net</th></tr></thead>
            <tbody>
              {report.payments.length === 0 && <tr><td colSpan={4} className="tb-note">No money taken or refunded on this day.</td></tr>}
              {report.payments.map((p) => (
                <tr key={p.method}>
                  <td>{METHOD_LABELS[p.method] || p.method} <span className="tb-note">({p.count})</span></td>
                  <td className="r">{money(p.amount)}</td>
                  <td className="r">{p.refunded ? `− ${money(p.refunded)}` : "—"}</td>
                  <td className="r"><strong>{money(p.net)}</strong></td>
                </tr>
              ))}
            </tbody>
            {report.payments.length > 0 && (
              <tfoot>
                <tr><th>Total</th><th className="r">{money(report.received)}</th><th className="r">{report.refunded ? `− ${money(report.refunded)}` : "—"}</th><th className="r">{money(report.netCollected)}</th></tr>
              </tfoot>
            )}
          </table>
          <p className="tb-note" style={{ marginTop: 10 }}>
            Sales come from tabs settled on this day (dine-in {report.dineIn} · takeaway {report.takeaway} · voided {report.voids}).
            Money columns count payments taken and refunds given on this day — the cash net is what should be in the drawer.
          </p>
        </>
      )}
    </div>
  );
};
ReportView.propTypes = { hotelId: PropTypes.string.isRequired };

// ─────────────────────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────────────────────
const TableBillsPanel = ({ title = "Bills" }) => {
  const role = getStaffRole();
  const { subscribe } = useSocket();
  const [hotelId, setHotelId] = useState(null);
  const [view, setView] = useState("open");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const detailRef = useRef(null);

  useEffect(() => { resolveHotelId().then((id) => { setHotelId(id); if (!id) { setError("No active property found"); setLoading(false); } }); }, []);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, []);

  const loadList = useCallback(async ({ silent = false } = {}) => {
    if (!hotelId || view === "report") return;
    if (!silent) setLoading(true);
    try {
      const res = await getDiningSessions({ hotelId, status: view === "open" ? "open" : "all" });
      const list = view === "open" ? res.data : res.data.filter((s) => s.status !== "open");
      setSessions(list);
      setError("");
    } catch (err) {
      setError(errorText(err, "Bills could not be loaded"));
    } finally {
      setLoading(false);
    }
  }, [hotelId, view]);

  const loadDetail = useCallback(async (id) => {
    if (!id) { setDetail(null); return; }
    try {
      const res = await getDiningSession(id);
      setDetail(res.data);
    } catch (err) {
      toast.error(errorText(err, "Tab could not be loaded"));
      setDetail(null);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadDetail(selectedId); }, [selectedId, loadDetail]);

  // Live: tabs change when orders arrive, the kitchen advances them, or
  // another cashier takes a payment.
  const selectedRef = useRef(selectedId);
  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);
  useEffect(() => {
    if (!subscribe) return undefined;
    let timer = null;
    const refresh = (payload) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        loadList({ silent: true });
        if (selectedRef.current && (!payload?.sessionId || payload.sessionId === selectedRef.current)) loadDetail(selectedRef.current);
      }, 300);
    };
    const unsubs = ["dining-session-updated", "new-order", "order-status-updated", "order-updated"].map((e) => subscribe(e, refresh));
    return () => { clearTimeout(timer); unsubs.forEach((u) => u?.()); };
  }, [subscribe, loadList, loadDetail]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) =>
      (typeFilter === "all" || s.type === typeFilter) &&
      (!q || tabTitle(s).toLowerCase().includes(q) || (s.customerName || "").toLowerCase().includes(q) || String(s.receiptNumber || "").includes(q)));
  }, [sessions, typeFilter, query]);

  const select = (id) => {
    setSelectedId(id);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const onChange = (data) => {
    if (data?.session) setDetail(data);
    loadList({ silent: true });
  };

  const onClosed = (data) => {
    const s = data.session;
    if (s.status === "closed") toast.success(`Receipt #${s.receiptNumber} · ${tabTitle(s)} is settled`);
  };

  const dueTotal = sessions.filter((s) => s.status === "open").reduce((sum, s) => sum + Math.max(0, s.totals?.balance || 0), 0);

  return (
    <div className="tb">
      <div className="tb-head">
        <div>
          <h1>{title}</h1>
          <p>{view === "open" ? `${sessions.length} open · ${money(dueTotal)} to collect` : view === "closed" ? "Settled and voided tabs today" : "End-of-day restaurant report"}</p>
        </div>
        <div className="tb-actions">
          <div className="tb-tabs" role="tablist" aria-label="Bills view">
            <button type="button" role="tab" className="tb-chip" aria-selected={view === "open"} onClick={() => { setView("open"); setSelectedId(null); }}>
              <Receipt size={14} aria-hidden="true" /> Open
            </button>
            <button type="button" role="tab" className="tb-chip" aria-selected={view === "closed"} onClick={() => { setView("closed"); setSelectedId(null); }}>
              Closed today
            </button>
            {REPORTERS.includes(role) && (
              <button type="button" role="tab" className="tb-chip" aria-selected={view === "report"} onClick={() => { setView("report"); setSelectedId(null); }}>
                <BarChart3 size={14} aria-hidden="true" /> Day report
              </button>
            )}
          </div>
          {SUPERVISORS.includes(role) && hotelId && (
            <button type="button" className="tb-btn" onClick={() => setShowSettings(true)} aria-label="Billing settings"><Settings size={16} aria-hidden="true" /></button>
          )}
          {view !== "report" && (
            <button type="button" className="tb-btn" onClick={() => loadList()} disabled={loading} aria-label="Refresh bills"><RefreshCw size={16} aria-hidden="true" /></button>
          )}
        </div>
      </div>

      {error && <div className="tb-alert error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

      {view === "report" && hotelId ? (
        <ReportView hotelId={hotelId} />
      ) : (
        <div className="tb-layout">
          <div>
            <div className="tb-actions" style={{ marginBottom: 10 }}>
              {[["all", "All"], ["dineIn", "Tables"], ["takeaway", "Takeaway"]].map(([v, label]) => (
                <button key={v} type="button" className="tb-chip" aria-pressed={typeFilter === v} onClick={() => setTypeFilter(v)}>{label}</button>
              ))}
            </div>
            <div className="tb-field" style={{ position: "relative", marginBottom: 10 }}>
              <label htmlFor="tb-search" className="tb-sr">Search bills</label>
              <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: 14, color: "var(--tb-muted)" }} />
              <input id="tb-search" type="search" placeholder="Table, name or receipt #" value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 36 }} />
            </div>
            {loading ? (
              <p className="tb-empty" role="status">Loading bills…</p>
            ) : visible.length === 0 ? (
              <div className="tb-card tb-empty">{view === "open" ? "No open bills right now." : "Nothing settled yet today."}</div>
            ) : (
              <ul className="tb-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {visible.map((s) => {
                  const t = s.totals || {};
                  return (
                    <li key={s._id}>
                      <button type="button" className="tb-item" aria-current={selectedId === s._id} onClick={() => select(s._id)}>
                        <span className="tb-item-title">
                          {s.type === "takeaway" ? <ShoppingBag size={14} aria-hidden="true" /> : <UtensilsCrossed size={14} aria-hidden="true" />} {tabTitle(s)}
                        </span>
                        <span className="tb-amount">{s.status === "open" ? money(t.balance) : money(t.total)}</span>
                        <span className="tb-item-sub">
                          {s.status === "open" ? (
                            <>
                              <span>{t.orderCount || 0} order{t.orderCount === 1 ? "" : "s"} · {timeAgo(s.openedAt, now)}</span>
                              {s.billRequestedAt && <span className="tb-badge warn"><BellRing size={11} aria-hidden="true" /> Bill requested</span>}
                              {t.openKitchenOrders > 0 && <span className="tb-badge muted"><ChefHat size={11} aria-hidden="true" /> {t.openKitchenOrders} cooking</span>}
                              {t.paid > 0 && <span className="tb-badge ok">Part paid</span>}
                            </>
                          ) : s.status === "closed" ? (
                            <span>Receipt #{s.receiptNumber} · {dateTime(s.closedAt)}</span>
                          ) : (
                            <span className="tb-badge danger">Void</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div ref={detailRef}>
            {detail && hotelId ? (
              <SessionDetail key={detail.session._id} detail={detail} role={role} hotelId={hotelId} onChange={onChange} onClosed={onClosed} />
            ) : (
              <div className="tb-card tb-empty">Select a bill to see its orders and take payment.</div>
            )}
          </div>
        </div>
      )}

      {showSettings && hotelId && <SettingsDialog hotelId={hotelId} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

TableBillsPanel.propTypes = { title: PropTypes.string };

export default TableBillsPanel;
