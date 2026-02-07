import { useState, useEffect } from "react";
import { X, ChevronRight, Clock, User, Check } from "lucide-react";
import useRelativeTime from "../../hooks/useRelativeTime";
import OrderDetailsModal from "../WaiterDashboard/order/OrderDetailsModal";
import ItemCarousel from "../shared/ItemCarousel";

const OrderCard = ({ order, onUpdateOrderStatus, isDarkMode = false }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const placedAtRelativeTime = useRelativeTime(order?.placedAt, true);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Dark mode colors
  const colors = {
    card: isDarkMode ? "#1E293B" : "white",
    cardBorder: isDarkMode ? "#334155" : "#F3F4F6",
    text: isDarkMode ? "#F8FAFC" : "#111827",
    textSecondary: isDarkMode ? "#94A3B8" : "#6B7280",
    notesBg: isDarkMode ? "#422006" : "#FFFBEB",
    notesBorder: isDarkMode ? "#F59E0B" : "#F59E0B",
    notesText: isDarkMode ? "#FCD34D" : "#B45309",
    notesContent: isDarkMode ? "#FDE68A" : "#78350F",
  };

  const isHighPriority = (order?.priority || "").toLowerCase() === "high";

  const getCompletionDate = (o) => {
    const raw = o?.deliveredAt || o?.servedAt || o?.updatedAt;
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatCompletionTime = (o) => {
    const d = getCompletionDate(o);
    if (!d) return "";

    const now = new Date();
    const diffMs = now - d;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // More than 48 hours - show exact date and time
    if (diffHours > 48) {
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month}, ${year} at ${time}`;
    }
    // More than 24 hours - show "Yesterday at [time]"
    if (diffHours > 24) {
      return `Yesterday at ${time}`;
    }
    // Within 24 hours - show just the time
    return time;
  };

  const handleUpdateStatus = () => {
    if (order?.status === "delivered") return;
    setShowStatusModal(true);
  };

  const confirmUpdate = () => {
    const nextStatus = order.status === "new" ? "preparing" : "ready";
    setShowStatusModal(false);
    onUpdateOrderStatus(order.id, nextStatus);
  };

  // Helper function to format duration nicely
  const formatDuration = (diffMins) => {
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours < 24) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  };

  const getStatusDuration = (order) => {
    const now = new Date();

    // For "preparing" status, show how long it's been preparing
    if (order.status === "preparing" && order.startedPreparingAt) {
      const startTime = new Date(order.startedPreparingAt);
      const diffMins = Math.floor((now - startTime) / 60000);
      const duration = formatDuration(diffMins);
      return duration === "Just now" ? `Preparing - Just now` : `Preparing for ${duration}`;
    }
    // For "ready" status, show how long it's been ready
    else if (order.status === "ready" && order.readyAt) {
      const readyTime = new Date(order.readyAt);
      const diffMins = Math.floor((now - readyTime) / 60000);
      const duration = formatDuration(diffMins);
      return duration === "Just now" ? `Ready - Just now` : `Ready for ${duration}`;
    }
    // For "delivered" status, show completion time
    else if (order.status === "delivered") {
      const t = formatCompletionTime(order);
      return t ? `Served at ${t}` : "Completed";
    }
    // For "new" or other status, use relative time
    return placedAtRelativeTime;
  };

  // Helper to get items display text (supports both old string and new array format)
  const getItemsDisplay = () => {
    if (Array.isArray(order.items)) {
      return order.items.map(item => `${item.quantity}× ${item.name}`).join(", ");
    }
    return order.itemsText || order.items || "";
  };

  // Get total item count
  const getTotalItemCount = () => {
    if (Array.isArray(order.items)) {
      return order.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    return 0;
  };

  const getStatusStyles = (status) => {
    if (isDarkMode) {
      switch (status) {
        case "new":
        case "pending":
          return {
            backgroundColor: "rgba(37, 99, 235, 0.2)",
            color: "#60A5FA",
            label: "New Order"
          };
        case "preparing":
          return {
            backgroundColor: "rgba(217, 119, 6, 0.2)",
            color: "#FBBF24",
            label: "Preparing"
          };
        case "ready":
          return {
            backgroundColor: "rgba(5, 150, 105, 0.2)",
            color: "#34D399",
            label: "Ready"
          };
        case "delivered":
          return {
            backgroundColor: "rgba(5, 150, 105, 0.15)",
            color: "#6EE7B7",
            label: "Delivered",
            showCheck: true
          };
        default:
          return {
            backgroundColor: "#334155",
            color: "#94A3B8",
            label: status
          };
      }
    } else {
      switch (status) {
        case "new":
        case "pending":
          return { backgroundColor: "#DBEAFE", color: "#2563EB", label: "New Order" };
        case "preparing":
          return { backgroundColor: "#FEF3C7", color: "#D97706", label: "Preparing" };
        case "ready":
          return { backgroundColor: "#D1FAE5", color: "#059669", label: "Ready" };
        case "delivered":
          return { backgroundColor: "#D1FAE5", color: "#059669", label: "Delivered", showCheck: true };
        default:
          return { backgroundColor: "#F3F4F6", color: "#4B5563", label: status };
      }
    }
  };

const statusStyle = getStatusStyles(order.status);

const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: "24px",
  padding: isMobile ? "16px" : "24px",
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: isMobile ? "16px" : "24px",
  boxShadow: isDarkMode
    ? "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
    : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  border: `1px solid ${colors.cardBorder}`,
  transition: "all 0.2s ease",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 12px",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: "700",
  backgroundColor: statusStyle.backgroundColor,
  color: statusStyle.color,
};

const primaryButtonStyle = {
  padding: "12px 32px",
  backgroundColor: "#10B981",
  color: "white",
  borderRadius: "9999px",
  fontWeight: "700",
  fontSize: "14px",
  border: "none",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "12px 32px",
  backgroundColor: isDarkMode ? "#334155" : "#E5E7EB",
  color: isDarkMode ? "#F8FAFC" : "#374151",
  borderRadius: "9999px",
  fontWeight: "700",
  fontSize: "14px",
  border: "none",
  cursor: "pointer",
};

return (
  <div style={cardStyle} data-order-id={order._id}>
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <span style={badgeStyle}>
          {statusStyle.showCheck && <Check size={14} />}
          {statusStyle.label}
        </span>
          <span style={badgeStyle}>
            {statusStyle.showCheck && <Check size={14} />}
            {statusStyle.label}
          </span>
  {/* Item count badge */}
  {Array.isArray(order.items) && order.items.length > 1 && (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "11px",
        fontWeight: "700",
        backgroundColor: isDarkMode ? "rgba(124, 58, 237, 0.2)" : "#EDE9FE",
        color: isDarkMode ? "#A78BFA" : "#7C3AED",
      }}
    >
      🍽️ {getTotalItemCount()} items
    </span>
  )}

  {isHighPriority && (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: "8px",
        fontSize: "11px",
        fontWeight: "700",
        backgroundColor: isDarkMode ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2",
        color: isDarkMode ? "#F87171" : "#DC2626",
      }}
    >
      🔴 Urgent
    </span>
  )}

  <span style={{ color: colors.textSecondary, fontSize: "14px", fontWeight: "500" }}>
    {order.table} • {getStatusDuration(order)}
  </span>
</div>

<h3 style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "800", color: colors.text, marginBottom: "8px" }}>
  Order #{order.orderNumber || order.id?.slice?.(-5)?.toUpperCase() || order.id}
</h3>
        
        {order.customerName && (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
          }}>
            <User size={20} style={{ color: "#0284C7", flexShrink: 0 }} />
            <span style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "0.01em", color: "#0284C7" }}>
              {order.customerName}
            </span>
          </div>
        )}

<p style={{ color: colors.textSecondary, fontSize: "14px", lineHeight: "1.5", marginBottom: "24px" }}>
  {getItemsDisplay()}
</p>

{/* Show special notes if any items have notes */}
{Array.isArray(order.items) && order.items.some(item => item.notes) && (
  <div
    style={{
      marginBottom: "16px",
      padding: "10px 14px",
      backgroundColor: colors.notesBg,
      borderRadius: "10px",
      borderLeft: `3px solid ${colors.notesBorder}`,
      maxWidth: "360px",
    }}
  >
    <div
      style={{
        fontSize: "11px",
        fontWeight: "700",
        color: colors.notesText,
        marginBottom: "6px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      📝 Special Instructions
    </div>
    {order.items.filter(item => item.notes).map(item => (
      <div
        key={item.id}
        style={{
          fontSize: "12px",
          color: colors.notesContent,
          marginBottom: "3px",
          lineHeight: "1.4",
        }}
      >
        <span style={{ fontWeight: "600" }}>{item.name}:</span>
        {" "}
        <span style={{ color: colors.notesContent }}>{item.notes}</span>
      </div>
    ))}
  </div>
)}

{order.status === "delivered" ? (
  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
    <div
      style={{
        padding: "12px 16px",
        backgroundColor: isDarkMode ? "rgba(5, 150, 105, 0.15)" : "#D1FAE5",
        borderRadius: "12px",
        border: `1px solid ${isDarkMode ? "rgba(5, 150, 105, 0.3)" : "#A7F3D0"}`,
        minWidth: "220px",
      }}
    >
      <div
        style={{
          fontSize: "16px",
          fontWeight: "800",
          color: isDarkMode ? "#6EE7B7" : "#059669",
          marginBottom: "4px",
        }}
      >
        ✓ Order Completed
      </div>
      <div style={{ fontSize: "13px", fontWeight: "700", color: colors.textSecondary }}>
        {(() => {
          const t = formatCompletionTime(order);
          return t ? `Served at ${t}` : "Completed";
        })()}
      </div>
    </div>
    <button
      onClick={() => setShowDetailsModal(true)}
      style={secondaryButtonStyle}
    >
      View Details
    </button>
  </div>
) : order.status === "ready" ? (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 20px",
      backgroundColor: isDarkMode ? "rgba(5, 150, 105, 0.15)" : "#D1FAE5",
      borderRadius: "9999px",
      border: `1px solid ${isDarkMode ? "rgba(5, 150, 105, 0.3)" : "#A7F3D0"}`,
    }}
  >
    <span
      style={{
        fontSize: "14px",
        fontWeight: "700",
        color: isDarkMode ? "#6EE7B7" : "#059669",
      }}
    >
      ✓ Ready for Pickup
    </span>
    <span
      style={{
        fontSize: "12px",
        color: isDarkMode ? "#94A3B8" : "#6B7280",
        padding: "2px 8px",
        backgroundColor: isDarkMode ? "#334155" : "white",
        borderRadius: "9999px",
      }}
    >
      Awaiting waiter
    </span>
  </div>
) : (
  <button onClick={handleUpdateStatus} style={primaryButtonStyle}>
    {order.status === "new" ? "Accept & Start Cooking" : "Mark as Ready"}
  </button>
)}
      </div>

      {/* Right side - Image Carousel */}
      {!isMobile && (
        <div style={{ width: "280px", flexShrink: 0 }}>
          {Array.isArray(order.items) && order.items.length > 0 ? (
            <ItemCarousel items={order.items} width={280} height={200} />
          ) : order.image ? (
            <img
              src={order.image}
              alt="Food"
              style={{
                width: "100%",
                height: "200px",
                objectFit: "cover",
                borderRadius: "16px",
              }}
            />
          ) : null}
        </div>
      )}

      {showStatusModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowStatusModal(false)}
        >
          <div
            style={{
              backgroundColor: colors.card,
              borderRadius: "24px",
              maxWidth: "500px",
              width: "90%",
              padding: "24px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowStatusModal(false)}
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: colors.textSecondary,
              }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px", color: colors.text }}>
              Update Order Status
            </h2>
            <p style={{ color: colors.textSecondary, marginBottom: "32px", fontSize: "14px" }}>
              Order #{order.orderNumber || order.id?.slice?.(-5)?.toUpperCase() || order.id}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                marginBottom: "32px",
                padding: "24px",
                backgroundColor: isDarkMode ? "#334155" : "#F9FAFB",
                borderRadius: "16px",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "700",
                    backgroundColor: statusStyle.backgroundColor,
                    color: statusStyle.color,
                    marginBottom: "8px",
                  }}
                >
                  {statusStyle.label}
                </div>
                <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500" }}>
                  Current
                </div>
              </div>

              <ChevronRight size={24} style={{ color: colors.textSecondary }} />

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "700",
                    backgroundColor: order.status === "new" ? "#FEF3C7" : "#D1FAE5",
                    color: order.status === "new" ? "#D97706" : "#059669",
                    marginBottom: "8px",
                  }}
                >
                  {order.status === "new" ? "Cooking" : "Ready"}
                </div>
                <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500" }}>
                  Next
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "12px",
                  backgroundColor: colors.card,
                  color: colors.text,
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdate}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  borderRadius: "12px",
                  backgroundColor: "#10B981",
                  color: "white",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <OrderDetailsModal order={order} onClose={() => setShowDetailsModal(false)} isDarkMode={isDarkMode} />
      )}
    </div>
  );
};

export default OrderCard;
