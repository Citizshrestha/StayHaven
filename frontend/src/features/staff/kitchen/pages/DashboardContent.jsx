import { useMemo, useState, useEffect } from "react";
import { LayoutGrid, Bell, ChefHat, CheckCircle, Clock, RefreshCw } from "lucide-react";
import OrderCard from "./OrderCard";
import "./KitchenDashboard.css";

const DashboardContent = ({
  orders,
  activeFilter,
  setActiveFilter,
  onUpdateOrderStatus,
  onRefresh,
  isRefreshing,
  isDarkMode = true,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Kitchen only sees active orders (not delivered)
  const activeOrders = orders.filter((o) => o.status !== "delivered");

  const getCompletionDate = (order) => {
    const raw = order?.deliveredAt || order?.servedAt || order?.updatedAt;
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const recentlyCompleted = useMemo(() => {
    // Show all completed orders, not just from the last 60 minutes
    return orders
      .filter((o) => o.status === "delivered")
      .map((o) => ({ order: o, completedAt: getCompletionDate(o) }))
      .filter((x) => x.completedAt) // Only filter out orders without completion date
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, 50) // Show up to 50 completed orders
      .map((x) => x.order);
  }, [orders]);

  const filters = [
    {
      id: "all",
      label: "All",
      count: activeOrders.length,
      Icon: LayoutGrid,
      activeColor: "#6c63ff",
      activeBg: "#6c63ff",
    },
    {
      id: "new",
      label: "New",
      count: activeOrders.filter((o) => o.status === "new" || o.status === "pending").length,
      Icon: Bell,
      activeColor: "#f59e0b",
      activeBg: "#f59e0b",
    },
    {
      id: "preparing",
      label: "Cooking",
      count: activeOrders.filter((o) => o.status === "preparing").length,
      Icon: ChefHat,
      activeColor: "#3b82f6",
      activeBg: "#3b82f6",
    },
    {
      id: "ready",
      label: "Ready",
      count: activeOrders.filter((o) => o.status === "ready").length,
      Icon: CheckCircle,
      activeColor: "#10b981",
      activeBg: "#10b981",
    },
    {
      id: "completed",
      label: "Done",
      count: recentlyCompleted.length,
      Icon: Clock,
      activeColor: "#ffffff",
      activeBg: "#10b981",
    },
  ];

  const filteredOrders = (activeFilter === "all"
    ? activeOrders
    : activeFilter === "new"
    ? activeOrders.filter((order) => order.status === "new" || order.status === "pending")
    : activeFilter === "completed"
    ? []
    : activeOrders.filter((order) => order.status === activeFilter)
  ).sort((a, b) => {
    if (a.isReal && !b.isReal) return -1;
    if (!a.isReal && b.isReal) return 1;
    return new Date(b.placedAt) - new Date(a.placedAt);
  });

  // Dynamic styles based on dark mode
  const colors = {
    bg: isDarkMode ? "#0F172A" : "#F8F9FB",
    card: isDarkMode ? "#1E293B" : "white",
    text: isDarkMode ? "#F8FAFC" : "#111827",
    textSecondary: isDarkMode ? "#94A3B8" : "#6B7280",
    border: isDarkMode ? "#334155" : "#E5E7EB",
  };

  return (
    <div style={{ minHeight: "100%" }}>
      {/* Header Area */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "24px",
      }}>
        {/* Filter Tabs - Redesigned */}
        <div style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          paddingLeft: "16px",
          paddingRight: isMobile ? "16px" : "8px",
          marginLeft: "-16px",
          marginRight: isMobile ? "-16px" : "0",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          flex: 1,
        }}>
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              style={{
                padding: "7px 14px",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "13px",
                backgroundColor: isActive ? filter.activeBg : (isDarkMode ? "#1E293B" : "white"),
                color: isActive ? "white" : "#64748b",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                flexShrink: 0,
                boxShadow: isActive
                  ? `0 4px 12px ${filter.activeColor}4D`
                  : "none",
                border: isActive ? "none" : `1px solid ${isDarkMode ? "#334155" : "#E5E7EB"}`,
              }}
            >
              <filter.Icon size={14} />
              <span>{filter.label}</span>
              {filter.count > 0 && (
                <span style={{
                  backgroundColor: isActive
                    ? "rgba(255,255,255,0.25)"
                    : "#e2e8f0",
                  color: isActive ? "white" : "#64748b",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: "700",
                  minWidth: "20px",
                  textAlign: "center",
                }}>
                  {filter.count}
                </span>
              )}
            </button>
          );
        })}
        </div>

        {/* Desktop Refresh Button */}
        {!isMobile && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "20px",
              backgroundColor: isDarkMode ? "#1E293B" : "white",
              color: colors.text,
              border: `1px solid ${colors.border}`,
              cursor: isRefreshing ? "not-allowed" : "pointer",
              opacity: isRefreshing ? 0.7 : 1,
              fontWeight: "500",
              fontSize: "13px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              flexShrink: 0,
            }}
          >
            <RefreshCw 
              size={14} 
              className={isRefreshing ? "animate-spin" : ""}
            />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Order Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(400px, 1fr))",
        gap: isMobile ? "12px" : "16px",
      }}>
        {activeFilter === "completed" ? (
          recentlyCompleted.length === 0 ? (
            <div style={{
              padding: isMobile ? "32px 20px" : "48px",
              textAlign: "center",
              backgroundColor: colors.card,
              borderRadius: "24px",
              border: `2px dashed ${colors.border}`,
              gridColumn: "1 / -1",
            }}>
              <p style={{ fontSize: "16px", color: colors.textSecondary, fontWeight: "600" }}>
                No completed orders yet
              </p>
            </div>
          ) : (
            recentlyCompleted.map((order) => (
              <OrderCard
                key={order._id || order.id}
                order={order}
                onUpdateOrderStatus={onUpdateOrderStatus}
                isDarkMode={isDarkMode}
              />
            ))
          )
        ) : filteredOrders.length === 0 ? (
          <div style={{
            padding: isMobile ? "32px 20px" : "48px",
            textAlign: "center",
            backgroundColor: colors.card,
            borderRadius: "24px",
            border: `2px dashed ${colors.border}`,
            gridColumn: "1 / -1",
          }}>
            <p style={{ fontSize: "16px", color: colors.textSecondary, fontWeight: "600" }}>
              No {activeFilter !== "all" ? activeFilter : ""} orders
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order._id || order.id}
              order={order}
              onUpdateOrderStatus={onUpdateOrderStatus}
              isDarkMode={isDarkMode}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DashboardContent;
