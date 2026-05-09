import { useState, useEffect } from "react";
import {
  RefreshCw,
  List,
  Bell as BellIcon,
  ChefHat,
  CheckCircle,
  Menu,
} from "lucide-react";
import OrderCard from "./order/OrderCard";

const DashboardContent = ({ orders, activeFilter, setActiveFilter, onMarkServed, onDeleteOrder, onRefresh, isRefreshing, onUpdateOrder, onMenuToggle }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Handle responsive breakpoints
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const filteredOrders = (
    activeFilter === "all"
      ? orders
      : activeFilter.startsWith('area:')
      ? orders.filter((order) => {
          const areaName = activeFilter.replace('area:', '');
          // support different property names that might hold table/room info
          const table = order.tableNumber || order.table || order.table_no || '';
          const room = order.roomNumber || order.room || '';
          return String(table) === String(areaName) || String(room) === String(areaName) || String(`${order.orderType === 'roomService' ? `Room ${order.roomNumber}` : `Table ${order.tableNumber}`}`) === String(areaName) || String(areaName).toLowerCase().includes(String(table).toLowerCase());
        })
      : orders.filter((order) => order.status === activeFilter)
  ).sort((a, b) => {
    // Real orders (isReal: true) come first
    if (a.isReal && !b.isReal) return -1;
    if (!a.isReal && b.isReal) return 1;
    // If both are same type, sort by date (newest first)
    return new Date(b.placedAt) - new Date(a.placedAt);
  });

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const filters = [
    { id: "all", label: "All", icon: List },
    { id: "new", label: "New", icon: BellIcon },
    { id: "preparing", label: "Preparing", icon: ChefHat },
    { id: "ready", label: "Ready for Pickup", icon: CheckCircle },
    { id: "delivered", label: "Completed", icon: CheckCircle },
  ];

  // Responsive Inline Styles
  const containerStyle = {
    paddingBottom: isMobile ? "5rem" : "0",
    backgroundColor: "var(--bg-secondary)",
    fontFamily: "'Nunito', sans-serif",
  };

  const headerContainerStyle = {
    position: "sticky",
    top: 0,
    zIndex: 20,
    backgroundColor: "var(--bg-secondary)",
    padding: isMobile ? "16px" : isTablet ? "24px 32px 20px 32px" : "32px 48px 24px 48px",
  };

  const titleSectionStyle = {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "flex-start",
    justifyContent: "space-between",
    gap: isMobile ? "16px" : "0",
    marginBottom: isMobile ? "20px" : "32px",
  };

  const titleRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: isMobile ? "12px" : "0",
    marginBottom: isMobile ? "0" : "0",
  };

  const menuButtonStyle = {
    display: isMobile ? "flex" : "none",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    backgroundColor: "var(--bg-primary)",
    border: "1px solid var(--border-color)",
    cursor: "pointer",
    transition: "all 0.2s",
    flexShrink: 0,
  };

  const titleStyle = {
    fontSize: isMobile ? "28px" : isTablet ? "32px" : "40px",
    fontWeight: "800",
    color: "var(--text-primary)",
    marginBottom: "8px",
    letterSpacing: "-0.025em",
    lineHeight: "1.1",
  };

  const subtitleStyle = {
    fontSize: isMobile ? "14px" : "18px",
    color: "var(--text-secondary)",
    fontWeight: "500",
  };

  const refreshButtonStyle = {
    padding: isMobile ? "10px 16px" : "12px 24px",
    backgroundColor: "#10B981",
    color: "white",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "background-color 0.2s",
    border: "none",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
    boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 2px 4px -1px rgba(16, 185, 129, 0.06)",
    width: isMobile ? "100%" : "auto",
  };

  const filterContainerStyle = {
    display: "flex",
    gap: isMobile ? "8px" : "12px",
    overflowX: "auto",
    paddingBottom: "8px",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  };

  const getFilterButtonStyle = (isActive) => ({
    padding: isMobile ? "8px 12px" : "12px 24px",
    borderRadius: "12px",
    fontWeight: "700",
    fontSize: isMobile ? "12px" : "14px",
    display: "flex",
    alignItems: "center",
    gap: isMobile ? "4px" : "8px",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
    border: "none",
    cursor: "pointer",
    backgroundColor: isActive ? "var(--color-accent-light)" : "var(--bg-primary)",
    color: isActive ? "var(--color-primary)" : "var(--text-tertiary)",
    boxShadow: isActive ? "none" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    flexShrink: 0,
  });

  const ordersGridStyle = {
    padding: isMobile ? "0 16px 80px 16px" : isTablet ? "0 32px 32px 32px" : "0 48px 32px 48px",
  };

  const ordersListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? "16px" : "24px",
  };

  return (
    <div style={containerStyle}>
      {/* Header Section - Sticky */}
      <div style={headerContainerStyle}>
        {/* Title + Refresh Button */}
        <div style={titleSectionStyle}>
          <div style={titleRowStyle}>
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuToggle}
              style={menuButtonStyle}
              onMouseEnter={(e) => {
                if (isMobile) {
                  e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                }
              }}
              onMouseLeave={(e) => {
                if (isMobile) {
                  e.currentTarget.style.backgroundColor = "var(--bg-primary)";
                }
              }}
            >
              <Menu size={20} style={{ color: "var(--text-primary)" }} />
            </button>

            {/* Title */}
            <div style={{ flex: 1 }}>
              <h1 style={titleStyle}>Waiter Dashboard</h1>
              <p style={subtitleStyle}>Real-time view of orders and table statuses.</p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            style={{
              ...refreshButtonStyle,
              opacity: isRefreshing ? 0.7 : 1,
              cursor: isRefreshing ? 'not-allowed' : 'pointer'
            }}
            disabled={isRefreshing}
          >
            <RefreshCw size={20} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Orders'}</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={filterContainerStyle} className="scrollbar-hide">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                style={getFilterButtonStyle(isActive)}
              >
                <Icon size={16} />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Grid */}
      <div style={ordersGridStyle}>
        <div style={ordersListStyle}>
          {filteredOrders.map((order) => {
            return <OrderCard key={order.id} order={order} onMarkServed={onMarkServed} onDelete={onDeleteOrder} onUpdate={onUpdateOrder} />;
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: "#9CA3AF", fontSize: "18px", fontWeight: "500" }}>
              No orders found
            </p>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default DashboardContent;
