import React, { useState, useEffect } from "react";
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
import MessagingPanel from "../../../../shared/components/MessagingPanel";
import { Plus } from "lucide-react";

const WaiterDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeView, setActiveView] = useState("dashboard");
  const { orders, markServed, removeOrder, fetchOrders, loading, updateOrder } =
    useOrderContext();
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
  const { subscribe } = useSocket();

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
            notifications={notifications.slice(0, 5)}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onClose={() => setActiveView("dashboard")}
            onNotificationClick={handleNotificationClick}
            isDarkMode={isDark}
          />
        );
      case "waiterCalls":
        return (
          <WaiterCallsPanel
            onClose={() => setActiveView("dashboard")}
            onCallCountChange={setWaiterCallCount}
          />
        );
      /* Order history view removed */
      default:
        return (
          <DashboardContent
            orders={orders}
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
      className="min-h-screen lg:flex lg:h-screen lg:overflow-hidden"
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

      {/* Main Content Area - Flex grow to fill space */}
      <main className="flex-1 lg:h-full min-h-0 overflow-y-auto relative w-full">
        {/* Main Content - switches based on activeView */}
        {renderMainContent()}
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Background Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sidebar Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-64 shadow-xl"
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
      <button
        onClick={() => setShowOrderForm(true)}
        className="lg:hidden fixed z-50 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all"
        style={{
          bottom: "80px",
          right: "16px",
          boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
        }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

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
          onMessagingToggle={() => setIsMessagingOpen(prev => !prev)}
          unreadMessageCount={0}
        />
      </nav>

      {/* Floating Messenger Panel */}
      <MessagingPanel
        isOpen={isMessagingOpen}
        onToggle={() => setIsMessagingOpen(prev => !prev)}
        showFab={true}
      />
    </div>
  );
};

export default WaiterDashboard;
