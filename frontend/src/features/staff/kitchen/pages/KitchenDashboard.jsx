import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import KitchenMobileHeader from "./KitchenMobileHeader";
import KitchenMobileNav from "./KitchenMobileNav";
import DashboardContent from "./DashboardContent";
import NotificationPanel from "../../waiter/pages/NotificationPanel";
import StaffSettings from "../../../../components/shared/StaffSettings";
import { useOrderContext } from "../../../../core/context/useOrderContext";
import { useSocket } from "../../../../core/context/SocketContext";
import { useNotifications } from "../../../../core/context/useNotifications";
import { useTheme } from "../../../../core/hooks/useTheme";
import { useStaffAuth } from "../../../../context/StaffAuthContext";
import MessagingPanel from "../../../../shared/components/MessagingPanel";

const KitchenDashboard = () => {
  const navigate = useNavigate();
  const { staffUser } = useStaffAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeView, setActiveView] = useState("dashboard");
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

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

  const { orders, updateOrderStatus, fetchOrders, loading } = useOrderContext();

  // Use centralized notification context (Socket + Context API)
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead
  } = useNotifications();

  // Debug: Log notification state changes
  useEffect(() => {
    console.log('🔔 [KitchenDashboard] Notification state updated:', {
      totalNotifications: notifications.length,
      unreadCount,
      notifications: notifications.slice(0, 3) // Log first 3 for debugging
    });
  }, [notifications, unreadCount]);

  // Socket.io for order refresh (notifications handled by context)
  const { subscribe } = useSocket();

  // Apply kitchen-dark class for legacy CSS support (in addition to dark-theme from ThemeContext)
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("kitchen-dark");
    } else {
      document.documentElement.classList.remove("kitchen-dark");
    }

    return () => {
      document.documentElement.classList.remove("kitchen-dark");
    };
  }, [isDarkMode]);

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

  // Subscribe to socket events for order data refresh only
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

  // Handle notification click - navigate to that order in dashboard
  const handleNotificationClick = (notification) => {
    if (notification.orderId) {
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
          />
        );
      case "settings":
        return (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "16px",
            minHeight: "100%",
          }}>
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
            isDarkMode={isDarkMode}
          />
        );
    }
  };

  // Dynamic styles based on dark mode
  const containerStyle = {
    height: "100vh",
    backgroundColor: isDarkMode ? "#0F172A" : "#F8F9FB",
    display: "flex",
    overflow: "hidden",
    transition: "background-color 0.3s ease",
  };

  const sidebarStyle = {
    width: "280px",
    backgroundColor: isDarkMode ? "#1E293B" : "var(--bg-primary, white)",
    borderRight: `1px solid ${isDarkMode ? "#334155" : "var(--border-color, #E5E7EB)"}`,
    flexShrink: 0,
    height: "100%",
    overflowY: "auto",
  };

  const mainContentStyle = {
    flex: 1,
    padding: "32px",
    overflowY: "auto",
    minHeight: 0,
    backgroundColor: isDarkMode ? "#0F172A" : "transparent",
  };

  return (
    <div
      style={containerStyle}
      className={`kitchen-dashboard ${isDarkMode ? 'dark' : ''}`}
    >
      {/* Sidebar - Hidden on mobile */}
      <aside
        style={sidebarStyle}
        className="hidden lg:block"
      >
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          notificationCount={unreadCount}
          isDarkMode={isDarkMode}
          onMessagingToggle={() => setIsMessagingOpen(prev => !prev)}
          unreadMessageCount={0}
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden">
          <KitchenMobileHeader
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </header>

        {/* Main Content */}
        <div
          style={mainContentStyle}
          className="flex-1 overflow-y-auto p-4 lg:p-8"
        >
          {renderMainContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden">
        <KitchenMobileNav
          activeView={activeView}
          onViewChange={handleViewChange}
          notificationCount={unreadCount}
          isDarkMode={isDarkMode}
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

export default KitchenDashboard;
