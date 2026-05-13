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
import { useOrderContext } from "../../context/useOrderContext";
import { useSocket } from "../../context/SocketContext";
import { useNotifications } from "../../context/useNotifications";
import { useTheme } from "../../hooks/useTheme";
import { Plus } from "lucide-react";

const WaiterDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeView, setActiveView] = useState("dashboard");
  const { orders, markServed, removeOrder, fetchOrders, loading, updateOrder } = useOrderContext();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const { isDark } = useTheme();
  const {
    notifications,
    unreadCount,
    waiterCallCount,
    markRead,
    markAllRead,
    setWaiterCallCount
  } = useNotifications();
  const { subscribe } = useSocket();

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

  useEffect(() => {
    if (!subscribe) return;
    const unsubscribeStatusUpdate = subscribe('order-status-updated', () => {
      fetchOrders({ silent: true });
    });
    const unsubscribeNewOrder = subscribe('new-order', () => {
      fetchOrders({ silent: true });
    });
    return () => {
      unsubscribeStatusUpdate();
      unsubscribeNewOrder();
    };
  }, [subscribe, fetchOrders]);

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const handleFilterByArea = (areaName) => {
    setActiveFilter(`area:${areaName}`);
    setActiveView("dashboard");
  };

  const handleNotificationClick = (notification) => {
    if (notification.orderId) {
      setSelectedOrderId(notification.orderId);
      setActiveFilter("all");
      setActiveView("dashboard");
      setTimeout(() => {
        const orderElement = document.querySelector(`[data-order-id="${notification.orderId}"]`);
        if (orderElement) {
          orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          orderElement.style.boxShadow = '0 0 0 3px #3B82F6';
          setTimeout(() => {
            orderElement.style.boxShadow = '';
          }, 2000);
        }
        setSelectedOrderId(null);
      }, 100);
    }
  };

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
            onNotificationClick={handleNotificationClick}
          />
        );
      case "waiterCalls":
        return (
          <WaiterCallsPanel
            onCallCountChange={setWaiterCallCount}
          />
        );
      default:
        return (
          <DashboardContent
            orders={orders}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            markServed={markServed}
            removeOrder={removeOrder}
            loading={loading}
            selectedOrderId={selectedOrderId}
            updateOrder={updateOrder}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-gray-900 lg:flex lg:h-screen lg:overflow-hidden">
      <aside className="hidden lg:block lg:w-[280px] lg:shrink-0 lg:h-full lg:bg-white lg:border-r lg:border-gray-100 lg:overflow-y-auto">
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          notificationCount={unreadCount}
          waiterCallCount={waiterCallCount}
        />
      </aside>
      <main className="flex-1 h-full overflow-y-auto relative w-full">
        <MobileHeader
          activeView={activeView}
          onViewChange={handleViewChange}
          unreadCount={unreadCount}
          waiterCallCount={waiterCallCount}
        />
        {renderMainContent()}
        <RightPanel
          activeView={activeView}
          onViewChange={handleViewChange}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          markRead={markRead}
          markAllRead={markAllRead}
          waiterCallCount={waiterCallCount}
          setWaiterCallCount={setWaiterCallCount}
        />
        <MobileBottomNav
          activeView={activeView}
          onViewChange={handleViewChange}
          unreadCount={unreadCount}
          waiterCallCount={waiterCallCount}
        />
        {showOrderForm && (
          <OrderFormModal
            onClose={() => setShowOrderForm(false)}
            onOrderCreated={() => {
              fetchOrders();
              setShowOrderForm(false);
            }}
          />
        )}
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
      </main>
    </div>
  );
};

export default WaiterDashboard;
