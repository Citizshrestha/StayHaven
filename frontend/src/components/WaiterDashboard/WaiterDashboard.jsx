import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import DashboardContent from "./DashboardContent";
import RightPanel from "./RightPanel";
import MobileBottomNav from "./MobileBottomNav";
import OrderFormModal from "./OrderFormModal";
import AssignedAreas from "./AssignedAreas";
import NotificationPanel from "./NotificationPanel";
import { useOrderContext } from "../../context/useOrderContext";
import { Plus } from "lucide-react";

const WaiterDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeView, setActiveView] = useState("dashboard");
  const { orders, markServed, removeOrder, fetchOrders, loading, updateOrder } = useOrderContext();
  const [showOrderForm, setShowOrderForm] = useState(false);

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

  // Notifications are now generated from orders in RightPanel
  const [notifications, setNotifications] = useState([]);

  const unreadCount = useMemo(() =>
    notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const handleMarkNotificationRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleFilterByArea = (areaName) => {
    // Switch to dashboard view and set filter to show orders for this area
    setActiveView("dashboard");
    // You could also add area-based filtering here
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
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)'
      }}
      className="min-h-screen lg:flex lg:h-screen lg:overflow-hidden">
      {/* Sidebar - Hidden on mobile, visible flex item on desktop */}
      <aside
        className="hidden lg:block lg:w-[280px] lg:shrink-0 lg:h-full lg:border-r lg:overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
      >
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          notificationCount={unreadCount}
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
      <aside className="hidden lg:block lg:w-[380px] lg:shrink-0 lg:h-full min-h-0 lg:border-l lg:overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <RightPanel orders={orders} />
      </aside>

      {/* Mobile Floating Action Button - Only visible on mobile */}
      <button
        onClick={() => setShowOrderForm(true)}
        className="lg:hidden fixed z-50 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all"
        style={{
          bottom: "80px",
          right: "16px",
          boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
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
        <MobileBottomNav />
      </nav>
    </div>
  );
};

export default WaiterDashboard;
