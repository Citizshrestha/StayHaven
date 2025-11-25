import {
  RefreshCw,
  List,
  Bell as BellIcon,
  ChefHat,
  CheckCircle,
} from "lucide-react";
import OrderCard from "./order/OrderCard";

const DashboardContent = ({ orders, activeFilter, setActiveFilter, onMarkServed }) => {
  const filteredOrders =
    activeFilter === "all"
      ? orders
      : orders.filter((order) => order.status === activeFilter);

  const handleRefresh = () => {
    console.log("Refreshing orders...");
  };

  const filters = [
    { id: "all", label: "All", icon: List },
    { id: "new", label: "New", icon: BellIcon },
    { id: "preparing", label: "Preparing", icon: ChefHat },
    { id: "ready", label: "Ready for Pickup", icon: CheckCircle },
    { id: "completed", label: "Completed", icon: CheckCircle },
  ];

  // Inline Styles
  const containerStyle = {
    // width: "100%", // Removed to prevent overflow issues
    minHeight: "100%", // Allow it to fill the scrolling container
    paddingBottom: "6rem",
    backgroundColor: "#F8F9FB", 
    fontFamily: "'Nunito', sans-serif",
  };

  const headerContainerStyle = {
    position: "sticky",
    top: 0,
    zIndex: 20,
    backgroundColor: "#F8F9FB", // Match background
    padding: "32px 48px 24px 48px", // Increased side padding for better aesthetics
  };

  const titleSectionStyle = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "32px",
  };

  const titleStyle = {
    fontSize: "40px",
    fontWeight: "800",
    color: "#111827",
    marginBottom: "8px",
    letterSpacing: "-0.025em",
    lineHeight: "1.1",
  };

  const subtitleStyle = {
    fontSize: "18px",
    color: "#6B7280",
    fontWeight: "500",
  };

  const refreshButtonStyle = {
    padding: "12px 24px",
    backgroundColor: "#10B981", // Emerald-500
    color: "white",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "background-color 0.2s",
    border: "none",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
    boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 2px 4px -1px rgba(16, 185, 129, 0.06)",
  };

  const filterContainerStyle = {
    display: "flex",
    gap: "12px",
    overflowX: "auto",
    paddingBottom: "8px",
  };

  const getFilterButtonStyle = (isActive) => ({
    padding: "12px 24px",
    borderRadius: "12px",
    fontWeight: "700",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
    border: "none",
    cursor: "pointer",
    backgroundColor: isActive ? "#D1FAE5" : "white",
    color: isActive ? "#059669" : "#6B7280",
    boxShadow: isActive ? "none" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  });

  const ordersGridStyle = {
    padding: "0 48px 48px 48px", // Increased side padding
  };

  const ordersListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  };

  return (
    <div style={containerStyle}>
      {/* Header Section - Sticky */}
      <div style={headerContainerStyle}>
        {/* Title + Refresh Button */}
        <div style={titleSectionStyle}>
          <div>
            <h1 style={titleStyle}>Waiter Dashboard</h1>
            <p style={subtitleStyle}>Real-time view of orders and table statuses.</p>
          </div>

          {/* Refresh Button */}
          <button onClick={handleRefresh} style={refreshButtonStyle}>
            <RefreshCw size={20} />
            <span>Refresh Orders</span>
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
            return <OrderCard key={order.id} order={order} onMarkServed={onMarkServed} />;
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
    </div>
  );
};

export default DashboardContent;
