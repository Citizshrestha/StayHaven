import { useMemo, useState, useEffect } from "react";
import { Bell, ChefHat, CheckCircle2, ListFilter, RefreshCw } from "lucide-react";
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
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // last 60 minutes

    return orders
      .filter((o) => o.status === "delivered")
      .map((o) => ({ order: o, completedAt: getCompletionDate(o) }))
      .filter((x) => x.completedAt && now - x.completedAt.getTime() <= windowMs)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, 20)
      .map((x) => x.order);
  }, [orders]);

  const filters = [
    { id: "all", label: "All", count: activeOrders.length, Icon: ListFilter },
    { id: "new", label: "New", count: activeOrders.filter((o) => o.status === "new" || o.status === "pending").length, Icon: Bell },
    { id: "preparing", label: "Preparing", count: activeOrders.filter((o) => o.status === "preparing").length, Icon: ChefHat },
    { id: "ready", label: "Ready", count: activeOrders.filter((o) => o.status === "ready").length, Icon: CheckCircle2 },
    { id: "completed", label: "Done", count: recentlyCompleted.length, Icon: CheckCircle2 },
  ];

  const filteredOrders = (activeFilter === "all"
    ? activeOrders
    : activeFilter === "new"
    ? activeOrders.filter((order) => order.status === "new" || order.status === "pending")
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
    filterActive: "#10B981",
    filterInactive: isDarkMode ? "#334155" : "#F3F4F6",
    filterTextInactive: isDarkMode ? "#94A3B8" : "#6B7280",
  };

  return (
    <div style={{ minHeight: "100%" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-start",
        marginBottom: isMobile ? "20px" : "32px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h1 style={{ 
            fontSize: isMobile ? "24px" : "32px", 
            fontWeight: "800", 
            color: colors.text, 
            marginBottom: "8px" 
          }}>
            🍳 Kitchen Orders
          </h1>
          <p style={{ fontSize: isMobile ? "14px" : "16px", color: colors.textSecondary }}>
            Manage and track cooking orders
          </p>
        </div>
        
        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              disabled={isRefreshing}
              style={{
                padding: "10px",
                borderRadius: "12px",
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.card,
                color: colors.text,
                cursor: isRefreshing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RefreshCw 
                size={20} 
                style={{ 
                  animation: isRefreshing ? "spin 1s linear infinite" : "none" 
                }} 
              />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        display: "flex", 
        gap: isMobile ? "8px" : "12px", 
        marginBottom: isMobile ? "20px" : "32px", 
        overflowX: "auto",
        paddingBottom: "8px",
        WebkitOverflowScrolling: "touch",
      }}>
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className="filter-btn"
            style={{
              padding: isMobile ? "10px 14px" : "12px 18px",
              borderRadius: "14px",
              border: "none",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: isMobile ? "12px" : "14px",
              backgroundColor: activeFilter === filter.id ? colors.filterActive : colors.filterInactive,
              color: activeFilter === filter.id ? "white" : colors.filterTextInactive,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: isMobile ? "6px" : "10px",
              flexShrink: 0,
            }}
          >
            <filter.Icon size={isMobile ? 16 : 18} />
            <span>{filter.label}</span>
            {filter.count > 0 && (
              <span style={{
                backgroundColor: activeFilter === filter.id 
                  ? "rgba(255,255,255,0.25)" 
                  : isDarkMode ? "#475569" : "#E5E7EB",
                padding: "2px 8px",
                borderRadius: "8px",
                fontSize: isMobile ? "10px" : "11px",
                fontWeight: "800",
              }}>
                {filter.count}
              </span>
            )}
          </button>
        ))}
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
                No completed orders in the last 60 minutes
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

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DashboardContent;
