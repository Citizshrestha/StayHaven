import { useSyncExternalStore } from "react";
import { getSocketUrl } from "../../../../core/utils/apiConfig";

// Kitchen timers must be right even when the tablet's clock is wrong, so the
// offset between the server clock and this device is measured once from the
// public /health timestamp and applied to every elapsed-time calculation.
let serverOffsetMs = 0;

export const nowMs = () => Date.now() + serverOffsetMs;

export const syncServerClock = async () => {
  try {
    const started = Date.now();
    const res = await fetch(`${getSocketUrl()}/health`, { cache: "no-store" });
    const body = await res.json();
    const server = Date.parse(body?.timestamp);
    if (Number.isNaN(server)) return;
    const roundTrip = Date.now() - started;
    serverOffsetMs = server - (Date.now() - roundTrip / 2);
  } catch {
    // Keep the previous offset; timers fall back to the device clock.
  }
};

// One shared interval per period instead of one per ticket.
const tickers = new Map();
const subscribeTo = (periodMs) => (listener) => {
  let t = tickers.get(periodMs);
  if (!t) {
    t = { listeners: new Set(), tick: 0, id: null };
    t.id = setInterval(() => {
      t.tick += 1;
      t.listeners.forEach((l) => l());
    }, periodMs);
    tickers.set(periodMs, t);
  }
  t.listeners.add(listener);
  return () => {
    t.listeners.delete(listener);
    if (t.listeners.size === 0) {
      clearInterval(t.id);
      tickers.delete(periodMs);
    }
  };
};
const subs = { 1000: subscribeTo(1000), 30000: subscribeTo(30000) };
const snapshot = (periodMs) => () => tickers.get(periodMs)?.tick ?? 0;

/** Re-renders the caller every `periodMs` (1000 or 30000). */
export const useTick = (periodMs = 1000) =>
  useSyncExternalStore(subs[periodMs], snapshot(periodMs), () => 0);

export const formatElapsed = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}:${pad(s)}`;
};

// Minutes before a ticket is flagged. warn = amber, late = red.
export const OVERDUE_MINUTES = {
  new: { warn: 5, late: 10 },
  confirmed: { warn: 5, late: 10 },
  preparing: { warn: 15, late: 25 },
  ready: { warn: 5, late: 10 },
};

export const overdueLevel = (status, ageMs) => {
  const t = OVERDUE_MINUTES[status === "pending" ? "new" : status];
  if (!t) return "ok";
  const min = ageMs / 60000;
  if (min >= t.late) return "late";
  if (min >= t.warn) return "warn";
  return "ok";
};
