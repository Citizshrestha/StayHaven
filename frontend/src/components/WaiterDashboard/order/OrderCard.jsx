import { useState } from "react";
import { X, Clock, MapPin, User } from "lucide-react";

const OrderCard = ({ order, onMarkServed }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleViewDetails = () => {
    setShowDetailsModal(true);
  };

  const handleMarkServed = () => {
    onMarkServed(order.id);
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
    } else if (order.status === "completed" && order.servedAt) {
      return `Completed at ${order.servedAt}`;
    }
    return order.time;
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
      case "completed":
        return {
          backgroundColor: "#E5E7EB",
          color: "#6B7280",
          label: "Completed ✓",
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
          {(() => {
            const now = new Date();
            const placedTime = new Date(order.placedAt);
            const diffMins = Math.floor((now - placedTime) / 60000);

            if (diffMins > 30 && order.status !== "completed") {
              return (
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: "700",
                    backgroundColor: "#FEE2E2",
                    color: "#DC2626",
                  }}
                >
                  ⚠ Delayed
                </span>
              );
            }
            return null;
          })()}
          <span style={metaStyle}>
            {order.table} - {getStatusDuration(order)}
          </span>
        </div>

        <h3 style={titleStyle}>Order #{order.id}</h3>
        {order.customerName && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
             
            }}
          >
            <User size={20} style={{ color: "#0284C7", flexShrink: 0 }} />
            <span
              style={{ 
                fontSize: "16px", 
                fontWeight: "800", 
                letterSpacing: "0.01em",
                color: "#0284C7"
              }}
            >
              {order.customerName}
            </span>
          </div>
        )}
        <p style={itemsStyle}>{order.items}</p>

        <div style={buttonsContainerStyle}>
          {order.status === "completed" ? (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#D1FAE5",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#059669",
                  marginBottom: "4px",
                }}
              >
                ✓ Order Completed
              </div>
              <div style={{ fontSize: "14px", color: "#6B7280" }}>
                Served at {order.servedAt}
              </div>
            </div>
          ) : order.status === "ready" ? (
            <>
              <button onClick={handleViewDetails} style={secondaryButtonStyle}>
                View Details
              </button>
              <button onClick={handleMarkServed} style={primaryButtonStyle}>
                Mark Served
              </button>
            </>
          ) : (
            <>
              <button onClick={handleViewDetails} style={standaloneButtonStyle}>
                View Details
              </button>
              <div style={{
                marginTop: "8px",
                padding: "8px 12px",
                backgroundColor: "#FEF3C7",
                borderRadius: "8px",
                textAlign: "center",
                fontSize: "13px",
                color: "#92400E",
                fontWeight: "600"
              }}>
                {order.status === "new" ? "⏳ Waiting for kitchen to accept" : "👨‍🍳 Being prepared in kitchen"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Image */}
      <div style={imageContainerStyle}>
        <img src={order.image} alt="Food" style={imageStyle} />
      </div>

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
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  marginBottom: "8px",
                }}
              >
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
                  <MapPin
                    size={20}
                    style={{ color: "#10B981", flexShrink: 0 }}
                  />
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
                  <Clock
                    size={20}
                    style={{ color: "#10B981", flexShrink: 0 }}
                  />
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

              {/* Order Timeline */}
              {order.statusHistory && order.statusHistory.length > 0 && (
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
                    Order Timeline
                  </h3>

                  {/* Map through status history */}
                  <div style={{ position: "relative", paddingLeft: "24px" }}>
                    {/*  Vertical timeline line */}
                    <div
                      style={{
                        position: "absolute",
                        left: "7px",
                        top: "8px",
                        bottom: "8px",
                        width: "2px",
                        backgroundColor: "#E5E7EB",
                      }}
                    />

                    {/*  Timeline entries */}
                    {order.statusHistory.map((entry, index) => (
                      <div
                        key={index}
                        style={{
                          position: "relative",
                          marginBottom: "16px",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                        }}
                      >
                        {/*Timeline dot */}
                        <div
                          style={{
                            position: "absolute",
                            left: "-20px",
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            backgroundColor: "#10B981",
                            border: "3px solid white",
                            boxShadow: "0 0 0 1px #E5E7EB",
                          }}
                        />

                        {/* TODO: Timeline content */}
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "#111827",
                            }}
                          >
                            {entry.status.charAt(0).toUpperCase() +
                              entry.status.slice(1)}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6B7280" }}>
                            {entry.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;
