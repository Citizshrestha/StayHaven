import React, { useEffect, useState } from "react";
import { Bell, Menu } from "lucide-react";

/**
 * MobileHeader
 *
 * Compact top bar for phones and small tablets (hidden from `lg` up, where the
 * sidebar is docked): menu button, hotel name, live connection status and the
 * alerts bell with its unread count.
 */
const STATUS = {
  online: { label: "Live", color: "#059669", dot: "#10B981" },
  reconnecting: { label: "Reconnecting", color: "#B45309", dot: "#F59E0B" },
  offline: { label: "Offline", color: "#B91C1C", dot: "#EF4444" },
};

const MobileHeader = ({ hotelName, isConnected, notificationCount = 0, onMenu, onNotifications }) => {
  const [browserOnline, setBrowserOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const up = () => setBrowserOnline(true);
    const down = () => setBrowserOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const state = !browserOnline ? "offline" : isConnected ? "online" : "reconnecting";
  const status = STATUS[state];

  return (
    <header
      className="lg:hidden waiter-mobile-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 8px 8px 12px",
        paddingTop: "max(8px, env(safe-area-inset-top))",
        backgroundColor: "var(--bg-primary)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", flexShrink: 0 }}
      >
        <Menu size={24} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          title={hotelName || "Waiter"}
          style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {hotelName || "Waiter"}
        </div>
        <div
          role="status"
          aria-live="polite"
          data-connection={state}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: status.color }}
        >
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: status.dot }} />
          {status.label}
        </div>
      </div>

      <button
        type="button"
        onClick={onNotifications}
        aria-label={notificationCount > 0 ? `Alerts, ${notificationCount} unread` : "Alerts"}
        style={{ position: "relative", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", flexShrink: 0 }}
      >
        <Bell size={22} />
        {notificationCount > 0 && (
          <span
            aria-hidden="true"
            style={{ position: "absolute", top: 4, right: 2, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, backgroundColor: "#DC2626", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}
          >
            {notificationCount > 99 ? "99+" : notificationCount}
          </span>
        )}
      </button>
    </header>
  );
};

export default MobileHeader;
