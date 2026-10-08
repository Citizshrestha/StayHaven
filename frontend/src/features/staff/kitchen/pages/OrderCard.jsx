import { memo, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Ban, Bell, CheckCircle2, ChefHat, Eye, Loader2, UtensilsCrossed, X } from "lucide-react";
import OrderDetailsModal from "../../waiter/pages/order/OrderDetailsModal";
import { formatElapsed, nowMs, overdueLevel, useTick } from "./kitchenClock";

// Status vocabulary follows the shared contract (rules G): pending = amber,
// confirmed = blue, preparing = purple, ready = green, served = teal,
// cancelled = red. Colour is always paired with a label and an icon.
const STATUS_META = {
  new: { key: "pending", label: "New", Icon: Bell },
  pending: { key: "pending", label: "New", Icon: Bell },
  confirmed: { key: "confirmed", label: "Accepted", Icon: CheckCircle2 },
  preparing: { key: "preparing", label: "Cooking", Icon: ChefHat },
  ready: { key: "ready", label: "Ready", Icon: CheckCircle2 },
  delivered: { key: "delivered", label: "Served", Icon: UtensilsCrossed },
  cancelled: { key: "cancelled", label: "Cancelled", Icon: Ban },
};

const TYPE_LABEL = { dineIn: "Dine-in", takeaway: "Takeaway", roomService: "Room service" };
const ALLERGY_PATTERN = /allerg|\bnuts?\b|peanut|gluten|dairy|lactose|shellfish|celiac|coeliac/i;

const toTime = (value) => {
  const t = value ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? null : t;
};

const formatClock = (ms) =>
  ms == null ? "" : new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Live mm:ss. Its own 1s subscription, so the ticket around it does not
// re-render every second.
const Elapsed = ({ since, className = "" }) => {
  useTick(1000);
  if (since == null) return null;
  return <span className={`kd-elapsed ${className}`}>{formatElapsed(nowMs() - since)}</span>;
};

const OrderCard = ({ order, onUpdateOrderStatus, onResync, onDismiss, isDarkMode = false, isFresh = false }) => {
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const armTimer = useRef(null);
  useTick(30000); // refresh overdue colouring every 30s

  useEffect(() => () => clearTimeout(armTimer.current), []);

  const status = order?.status === "pending" ? "new" : order?.status;
  const meta = STATUS_META[status] || { key: "pending", label: status || "Unknown", Icon: Bell };
  const isCancelled = status === "cancelled";
  const isDone = status === "delivered";
  const placedAt = toTime(order?.placedAt || order?.createdAt);
  const statusSince = toTime(order?.startedPreparingAt) ?? toTime(order?.updatedAt) ?? placedAt;
  const ageSource = status === "preparing" || status === "ready" ? statusSince : placedAt;
  const level = isCancelled || isDone || ageSource == null ? "ok" : overdueLevel(status, nowMs() - ageSource);
  const isUrgent = (order?.priority || "").toLowerCase() === "high";

  const items = Array.isArray(order?.items) ? order.items : [];
  const where = order?.table || (order?.orderType ? TYPE_LABEL[order.orderType] : "Order");
  const orderNo = order?.orderNumber || order?.id?.slice?.(-5)?.toUpperCase() || order?.id;
  const lineNotes = items.filter((i) => i.notes);
  const hasAllergy = [order?.notes, ...lineNotes.map((i) => i.notes)].some((n) => n && ALLERGY_PATTERN.test(n));

  const primary =
    status === "new" || status === "confirmed"
      ? { next: "preparing", label: "Start cooking", busyLabel: "Starting…", Icon: ChefHat, confirm: false }
      : status === "preparing"
        ? { next: "ready", label: "Mark ready", busyLabel: "Marking ready…", Icon: CheckCircle2, confirm: true }
        : null;

  const disarm = () => {
    clearTimeout(armTimer.current);
    setArmed(false);
  };

  const run = async () => {
    if (!primary || busy) return;
    disarm();
    setBusy(true);
    try {
      await onUpdateOrderStatus(order.id, primary.next);
    } catch (err) {
      // 409/400 mean someone else (another chef, a waiter, the guest) already
      // moved or cancelled the ticket: show the server's message and resync.
      toast.error(err?.message || "Could not update the order", { toastId: `kd-err-${order.id}` });
      onResync?.();
    } finally {
      setBusy(false);
    }
  };

  const onPrimary = () => {
    if (!primary) return;
    if (primary.confirm && !armed) {
      // "Ready" cannot be undone (the server refuses backward moves), so the
      // first tap arms the button and a second tap within 4s confirms.
      setArmed(true);
      armTimer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    run();
  };

  const classes = [
    "kd-ticket",
    `kd-ticket--${meta.key}`,
    level !== "ok" ? `kd-ticket--${level}` : "",
    isUrgent ? "kd-ticket--urgent" : "",
    isFresh ? "kd-ticket--fresh" : "",
    isCancelled ? "kd-ticket--cancelled" : "",
  ].filter(Boolean).join(" ");

  return (
    <article className={classes} data-order-id={order._id} data-status={status} aria-label={`Order ${orderNo}, ${meta.label}, ${where}`}>
      {isCancelled && (
        <div className="kd-cancel-banner" role="alert">
          <Ban size={22} aria-hidden="true" />
          <div>
            <strong>CANCELLED — STOP COOKING</strong>
            {order.cancellationReason ? <span>Reason: {order.cancellationReason}</span> : null}
          </div>
        </div>
      )}

      <header className="kd-ticket__head">
        <div className="kd-ticket__no">
          <span className="kd-ticket__hash">#{orderNo}</span>
          <span className={`kd-badge kd-badge--${meta.key}`}>
            <meta.Icon size={16} aria-hidden="true" />
            {meta.label}
          </span>
        </div>
        <div className="kd-ticket__time">
          {isDone ? (
            <span className="kd-elapsed">Served {formatClock(toTime(order?.deliveredAt) ?? toTime(order?.updatedAt))}</span>
          ) : isCancelled ? (
            <span className="kd-elapsed">Cancelled {formatClock(toTime(order?.cancelledAt) ?? toTime(order?.updatedAt))}</span>
          ) : (
            <>
              <Elapsed since={ageSource} className={`kd-elapsed--${level}`} />
              <span className="kd-ticket__since">
                {status === "preparing" ? "cooking" : status === "ready" ? "waiting for pickup" : `placed ${formatClock(placedAt)}`}
              </span>
            </>
          )}
        </div>
      </header>

      <div className="kd-ticket__where">
        <span className="kd-where">{where}</span>
        {TYPE_LABEL[order?.orderType] && TYPE_LABEL[order.orderType] !== where ? <span className="kd-type">{TYPE_LABEL[order.orderType]}</span> : null}
        {isUrgent && (
          <span className="kd-badge kd-badge--urgent">
            <AlertTriangle size={16} aria-hidden="true" /> Urgent
          </span>
        )}
        {level === "late" && (
          <span className="kd-badge kd-badge--late">
            <AlertTriangle size={16} aria-hidden="true" /> Overdue
          </span>
        )}
        {level === "warn" && <span className="kd-badge kd-badge--warn">Running late</span>}
      </div>

      {order?.customerName ? <p className="kd-guest">{order.customerName}</p> : null}

      <ul className="kd-items">
        {items.map((item, idx) => (
          <li key={item.id || idx} className="kd-item">
            <span className="kd-qty">{item.quantity}×</span>
            <span className="kd-item__body">
              <span className="kd-item__name">{item.name}</span>
              {item.notes ? <span className="kd-item__note">{item.notes}</span> : null}
            </span>
          </li>
        ))}
      </ul>

      {(order?.notes || hasAllergy) && (
        <div className="kd-note" role="note">
          {hasAllergy && (
            <span className="kd-badge kd-badge--allergy">
              <AlertTriangle size={16} aria-hidden="true" /> Allergy / dietary
            </span>
          )}
          {order?.notes ? <p>{order.notes}</p> : null}
        </div>
      )}

      {primary && (
        <div className="kd-actions">
          <button
            type="button"
            className={`kd-btn kd-btn--${primary.confirm ? "ready" : "start"} ${armed ? "kd-btn--armed" : ""}`}
            onClick={onPrimary}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? <Loader2 size={22} className="kd-spin" aria-hidden="true" /> : <primary.Icon size={22} aria-hidden="true" />}
            {busy ? primary.busyLabel : armed ? `Tap again to confirm #${orderNo} is ready` : primary.label}
          </button>
          {armed && (
            <button type="button" className="kd-btn kd-btn--ghost" onClick={disarm}>
              <X size={20} aria-hidden="true" /> Cancel
            </button>
          )}
        </div>
      )}

      {status === "ready" && (
        <div className="kd-awaiting" role="status">
          <CheckCircle2 size={20} aria-hidden="true" /> Ready for pickup · awaiting waiter
        </div>
      )}

      {isCancelled && onDismiss && (
        <div className="kd-actions">
          <button type="button" className="kd-btn kd-btn--danger" onClick={() => onDismiss(order.id)}>
            <X size={22} aria-hidden="true" /> Got it, dismiss
          </button>
        </div>
      )}

      {isDone && (
        <div className="kd-actions">
          <button type="button" className="kd-btn kd-btn--ghost" onClick={() => setShowDetails(true)}>
            <Eye size={20} aria-hidden="true" /> View details
          </button>
        </div>
      )}

      {showDetails && (
        <OrderDetailsModal
          order={order}
          onClose={() => setShowDetails(false)}
          isDarkMode={isDarkMode}
          onMarkReady={() => {}}
          onPrintBill={() => {}}
          onSendBill={() => {}}
        />
      )}
    </article>
  );
};

export default memo(OrderCard);
