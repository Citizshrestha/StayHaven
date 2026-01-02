import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import DashboardContent from "./DashboardContent";
import RightPanel from "./RightPanel";
import MobileBottomNav from "./MobileBottomNav";
import OrderFormModal from "./OrderFormModal";
import AssignedAreas from "./AssignedAreas";
import NotificationPanel from "./NotificationPanel";
import OrderHistory from "./OrderHistory";
import WaiterCallsPanel from "./WaiterCallsPanel";
import { useOrderContext } from "../../context/useOrderContext";
import { useSocket } from "../../context/SocketContext";
import useNotificationSound from "../../hooks/useNotificationSound";
import { Plus } from "lucide-react";

const WaiterDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeView, setActiveView] = useState("dashboard");
  const { orders, markServed, removeOrder, fetchOrders, loading, updateOrder } =
    useOrderContext();
  const [showOrderForm, setShowOrderForm] = useState(false);

  // Socket.io integration for real-time updates
  const { subscribe } = useSocket();
  
  // Sound notifications
  const { playWithVibration } = useNotificationSound();

  // Waiter calls count (for badge)
  const [waiterCallCount, setWaiterCallCount] = useState(0);

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

  // Notifications state - generated from orders and real-time events
  const [notifications, setNotifications] = useState([]);

  // Subscribe to real-time socket events
  useEffect(() => {
    if (!subscribe) return;

    // Listen for new orders
    const unsubscribeNewOrder = subscribe('new-order', (data) => {
      console.log('📦 New order received:', data);
      playWithVibration('newOrder');
      
      // Add notification
      setNotifications(prev => [{
        id: `new-order-${data.order._id}-${Date.now()}`,
        type: 'new_order',
        message: `New order #${data.order.orderNumber} for ${
          data.order.orderType === 'roomService' 
            ? `Room ${data.order.roomNumber}` 
            : `Table ${data.order.tableNumber}`
        }`,
        orderId: data.order._id,
        createdAt: new Date(),
        isRead: false,
      }, ...prev]);
      
      // Refresh orders to get the new one
      fetchOrders({ silent: true });
    });

    // Listen for order status updates
    const unsubscribeStatusUpdate = subscribe('order-status-updated', (data) => {
      console.log('📝 Order status updated:', data);
      // Refresh orders to reflect the change
      fetchOrders({ silent: true });
    });

    // Listen for order ready notifications
    const unsubscribeOrderReady = subscribe('order-ready', (data) => {
      console.log('🔔 Order ready for pickup:', data);
      playWithVibration('orderReady');
      
      // Add notification
      setNotifications(prev => [{
        id: `order-ready-${data.orderId}-${Date.now()}`,
        type: 'order_ready',
        message: data.message || `Order #${data.orderNumber} is ready!`,
        orderId: data.orderId,
        createdAt: new Date(),
        isRead: false,
      }, ...prev]);
    });

    // Listen for new waiter calls
    const unsubscribeWaiterCall = subscribe('new-waiter-call', (data) => {
      console.log('📞 New waiter call:', data);
      playWithVibration('waiterCall');
      setWaiterCallCount(prev => prev + 1);
      
      // Add notification
      setNotifications(prev => [{
        id: `waiter-call-${data.call._id}-${Date.now()}`,
        type: 'waiter_call',
        message: `${data.call.priority} priority request from Room ${data.call.roomNumber}`,
        callId: data.call._id,
        createdAt: new Date(),
        isRead: false,
      }, ...prev]);
    });

    // Listen for resolved waiter calls
    const unsubscribeCallResolved = subscribe('waiter-call-resolved', () => {
      setWaiterCallCount(prev => Math.max(0, prev - 1));
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeStatusUpdate();
      unsubscribeOrderReady();
      unsubscribeWaiterCall();
      unsubscribeCallResolved();
    };
  }, [subscribe, fetchOrders, playWithVibration]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const handleMarkNotificationRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleFilterByArea = () => {
    // Switch to dashboard view and set filter to show orders for this area
    // Future enhancement: Add area-based filtering to DashboardContent
    setActiveView("dashboard");
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
          />
        );
      case "notifications":
        return (
          <NotificationPanel
            notifications={notifications}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onClear={handleClearNotifications}
            onClose={() => setActiveView("dashboard")}
          />
        );
      case "waiterCalls":
        return (
          <WaiterCallsPanel
            onClose={() => setActiveView("dashboard")}
            onCallCountChange={setWaiterCallCount}
          />
        );
      case "orderHistory":
        return (
          <OrderHistory
            onClose={() => setActiveView("dashboard")}
          />
        );
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
        />
      </aside>

      {/* Main Content Area - Flex grow to fill space */}
      <main className="flex-1 lg:h-full min-h-0 overflow-y-auto relative w-full">
        {/* Mobile Header */}
        <header className="lg:hidden">
          <MobileHeader />
        </header>

        {/* Main Content - switches based on activeView */}
        {renderMainContent()}
      </main>

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
        />
      </nav>
    </div>
  );
};

export default WaiterDashboard;
