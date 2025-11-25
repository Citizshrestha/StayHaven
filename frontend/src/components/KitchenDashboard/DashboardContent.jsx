import OrderCard from "./OrderCard";

const DashboardContent = ({ orders, activeFilter, setActiveFilter, onUpdateOrderStatus }) => {
  const filters = [
    { id: "all", label: "All Orders", count: orders.length },
    { id: "new", label: "New", count: orders.filter((o) => o.status === "new").length },
    { id: "preparing", label: "Preparing", count: orders.filter((o) => o.status === "preparing").length },
    { id: "ready", label: "Ready", count: orders.filter((o) => o.status === "ready").length },
  ];

  const filteredOrders = activeFilter === "all" 
    ? orders.filter(o => o.status !== "completed")
    : orders.filter((order) => order.status === activeFilter);

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
              padding: "12px 24px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "14px",
              backgroundColor: activeFilter === filter.id ? "#10B981" : "#F3F4F6",
              color: activeFilter === filter.id ? "white" : "#6B7280",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filteredOrders.length === 0 ? (
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
