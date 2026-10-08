import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Ban, Bell, CheckCircle, ChefHat, Clock, LayoutGrid, RefreshCw, Search, X } from "lucide-react";
import OrderCard from "./OrderCard";
import "./KitchenDashboard.css";

const DISMISS_KEY = "kitchenDismissedCancelled";
const CANCEL_ALERT_WINDOW_MS = 30 * 60 * 1000;
const FRESH_MS = 8000;

const readDismissed = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

const ts = (o) => {
  const t = Date.parse(o?.placedAt || o?.createdAt);
  return Number.isNaN(t) ? 0 : t;
};

const isSameLocalDay = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

const useWideBoard = () => {
  const query = "(min-width: 1280px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
};

const COLUMNS = [
  { id: "new", title: "New", Icon: Bell, match: (s) => s === "new" || s === "pending" || s === "confirmed" },
  { id: "preparing", title: "Cooking", Icon: ChefHat, match: (s) => s === "preparing" },
  { id: "ready", title: "Ready", Icon: CheckCircle, match: (s) => s === "ready" },
];

const DashboardContent = ({
  orders,
  activeFilter,
  setActiveFilter,
  onUpdateOrderStatus,
  onRefresh,
  isRefreshing,
  error = null,
  isDarkMode = true,
}) => {
  const [search, setSearch] = useState("");
  const [dismissed, setDismissed] = useState(readDismissed);
  const wide = useWideBoard();

  // Tickets that arrive after the first load get a short highlight. The first
  // render only records ids so a page reload does not flash every ticket.
  const seenRef = useRef(null);
  const [fresh, setFresh] = useState(() => new Map());
  useEffect(() => {
    const ids = orders.map((o) => o.id);
    if (seenRef.current === null) {
      if (ids.length) seenRef.current = new Set(ids);
      return undefined;
    }
    const added = ids.filter((id) => !seenRef.current.has(id));
    if (!added.length) return undefined;
    added.forEach((id) => seenRef.current.add(id));
    const until = Date.now() + FRESH_MS;
    setFresh((prev) => {
      const next = new Map(prev);
      added.forEach((id) => next.set(id, until));
      return next;
    });
    const t = setTimeout(() => setFresh(new Map()), FRESH_MS + 100);
    return () => clearTimeout(t);
  }, [orders]);

  const dismiss = useCallback((id) => {
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      try {
        sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
      } catch { /* storage full or blocked: dismissal lasts for this render only */ }
      return next;
    });
  }, []);

  const q = search.trim().toLowerCase();
  const matches = useCallback((o) => {
    if (!q) return true;
    const hay = [o.orderNumber, o.table, o.customerName, o.roomNumber, o.tableNumber, ...(o.items || []).map((i) => i.name)]
      .filter((v) => v != null)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }, [q]);

  const groups = useMemo(() => {
    const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
    const doneToday = orders
      .filter((o) => o.status === "delivered" && isSameLocalDay(o.deliveredAt || o.updatedAt))
      .sort((a, b) => Date.parse(b.deliveredAt || b.updatedAt) - Date.parse(a.deliveredAt || a.updatedAt))
      .slice(0, 50);
    const cancelledAll = orders
      .filter((o) => o.status === "cancelled")
      .sort((a, b) => Date.parse(b.cancelledAt || b.updatedAt) - Date.parse(a.cancelledAt || a.updatedAt));
    const cancelledAlerts = cancelledAll.filter((o) => {
      const at = Date.parse(o.cancelledAt || o.updatedAt);
      return !dismissed.has(o.id) && Date.now() - at < CANCEL_ALERT_WINDOW_MS;
    });
    return { active, doneToday, cancelledAll, cancelledAlerts };
  }, [orders, dismissed]);

  const oldestFirst = (a, b) => ts(a) - ts(b);
  const byColumn = (col) => groups.active.filter((o) => col.match(o.status)).sort(oldestFirst);
  const counts = {
    all: groups.active.length,
    new: byColumn(COLUMNS[0]).length,
    preparing: byColumn(COLUMNS[1]).length,
    ready: byColumn(COLUMNS[2]).length,
    completed: groups.doneToday.length,
    cancelled: groups.cancelledAll.length,
  };

  const filters = [
    { id: "all", label: "All", Icon: LayoutGrid },
    { id: "new", label: "New", Icon: Bell, tone: "pending" },
    { id: "preparing", label: "Cooking", Icon: ChefHat, tone: "preparing" },
    { id: "ready", label: "Ready", Icon: CheckCircle, tone: "ready" },
    { id: "completed", label: "Done today", Icon: Clock, tone: "delivered" },
    { id: "cancelled", label: "Cancelled", Icon: Ban, tone: "cancelled" },
  ];

  const visible = useMemo(() => {
    if (activeFilter === "completed") return groups.doneToday.filter(matches);
    if (activeFilter === "cancelled") return groups.cancelledAll.filter(matches);
    if (activeFilter === "all") return groups.active.filter(matches).sort(oldestFirst);
    const col = COLUMNS.find((c) => c.id === activeFilter);
    return (col ? byColumn(col) : []).filter(matches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, groups, matches]);

  const clearFilters = () => {
    setSearch("");
    setActiveFilter("all");
  };

  const isFresh = (o) => (fresh.get(o.id) || 0) > Date.now();
  const card = (o, extra = {}) => (
    <OrderCard
      key={o._id || o.id}
      order={o}
      onUpdateOrderStatus={onUpdateOrderStatus}
      onResync={() => onRefresh?.({ silent: true })}
      isDarkMode={isDarkMode}
      isFresh={isFresh(o)}
      {...extra}
    />
  );

  const alerts = activeFilter === "all" ? groups.cancelledAlerts.filter(matches) : [];
  const showSkeleton = isRefreshing && orders.length === 0;
  const boardActive = activeFilter === "all" && wide;
  const noActive = groups.active.length === 0 && alerts.length === 0;

  const renderEmpty = () => {
    if (error && orders.length === 0) {
      return (
        <div className="kd-empty" role="alert">
          <AlertCircle size={32} aria-hidden="true" />
          <h2>Could not load orders</h2>
          <p>{error}</p>
          <button type="button" className="kd-btn kd-btn--start" onClick={() => onRefresh?.()}>
            <RefreshCw size={20} aria-hidden="true" /> Retry
          </button>
        </div>
      );
    }
    const filtered = q || activeFilter !== "all";
    const label = filters.find((f) => f.id === activeFilter)?.label.toLowerCase();
    return (
      <div className="kd-empty">
        <ChefHat size={32} aria-hidden="true" />
        <h2>{q ? "No tickets match your search" : filtered ? `No ${label} tickets` : "Kitchen is clear"}</h2>
        <p>{filtered ? "Try another filter or clear the search." : "New orders appear here the moment they are placed."}</p>
        <button type="button" className="kd-btn kd-btn--ghost" onClick={filtered ? clearFilters : () => onRefresh?.()}>
          {filtered ? <><X size={20} aria-hidden="true" /> Clear filters</> : <><RefreshCw size={20} aria-hidden="true" /> Refresh</>}
        </button>
      </div>
    );
  };

  return (
    <div className="kd-content">
      <div className="kd-toolbar">
        <div className="kd-chips" role="tablist" aria-label="Ticket filters" data-scroll-x>
          {filters.map((f) => {
            const active = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`kd-chip ${f.tone ? `kd-chip--${f.tone}` : ""} ${active ? "is-active" : ""}`}
                onClick={() => setActiveFilter(f.id)}
              >
                <f.Icon size={18} aria-hidden="true" />
                <span>{f.label}</span>
                <span className="kd-chip__count">{counts[f.id]}</span>
              </button>
            );
          })}
        </div>
        <div className="kd-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Search tickets by order number, table or guest"
            placeholder="Search order #, table, guest"
            value={search}
            maxLength={60}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="kd-search__clear" aria-label="Clear search" onClick={() => setSearch("")}>
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        <button type="button" className="kd-btn kd-btn--ghost kd-refresh" onClick={() => onRefresh?.()} disabled={isRefreshing} aria-busy={isRefreshing}>
          <RefreshCw size={18} className={isRefreshing ? "kd-spin" : ""} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {alerts.length > 0 && (
        <section className="kd-alerts" aria-label="Cancelled orders, stop cooking">
          {alerts.map((o) => card(o, { onDismiss: dismiss }))}
        </section>
      )}

      {showSkeleton ? (
        <div className="kd-grid" aria-busy="true" aria-label="Loading orders">
          {[0, 1, 2].map((i) => <div key={i} className="kd-ticket kd-skeleton" />)}
        </div>
      ) : activeFilter === "all" && noActive ? (
        renderEmpty()
      ) : boardActive ? (
        <div className="kd-board">
          {COLUMNS.map((col) => {
            const list = byColumn(col).filter(matches);
            return (
              <section key={col.id} className={`kd-col kd-col--${col.id}`} aria-label={`${col.title} tickets`}>
                <h2 className="kd-col__title">
                  <col.Icon size={20} aria-hidden="true" /> {col.title}
                  <span className="kd-chip__count">{counts[col.id]}</span>
                </h2>
                {list.length === 0 ? <p className="kd-col__empty">Nothing here</p> : list.map((o) => card(o))}
              </section>
            );
          })}
        </div>
      ) : visible.length === 0 ? (
        alerts.length > 0 && activeFilter === "all" ? null : renderEmpty()
      ) : (
        <div className="kd-grid">
          {visible.map((o) => card(o, o.status === "cancelled" && activeFilter === "all" ? { onDismiss: dismiss } : {}))}
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
