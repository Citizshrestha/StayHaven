import { useMemo } from "react";
import { Bell, ChefHat, CheckCircle2, ListFilter } from "lucide-react";
import OrderCard from "./OrderCard";

const DashboardContent = ({ orders, activeFilter, setActiveFilter, onUpdateOrderStatus }) => {
  // Kitchen only sees active orders (not delivered)
  const activeOrders = orders.filter((o) => o.status !== "delivered");

  const getCompletionDate = (order) => {
    const raw = order?.deliveredAt || order?.servedAt || order?.updatedAt;
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatCompletionTime = (order) => {
    const d = getCompletionDate(order);
    if (!d) return "";
    return d.toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    { id: "new", label: "New", count: activeOrders.filter((o) => o.status === "new").length, Icon: Bell },
    { id: "preparing", label: "Preparing", count: activeOrders.filter((o) => o.status === "preparing").length, Icon: ChefHat },
    { id: "ready", label: "Ready for Pickup", count: activeOrders.filter((o) => o.status === "ready").length, Icon: CheckCircle2 },
    { id: "completed", label: "Completed", count: recentlyCompleted.length, Icon: CheckCircle2 },
  ];

  const filteredOrders = (activeFilter === "all"
    ? activeOrders
    : activeOrders.filter((order) => order.status === activeFilter)
  ).sort((a, b) => {
    // Real orders (isReal: true) come first
    if (a.isReal && !b.isReal) return -1;
    if (!a.isReal && b.isReal) return 1;
    // If both are same type, sort by date (newest first)
    return new Date(b.placedAt) - new Date(a.placedAt);
  });

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", color: "#111827", marginBottom: "8px" }}>
          Kitchen Orders
        </h1>
        <p style={{ fontSize: "16px", color: "#6B7280" }}>
          Manage and track cooking orders
        </p>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "32px", overflowX: "auto" }}>
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            style={{
              padding: "12px 18px",
              borderRadius: "14px",
              border: "none",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "14px",
              backgroundColor: activeFilter === filter.id ? "#10B981" : "#F3F4F6",
              color: activeFilter === filter.id ? "white" : "#6B7280",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <filter.Icon size={18} />
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {activeFilter === "completed" ? (
          recentlyCompleted.length === 0 ? (
            <div style={{
              padding: "48px",
              textAlign: "center",
              backgroundColor: "white",
              borderRadius: "24px",
              border: "2px dashed #E5E7EB"
            }}>
              <p style={{ fontSize: "16px", color: "#6B7280", fontWeight: "600" }}>
                No completed orders in the last 60 minutes
              </p>
            </div>
          ) : (
            recentlyCompleted.map((order) => (
              <OrderCard
                key={order._id || order.id}
                order={order}
                onUpdateOrderStatus={onUpdateOrderStatus}
              />
            ))
          )
        ) : filteredOrders.length === 0 ? (
          <div style={{
            padding: "48px",
            textAlign: "center",
            backgroundColor: "white",
            borderRadius: "24px",
            border: "2px dashed #E5E7EB"
          }}>
            <p style={{ fontSize: "16px", color: "#6B7280", fontWeight: "600" }}>
              No {activeFilter !== "all" ? activeFilter : ""} orders
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onUpdateOrderStatus={onUpdateOrderStatus}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DashboardContent;
