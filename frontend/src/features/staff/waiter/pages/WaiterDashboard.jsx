import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import DashboardContent from "./DashboardContent";
import RightPanel from "./RightPanel";
import MobileBottomNav from "./MobileBottomNav";
import OrderFormModal from "./OrderFormModal";
import AssignedAreas from "./AssignedAreas";
import NotificationPanel from "./NotificationPanel";
import WaiterCallsPanel from "./WaiterCallsPanel";
import { useOrderContext } from "../../../../core/context/useOrderContext";
import { useSocket } from "../../../../core/context/SocketContext";
import { useNotifications } from "../../../../core/context/useNotifications";
import { useTheme } from "../../../../core/hooks/useTheme";
import { getActiveProperty } from "../../../../core/api/services/staffAccount.service";
import axiosClient from "../../../../core/api/client";
import MessagingPanel from "../../../../shared/components/MessagingPanel";
import TableBillsPanel from "../../../../shared/components/dining/TableBillsPanel";
import { Plus } from "lucide-react";
import "./WaiterShell.css";
import useSocketTokenKeepAlive from "./useSocketTokenKeepAlive";
import useSettingsAutoRefresh from "../../../../core/hooks/useSettingsAutoRefresh";

const WaiterDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeView, setActiveView] = useState("dashboard");
  const { orders, markServed, removeOrder, fetchOrders, loading, error, updateOrder } =
    useOrderContext();

  // Settings > Display > Auto-refresh: periodic reconciliation fetch on top
  // of the primary socket-driven updates (in case an event is missed).
  useSettingsAutoRefresh("waiterSettings", fetchOrders);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDark } = useTheme(); // Get theme state

  // Use centralized notification context (Socket + Context API)
  const {
    notifications,
    unreadCount,
    waiterCallCount,
    markRead,
    markAllRead,
    setWaiterCallCount
  } = useNotifications();

  // Socket.io for order refresh (notifications handled by context)
  const { subscribe, isConnected, socket } = useSocket();
  useSocketTokenKeepAlive(socket);
  const hotelName = getActiveProperty()?.name;

  // The Calls badge must show the real number of open calls. NotificationContext adds +1 for
  // every 'new-waiter-call' it hears (the server sends that event twice, to two rooms) and
  // never loads calls that were already open, so re-sync the count from the server shortly
  // after each call event, on first load and after a reconnect.
  const syncTimer = useRef(null);
  const syncCallCount = useCallback(async () => {
    const hotelId = getActiveProperty()?._id;
    if (!hotelId) return;
    try {
      const res = await axiosClient.get("/api/v1/staff/waiter-calls", { params: { hotelId } });
      if (res.data?.success) setWaiterCallCount((res.data.calls || []).filter((c) => c.status === "open").length);
    } catch {
      /* keep the last known count; the Calls view shows the error */
    }
  }, [setWaiterCallCount]);
  const scheduleCallSync = useCallback(() => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(syncCallCount, 500);
  }, [syncCallCount]);

  useEffect(() => {
    syncCallCount();
    return () => clearTimeout(syncTimer.current);
  }, [syncCallCount]);

  useEffect(() => {
    if (!subscribe) return undefined;
    const offs = ["new-waiter-call", "waiter-call-acknowledged", "waiter-call-resolved"].map((evt) => subscribe(evt, scheduleCallSync));
    return () => offs.forEach((off) => typeof off === "function" && off());
  }, [subscribe, scheduleCallSync]);

  const wasConnected = useRef(isConnected);
  useEffect(() => {
    if (isConnected && !wasConnected.current) scheduleCallSync();
    wasConnected.current = isConnected;
  }, [isConnected, scheduleCallSync]);

  useEffect(() => {
    // Only prevent body scroll on desktop (lg and above)
    // Allow natural scrolling on mobile/tablet
    const isDesktop = window.innerWidth >= 1024;
    
    if (isDesktop) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, []);

  // Subscribe to socket events for order data refresh only
  // (Notifications are handled by NotificationContext)
  useEffect(() => {
    if (!subscribe) return;

    // Refresh orders when status changes
    const unsubscribeStatusUpdate = subscribe('order-status-updated', () => {
      fetchOrders({ silent: true });
    });

    // Refresh orders when new order arrives
    const unsubscribeNewOrder = subscribe('new-order', () => {
      fetchOrders({ silent: true });
    });

    // Refresh orders when order details are updated (price, items, etc.)
    const unsubscribeOrderUpdate = subscribe('order-updated', () => {
      fetchOrders({ silent: true });
    });

    return () => {
      unsubscribeStatusUpdate();
      unsubscribeNewOrder();
      unsubscribeOrderUpdate();
    };
  }, [subscribe, fetchOrders]);

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const handleFilterByArea = (areaName) => {
    // Switch to dashboard view and set filter to show orders for this area
    setActiveFilter(`area:${areaName}`);
    setActiveView("dashboard");
  };

  // Handle notification click - navigate to that order in dashboard
  const handleNotificationClick = (notification) => {
    if (notification.orderId) {
      setActiveFilter("all"); // Show all orders to ensure the order is visible
      setActiveView("dashboard");

      // Scroll to the order after a short delay to allow view to render
      setTimeout(() => {
        const orderElement = document.querySelector(`[data-order-id="${notification.orderId}"]`);
        if (orderElement) {
          orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight effect
          orderElement.style.boxShadow = '0 0 0 3px #3B82F6';
          setTimeout(() => {
            orderElement.style.boxShadow = '';
          }, 2000);
        }
      }, 100);
    }
  };

  // Render main content based on active view
  const renderMainContent = () => {
    switch (activeView) {
      case "assignedTables":
        return (
          <AssignedAreas
            orders={orders}
            onFilterByArea={handleFilterByArea}
            onClose={() => setActiveView("dashboard")}
            isDarkMode={isDark}
          />
        );
      case "notifications":
        return (
          <NotificationPanel
            notifications={notifications}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onClose={() => setActiveView("dashboard")}
            onNotificationClick={handleNotificationClick}
            isDarkMode={isDark}
            variant="waiter"
          />
        );
      case "waiterCalls":
        return (
          <WaiterCallsPanel
            onClose={() => setActiveView("dashboard")}
            onCallCountChange={setWaiterCallCount}
          />
        );
      case "bills":
        return <TableBillsPanel title="Table bills" />;
      /* Order history view removed */
      default:
        return (
          <DashboardContent
            orders={orders}
            error={error}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onMarkServed={markServed}
            onDeleteOrder={removeOrder}
            onRefresh={fetchOrders}
            isRefreshing={loading}
            onUpdateOrder={updateOrder}
            onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        );
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-primary)",
      }}
      className="waiter-shell h-[100dvh] flex flex-col overflow-hidden overflow-x-hidden lg:flex-row lg:h-screen"
    >
      {/* Sidebar - Hidden on mobile, visible flex item on desktop */}
      <aside
        className="hidden lg:block lg:w-[280px] lg:shrink-0 lg:h-full lg:border-r lg:overflow-y-auto"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderColor: "var(--border-color)",
        }}
      >
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          notificationCount={unreadCount}
          waiterCallCount={waiterCallCount}
          onMessagingToggle={() => setIsMessagingOpen(prev => !prev)}
          unreadMessageCount={0}
        />
      </aside>

      {/* Compact top bar on phones/tablets: menu, hotel, connection status, alerts */}
      <MobileHeader
        hotelName={hotelName}
        isConnected={isConnected}
        notificationCount={unreadCount}
        onMenu={() => setIsMobileMenuOpen(true)}
        onNotifications={() => setActiveView("notifications")}
      />

      {/* Main Content Area - Flex grow to fill space */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain relative w-full pb-28 lg:pb-0 lg:h-full">
        {/* Main Content - switches based on activeView */}
        {renderMainContent()}
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          onKeyDown={(e) => { if (e.key === "Escape") setIsMobileMenuOpen(false); }}
        >
          {/* Background Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sidebar Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] overflow-y-auto shadow-xl"
            style={{
              backgroundColor: "var(--bg-primary)",
            }}
          >
            <Sidebar
              activeView={activeView}
              onViewChange={(view) => {
                handleViewChange(view);
                setIsMobileMenuOpen(false);
              }}
              notificationCount={unreadCount}
              waiterCallCount={waiterCallCount}
              onMessagingToggle={() => {
                setIsMessagingOpen(prev => !prev);
                setIsMobileMenuOpen(false);
              }}
              unreadMessageCount={0}
            />
          </div>
        </div>
      )}

      {/* Right Panel - Hidden on mobile, visible flex item on desktop */}
      <aside
        className="hidden lg:block lg:w-[380px] lg:shrink-0 lg:h-full min-h-0 lg:border-l lg:overflow-y-auto"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderColor: "var(--border-color)",
        }}
      >
        <RightPanel orders={orders} />
      </aside>

      {/* Mobile Floating Action Button - Only visible on mobile */}
      {!isMobileMenuOpen && (
      <button
        type="button"
        onClick={() => setShowOrderForm(true)}
        aria-label="New order"
        className="lg:hidden fixed z-50 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all motion-reduce:transition-none"
        style={{
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          right: "16px",
          backgroundColor: "#059669",
          boxShadow: "0 4px 14px rgba(5, 150, 105, 0.45)",
        }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
      )}

      {/* Order Form Modal */}
      {showOrderForm && (
        <OrderFormModal onClose={() => setShowOrderForm(false)} />
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden">
        <MobileBottomNav
          activeView={activeView}
          onViewChange={handleViewChange}
          notificationCount={unreadCount}
          waiterCallCount={waiterCallCount}
        />
      </nav>

      {/* Floating Messenger Panel */}
      <MessagingPanel
        isOpen={isMessagingOpen}
        onToggle={() => setIsMessagingOpen(prev => !prev)}
        showFab={!isMobileMenuOpen}
      />
    </div>
  );
};

export default WaiterDashboard;
