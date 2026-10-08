import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Moon, Sun, Volume2, WifiOff } from "lucide-react";
import Sidebar from "./Sidebar";
import KitchenMobileHeader from "./KitchenMobileHeader";
import KitchenMobileNav from "./KitchenMobileNav";
import DashboardContent from "./DashboardContent";
import NotificationPanel from "../../waiter/pages/NotificationPanel";
import StaffSettings from "../../../../shared/components/StaffSettings";
import { useOrderContext } from "../../../../core/context/useOrderContext";
import { useSocket } from "../../../../core/context/SocketContext";
import { useNotifications } from "../../../../core/context/useNotifications";
import { useTheme } from "../../../../core/hooks/useTheme";
import { useStaffAuth } from "../../../../core/context/StaffAuthContext";
import MessagingPanel from "../../../../shared/components/MessagingPanel";
import useNotificationSound from "../../../../core/hooks/useNotificationSound";
import useSettingsAutoRefresh from "../../../../core/hooks/useSettingsAutoRefresh";
import { syncServerClock } from "./kitchenClock";
import "../../../../shared/styles/dashboard-tokens.css";
import "./KitchenDashboard.css";

const useIsPhoneOrTablet = () => {
  const query = "(max-width: 1023px)";
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return match;
};

const KitchenDashboard = () => {
  const navigate = useNavigate();
  const { staffUser } = useStaffAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeView, setActiveView] = useState("dashboard");
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const compact = useIsPhoneOrTablet();

  // Use centralized theme context
  const { isDark: isDarkMode, toggleTheme: toggleDarkMode } = useTheme();

  // Additional security check - only chief role can access Kitchen Dashboard
  useEffect(() => {
    if (staffUser && staffUser.role !== 'chief') {
      // Redirect to appropriate dashboard based on role
      if (staffUser.role === 'receptionist' || staffUser.role === 'manager') {
        navigate('/reception-dashboard', { replace: true });
      } else if (staffUser.role === 'waiter') {
        navigate('/waiter-dashboard', { replace: true });
      } else if (staffUser.role === 'hoteladmin') {
        navigate('/hoteladmin-dashboard', { replace: true });
      } else {
        navigate('/staff/login', { replace: true });
      }
    }
  }, [staffUser, navigate]);

  const { orders, updateOrderStatus, fetchOrders, loading, error } = useOrderContext();

  // Settings > Display > Auto-refresh: periodic reconciliation fetch on top
  // of the primary socket-driven updates (in case an event is missed).
  useSettingsAutoRefresh("kitchenSettings", fetchOrders);

  const counts = useMemo(() => {
    const c = { active: 0, fresh: 0, cooking: 0, ready: 0 };
    for (const o of orders) {
      if (o.status === "delivered" || o.status === "cancelled") continue;
      c.active += 1;
      if (o.status === "new" || o.status === "pending" || o.status === "confirmed") c.fresh += 1;
      else if (o.status === "preparing") c.cooking += 1;
      else if (o.status === "ready") c.ready += 1;
    }
    return c;
  }, [orders]);

  // Centralized notification context (sounds and bell entries are handled
  // there, once per order, so this screen must not play them a second time).
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { subscribe, isConnected } = useSocket();
  const { audioState, enableSound } = useNotificationSound();

  // Request browser notification permission once so we can alert kitchen
  // staff of new orders even when this tab isn't focused.
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // First paint: show the skeleton and measure the server clock for timers.
  useEffect(() => {
    fetchOrders();
    syncServerClock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Legacy `kitchen-dark` class: dark CSS variables that shared components
  // (notification panel, settings, messaging) read from the document root.
  useEffect(() => {
    document.documentElement.classList.toggle("kitchen-dark", isDarkMode);
    return () => document.documentElement.classList.remove("kitchen-dark");
  }, [isDarkMode]);

  // Tab title carries the number of tickets waiting, visible from other tabs.
  useEffect(() => {
    const previous = document.title;
    document.title = counts.fresh > 0 ? `(${counts.fresh}) Kitchen · StayHaven` : "Kitchen · StayHaven";
    return () => { document.title = previous; };
  }, [counts.fresh]);

  // Dashboard-level scroll lock: the page itself never scrolls, the content
  // pane does. Restored on unmount.
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  // Keep the screen awake while the kitchen display is open (optional API).
  useEffect(() => {
    if (!("wakeLock" in navigator)) return undefined;
    let lock = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState !== "visible" || lock) return;
        lock = await navigator.wakeLock.request("screen");
        lock.addEventListener("release", () => { lock = null; });
        if (cancelled) lock.release().catch(() => {});
      } catch {
        // Denied (battery saver, no gesture yet): the display just sleeps normally.
      }
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, []);

  // Coalesce bursts of socket events (a rush sends many) into one fetch.
  const refreshTimer = useRef(null);
  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => fetchOrders({ silent: true }), 250);
  }, [fetchOrders]);
  useEffect(() => () => clearTimeout(refreshTimer.current), []);

  // Orders created, moved, cancelled or edited anywhere refresh the board.
  useEffect(() => {
    if (!subscribe) return undefined;
    const unsubs = ["order-status-updated", "new-order", "order-updated", "order-cancelled"].map((ev) => subscribe(ev, scheduleRefresh));
    return () => unsubs.forEach((u) => u?.());
  }, [subscribe, scheduleRefresh]);

  // Resync after any gap: socket reconnect, network back, tab visible again.
  const wasConnected = useRef(isConnected);
  useEffect(() => {
    if (isConnected && !wasConnected.current) fetchOrders({ silent: true });
    wasConnected.current = isConnected;
  }, [isConnected, fetchOrders]);
  useEffect(() => {
    const onOnline = () => { setOnline(true); fetchOrders({ silent: true }); };
    const onOffline = () => setOnline(false);
    const onVisible = () => { if (document.visibilityState === "visible") fetchOrders({ silent: true }); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchOrders]);

  const disconnected = !online || !isConnected;

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  // Handle notification click - navigate to that order in dashboard
  const handleNotificationClick = (notification) => {
    if (notification.orderId) {
      setActiveFilter("all");
      setActiveView("dashboard");

      setTimeout(() => {
        const orderElement = document.querySelector(`[data-order-id="${notification.orderId}"]`);
        if (orderElement) {
          orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          orderElement.classList.add("kd-ticket--spot");
          setTimeout(() => orderElement.classList.remove("kd-ticket--spot"), 2000);
        }
      }, 100);
    }
  };

  // Render main content based on active view
  const renderMainContent = () => {
    switch (activeView) {
      case "notifications":
        return (
          <NotificationPanel
            notifications={notifications.slice(0, 5)}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onClose={() => setActiveView("dashboard")}
            onNotificationClick={handleNotificationClick}
            isDarkMode={isDarkMode}
            variant="kitchen"
          />
        );
      case "settings":
        return (
          <div className="kd-settings">
            <StaffSettings
              onClose={() => setActiveView("dashboard")}
              variant="kitchen"
            />
          </div>
        );
      default:
        return (
          <DashboardContent
            orders={orders}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onUpdateOrderStatus={updateOrderStatus}
            onRefresh={fetchOrders}
            isRefreshing={loading}
            error={error}
            isDarkMode={isDarkMode}
          />
        );
    }
  };

  return (
    <div className={`kitchen-dashboard dashboardShell kd-shell ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar - hidden below 1024px */}
      <aside className="kd-sidebar hidden lg:block">
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          notificationCount={unreadCount}
          isDarkMode={isDarkMode}
          onMessagingToggle={() => setIsMessagingOpen(prev => !prev)}
          unreadMessageCount={0}
        />
      </aside>

      <main className="kd-main">
        {/* Phone / portrait tablet header */}
        <header className="lg:hidden">
          <KitchenMobileHeader
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            counts={counts}
            onRefresh={fetchOrders}
            isRefreshing={loading}
            activeView={activeView}
            onViewChange={handleViewChange}
            notificationCount={unreadCount}
            onMessagingToggle={() => setIsMessagingOpen(prev => !prev)}
          />
        </header>

        {/* Desktop / landscape tablet header */}
        <header className="kd-topbar hidden lg:flex">
          <div className="kd-topbar__title">
            <Flame size={24} aria-hidden="true" />
            <h1>Kitchen</h1>
            <span className="kd-topbar__sub">Live orders</span>
          </div>
          <dl className="kd-counters" aria-label="Tickets by status">
            <div><dt>New</dt><dd className="kd-counters__new">{counts.fresh}</dd></div>
            <div><dt>Cooking</dt><dd className="kd-counters__cooking">{counts.cooking}</dd></div>
            <div><dt>Ready</dt><dd className="kd-counters__ready">{counts.ready}</dd></div>
          </dl>
          <button
            type="button"
            className="kd-iconbtn"
            onClick={toggleDarkMode}
            aria-pressed={isDarkMode}
            aria-label="Dark mode"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
          </button>
        </header>

        {disconnected && (
          <div className="kd-banner kd-banner--offline" role="status" aria-live="polite">
            <WifiOff size={20} aria-hidden="true" />
            <span>{online ? "Live connection lost. Reconnecting… Tickets may be out of date." : "You are offline. Tickets may be out of date."}</span>
          </div>
        )}
        {audioState === "suspended" && (
          <div className="kd-banner kd-banner--sound">
            <Volume2 size={20} aria-hidden="true" />
            <span>Sound alerts are off until you tap once.</span>
            <button type="button" className="kd-btn kd-btn--ghost" onClick={enableSound}>Enable sound</button>
          </div>
        )}

        <div className="kd-scroll">
          {renderMainContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden" aria-label="Kitchen navigation">
        <KitchenMobileNav
          activeView={activeView}
          onViewChange={handleViewChange}
          notificationCount={unreadCount}
          isDarkMode={isDarkMode}
          onMessagingToggle={() => setIsMessagingOpen(prev => !prev)}
          unreadMessageCount={0}
        />
      </nav>

      {/* Floating Messenger Panel (the phone nav has its own Messages tab) */}
      <MessagingPanel
        isOpen={isMessagingOpen}
        onToggle={() => setIsMessagingOpen(prev => !prev)}
        showFab={!compact}
      />
    </div>
  );
};

export default KitchenDashboard;
