import { useState } from "react";
import { X, ChevronRight, Clock, User } from "lucide-react";
import ItemCarousel from "../shared/ItemCarousel";

const OrderCard = ({ order, onUpdateOrderStatus }) => {
  const [showStatusModal, setShowStatusModal] = useState(false);

  const handleUpdateStatus = () => {
    setShowStatusModal(true);
  };

  const confirmUpdate = () => {
    const nextStatus = order.status === "new" ? "preparing" : "ready";
    setShowStatusModal(false);
    onUpdateOrderStatus(order.id, nextStatus);
  };

  const getStatusDuration = (order) => {
    const now = new Date();
    
    if (order.status === "preparing" && order.startedPreparingAt) {
      const startTime = new Date(order.startedPreparingAt);
      const diffMins = Math.floor((now - startTime) / 60000);
      return diffMins === 0 ? `Preparing - Just now` : `Preparing for ${diffMins}m`;
    } else if (order.status === "ready" && order.readyAt) {
      const readyTime = new Date(order.readyAt);
      const diffMins = Math.floor((now - readyTime) / 60000);
      return diffMins === 0 ? `Ready - Just now` : `Ready for ${diffMins}m`;
    }
    
    const placedTime = new Date(order.placedAt);
    const diffMins = Math.floor((now - placedTime) / 60000);
    return diffMins === 0 ? "Just now" : `${diffMins}m ago`;
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
    switch (status) {
      case "new":
        return { backgroundColor: "#DBEAFE", color: "#2563EB", label: "New Order" };
      case "preparing":
        return { backgroundColor: "#FEF3C7", color: "#D97706", label: "Preparing" };
      case "ready":
        return { backgroundColor: "#D1FAE5", color: "#059669", label: "Ready" };
      default:
        return { backgroundColor: "#F3F4F6", color: "#4B5563", label: status };
    }
  };

  const statusStyle = getStatusStyles(order.status);

  const cardStyle = {
    backgroundColor: "white",
    borderRadius: "24px",
    padding: "24px",
    display: "flex",
    flexDirection: "row",
    gap: "24px",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    border: "1px solid #F3F4F6",
  };

  const badgeStyle = {
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

  return (
    <div style={cardStyle}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={badgeStyle}>{statusStyle.label}</span>
          {/* Item count badge */}
          {Array.isArray(order.items) && order.items.length > 1 && (
            <span style={{
              padding: "4px 10px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: "700",
              backgroundColor: "#EDE9FE",
              color: "#7C3AED",
            }}>
              🍽️ {getTotalItemCount()} items
            </span>
          )}
          {(() => {
            const now = new Date();
            const placedTime = new Date(order.placedAt);
            const diffMins = Math.floor((now - placedTime) / 60000);
            if (diffMins > 30 && order.status !== "ready") {
              return (
                <span style={{
                  padding: "4px 12px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: "700",
                  backgroundColor: "#FEE2E2",
                  color: "#DC2626",
                }}>
                  ⚠ Urgent
                </span>
              );
            }
          })()}
          <span style={{ color: "#6B7280", fontSize: "14px", fontWeight: "500" }}>
            {order.table} • {getStatusDuration(order)}
          </span>
        </div>

        <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#111827", marginBottom: "8px" }}>
          Order #{order.id}
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

        <p style={{ color: "#6B7280", fontSize: "14px", lineHeight: "1.5", marginBottom: "24px" }}>
          {getItemsDisplay()}
        </p>

        {/* Show special notes if any items have notes */}
        {Array.isArray(order.items) && order.items.some(item => item.notes) && (
          <div style={{
            marginBottom: "16px",
            padding: "10px 14px",
            backgroundColor: "#FFFBEB",
            borderRadius: "10px",
            borderLeft: "3px solid #F59E0B",
            maxWidth: "360px",
          }}>
            <div style={{ 
              fontSize: "11px", 
              fontWeight: "700", 
              color: "#B45309", 
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              📝 Special Instructions
            </div>
            {order.items.filter(item => item.notes).map(item => (
              <div key={item.id} style={{ 
                fontSize: "12px", 
                color: "#78350F",
                marginBottom: "3px",
                lineHeight: "1.4",
              }}>
                <span style={{ fontWeight: "600" }}>{item.name}:</span>{" "}
                <span style={{ color: "#92400E" }}>{item.notes}</span>
              </div>
            ))}
          </div>
        )}

        {order.status !== "ready" && (
          <button onClick={handleUpdateStatus} style={primaryButtonStyle}>
            {order.status === "new" ? "Accept & Start Cooking" : "Mark as Ready"}
          </button>
        )}
        
        {order.status === "ready" && (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            backgroundColor: "#D1FAE5",
            borderRadius: "9999px",
            border: "1px solid #A7F3D0",
          }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#059669" }}>
              ✓ Ready for Pickup
            </span>
            <span style={{ 
              fontSize: "12px", 
              color: "#6B7280",
              padding: "2px 8px",
              backgroundColor: "white",
              borderRadius: "9999px",
            }}>
              Awaiting waiter
            </span>
          </div>
        )}
      </div>

      {/* Right side - Image Carousel */}
      <div style={{ width: "280px", flexShrink: 0 }}>
        {Array.isArray(order.items) && order.items.length > 0 ? (
          <ItemCarousel items={order.items} width={280} height={200} />
        ) : (
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
        )}
      </div>

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
              backgroundColor: "white",
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
                color: "#6B7280",
              }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px", color: "#111827" }}>
              Update Order Status
            </h2>
            <p style={{ color: "#6B7280", marginBottom: "32px", fontSize: "14px" }}>
              Order #{order.id}
            </p>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              marginBottom: "32px",
              padding: "24px",
              backgroundColor: "#F9FAFB",
              borderRadius: "16px",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "700",
                  backgroundColor: statusStyle.backgroundColor,
                  color: statusStyle.color,
                  marginBottom: "8px",
                }}>
                  {statusStyle.label}
                </div>
                <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: "500" }}>
                  Current
                </div>
              </div>

              <ChevronRight size={24} style={{ color: "#9CA3AF" }} />

              <div style={{ textAlign: "center" }}>
                <div style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "700",
                  backgroundColor: order.status === "new" ? "#FEF3C7" : "#D1FAE5",
                  color: order.status === "new" ? "#D97706" : "#059669",
                  marginBottom: "8px",
                }}>
                  {order.status === "new" ? "Cooking" : "Ready"}
                </div>
                <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: "500" }}>
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
                  border: "1px solid #E5E7EB",
                  borderRadius: "12px",
                  backgroundColor: "white",
                  color: "#374151",
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
    </div>
  );
};

export default OrderCard;
