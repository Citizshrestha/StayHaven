import { useState } from "react";
import { X, ChevronRight, Clock, MapPin, User } from "lucide-react";

const OrderCard = ({ order, onUpdateOrderStatus, onMarkServed }) => {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleUpdateStatus = () => {
    setShowStatusModal(true);
  };

  const handleViewDetails = () => {
    setShowDetailsModal(true);
  };

  const handleMarkServed = () => {
    onMarkServed(order.id);
  };

  const confirmUpdate = () => {
    const nextStatus = order.status === "new" ? "preparing" : "ready";
    setShowStatusModal(false);
    onUpdateOrderStatus(order.id, nextStatus)
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "new":
        return {
          backgroundColor: "#DBEAFE",
          color: "#2563EB",
          label: "New",
        };
      case "preparing":
        return {
          backgroundColor: "#FEF3C7",
          color: "#D97706",
          label: "Preparing",
        };
      case "ready":
        return {
          backgroundColor: "#D1FAE5",
          color: "#059669",
          label: "Ready for Pickup",
        };
      default:
        return {
          backgroundColor: "#F3F4F6",
          color: "#4B5563",
          label: status,
        };
    }
  };

  const statusStyle = getStatusStyles(order.status);

  // Inline Styles
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

  const contentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  };

  const badgeStyle = {
    padding: "4px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    backgroundColor: statusStyle.backgroundColor,
    color: statusStyle.color,
  };

  const metaStyle = {
    color: "#6B7280",
    fontSize: "14px",
    fontWeight: "500",
  };

  const titleStyle = {
    fontSize: "24px",
    fontWeight: "800",
    color: "#111827",
    marginBottom: "8px",
    lineHeight: "1.2",
  };

  const itemsStyle = {
    color: "#6B7280",
    fontSize: "14px",
    lineHeight: "1.5",
    marginBottom: "24px",
    flex: 1,
  };

  const buttonsContainerStyle = {
    marginTop: "auto",
    display: "flex",
    gap: "12px",
  };

  const primaryButtonStyle = {
    flex: 1,
    padding: "12px 24px",
    backgroundColor: "#10B981",
    color: "white",
    borderRadius: "9999px",
    fontWeight: "700",
    fontSize: "14px",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s",
    textAlign: "center",
  };

  const secondaryButtonStyle = {
    flex: 1,
    padding: "12px 24px",
    backgroundColor: "#E5E7EB",
    color: "#374151",
    borderRadius: "9999px",
    fontWeight: "700",
    fontSize: "14px",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s",
    textAlign: "center",
  };

  const standaloneButtonStyle = {
    width: "400px",
    padding: "12px 24px",
    backgroundColor: "#10B981",
    color: "white",
    borderRadius: "9999px",
    fontWeight: "700",
    fontSize: "15px",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s",
    textAlign: "center",
  };

  const imageContainerStyle = {
    width: "240px",
    flexShrink: 0,
  };

  const imageStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "16px",
    aspectRatio: "4/3",
  };

  return (
    <div style={cardStyle}>
      {/* Left Content */}
      <div style={contentStyle}>
        <div style={headerStyle}>
          <span style={badgeStyle}>{statusStyle.label}</span>
          <span style={metaStyle}>
            {order.table} - {order.time}
          </span>
        </div>

        <h3 style={titleStyle}>Order #{order.id}</h3>
        <p style={itemsStyle}>{order.items}</p>

        <div style={buttonsContainerStyle}>
          {order.status === "ready" ? (
            <>
              <button onClick={handleViewDetails} style={secondaryButtonStyle}>
                View Details
              </button>
              <button onClick={handleMarkServed} style={primaryButtonStyle}>
                Mark Served
              </button>
            </>
          ) : (
            <button onClick={handleUpdateStatus} style={standaloneButtonStyle}>
              Update Status
            </button>
          )}
        </div>
      </div>

      {/* Right Image */}
      <div style={imageContainerStyle}>
        <img src={order.image} alt="Food" style={imageStyle} />
      </div>

      {/* Status Update Modal */}
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

            <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px" }}>
              Update Order Status
            </h2>
            <p style={{ fontSize: "15px", color: "#6B7280", marginBottom: "24px" }}>
              Order #{order.id}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                padding: "24px",
                backgroundColor: "#F9FAFB",
                borderRadius: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "700",
                  backgroundColor: "#FEF3C7",
                  color: "#D97706",
                }}
              >
                {order.status === "new" ? "New" : "Preparing"}
              </div>
              <ChevronRight size={24} style={{ color: "#9CA3AF" }} />
              <div
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "700",
                  backgroundColor: "#D1FAE5",
                  color: "#059669",
                }}
              >
                {order.status === "new" ? "Preparing" : "Ready"}
              </div>
            </div>

            <p style={{ fontSize: "15px", color: "#6B7280", marginBottom: "24px" }}>
              Are you sure you want to update this order?
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowStatusModal(false)}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  backgroundColor: "#E5E7EB",
                  color: "#374151",
                  borderRadius: "12px",
                  fontWeight: "700",
                  fontSize: "15px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdate}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  backgroundColor: "#10B981",
                  color: "white",
                  borderRadius: "12px",
                  fontWeight: "700",
                  fontSize: "15px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && (
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
            padding: "20px",
          }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "24px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #F3F4F6",
                position: "sticky",
                top: 0,
                backgroundColor: "white",
                borderTopLeftRadius: "24px",
                borderTopRightRadius: "24px",
              }}
            >
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  position: "absolute",
                  top: "24px",
                  right: "24px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#6B7280",
                  padding: "8px",
                  borderRadius: "50%",
                }}
              >
                <X size={24} />
              </button>
              <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px" }}>
                Order #{order.id}
              </h2>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  backgroundColor: statusStyle.backgroundColor,
                  color: statusStyle.color,
                }}
              >
                {statusStyle.label}
              </span>
            </div>

            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "24px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "12px",
                  }}
                >
                  Order Information
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                    padding: "12px",
                    backgroundColor: "#F9FAFB",
                    borderRadius: "12px",
                  }}
                >
                  <MapPin size={20} style={{ color: "#10B981", flexShrink: 0 }} />
                  <span style={{ fontSize: "15px", fontWeight: "600" }}>
                    {order.table}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                    padding: "12px",
                    backgroundColor: "#F9FAFB",
                    borderRadius: "12px",
                  }}
                >
                  <Clock size={20} style={{ color: "#10B981", flexShrink: 0 }} />
                  <span style={{ fontSize: "15px", fontWeight: "600" }}>
                    Placed {order.time}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    backgroundColor: "#F9FAFB",
                    borderRadius: "12px",
                  }}
                >
                  <User size={20} style={{ color: "#10B981", flexShrink: 0 }} />
                  <span style={{ fontSize: "15px", fontWeight: "600" }}>
                    Assigned to: Alex Miller
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "12px",
                  }}
                >
                  Order Items
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {order.items.split(", ").map((item, index) => (
                    <li
                      key={index}
                      style={{
                        padding: "12px",
                        backgroundColor: "#F9FAFB",
                        borderRadius: "12px",
                        marginBottom: "8px",
                        fontSize: "15px",
                        fontWeight: "600",
                      }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "12px",
                  }}
                >
                  Order Image
                </h3>
                <img
                  src={order.image}
                  alt="Order"
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "16px",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;