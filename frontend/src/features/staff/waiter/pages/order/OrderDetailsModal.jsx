import { X, Clock, MapPin, User, Check } from "lucide-react";
import ItemCarousel from "../../../../../components/shared/ItemCarousel";

const OrderDetailsModal = ({ order, onClose, isDarkMode = false }) => {
  if (!order) return null;

  // Theme colors
  const colors = {
    bg: isDarkMode ? "#1E293B" : "white",
    text: isDarkMode ? "#F8FAFC" : "#111827",
    textSecondary: isDarkMode ? "#94A3B8" : "#6B7280",
    border: isDarkMode ? "#334155" : "#F3F4F6",
    cardBg: isDarkMode ? "#334155" : "#F9FAFB",
    accent: "#10B981",
  };

  const itemsArray = Array.isArray(order.items)
    ? order.items
    : typeof order.items === "string"
      ? order.items.split(", ").map((name, index) => ({ id: index, name, quantity: 1 }))
      : typeof order.itemsText === "string"
        ? order.itemsText.split(", ").map((name, index) => ({ id: index, name, quantity: 1 }))
        : [];

  const overlayStyle = {
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
    padding: "16px",
  };

  const modalStyle = {
    backgroundColor: colors.bg,
    borderRadius: "24px",
    maxWidth: "600px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "hidden",
    position: "relative",
    boxShadow: isDarkMode
      ? "0 20px 25px -5px rgba(0, 0, 0, 0.4)"
      : "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    border: isDarkMode ? `1px solid ${colors.border}` : "none",
  };

  const headerStyle = {
    padding: "20px",
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.bg,
    zIndex: 10,
    borderTopLeftRadius: "24px",
    borderTopRightRadius: "24px",
    flexShrink: 0,
  };

  const closeButtonStyle = {
    position: "absolute",
    top: "20px",
    right: "20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: colors.textSecondary,
    padding: "8px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const titleStyle = {
    fontSize: "20px",
    fontWeight: "800",
    color: colors.text,
    marginBottom: "8px",
    paddingRight: "40px",
  };

  const bodyStyle = {
    padding: "20px",
    overflowY: "auto",
    flex: 1,
    backgroundColor: colors.bg,
  };

  const sectionStyle = {
    marginBottom: "24px",
  };

  const sectionTitleStyle = {
    fontSize: "12px",
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "12px",
  };

  const infoRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
    padding: "12px",
    backgroundColor: colors.cardBg,
    borderRadius: "12px",
  };

  const iconStyle = {
    color: "#10B981",
    flexShrink: 0,
  };

  const infoTextStyle = {
    fontSize: "14px",
    color: colors.text,
    fontWeight: "600",
  };

  const itemsListStyle = {
    listStyle: "none",
    padding: 0,
    margin: 0,
  };

  const itemStyle = {
    padding: "12px",
    backgroundColor: colors.cardBg,
    borderRadius: "12px",
    marginBottom: "8px",
    fontSize: "14px",
    color: colors.text,
    fontWeight: "600",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  };

  const specialInstructionsStyle = {
    fontSize: "12px",
    color: isDarkMode ? "#FCD34D" : "#D97706",
    backgroundColor: isDarkMode ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
    padding: "6px 10px",
    borderRadius: "8px",
    marginTop: "6px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    wordWrap: "break-word",
    overflowWrap: "break-word",
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "new":
        return {
          backgroundColor: isDarkMode ? "rgba(37, 99, 235, 0.2)" : "#DBEAFE",
          color: isDarkMode ? "#60A5FA" : "#2563EB",
          label: "New"
        };
      case "preparing":
        return {
          backgroundColor: isDarkMode ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
          color: isDarkMode ? "#FBBF24" : "#D97706",
          label: "Preparing",
        };
      case "ready":
        return {
          backgroundColor: isDarkMode ? "rgba(5, 150, 105, 0.2)" : "#D1FAE5",
          color: isDarkMode ? "#34D399" : "#059669",
          label: "Ready for Pickup",
        };
      case "delivered":
        return {
          backgroundColor: isDarkMode ? "rgba(5, 150, 105, 0.2)" : "#D1FAE5",
          color: isDarkMode ? "#6EE7B7" : "#059669",
          label: "Delivered",
          showCheck: true,
        };
      default:
        return {
          backgroundColor: isDarkMode ? "#334155" : "#F3F4F6",
          color: isDarkMode ? "#94A3B8" : "#4B5563",
          label: status
        };
    }
  };

  const statusStyle = getStatusStyles(order.status);

  const badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    backgroundColor: statusStyle.backgroundColor,
    color: statusStyle.color,
  };

  // Quantity badge style like in screenshot
  const quantityBadgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "28px",
    height: "28px",
    padding: "0 8px",
    borderRadius: "14px",
    fontSize: "12px",
    fontWeight: "700",
    backgroundColor: colors.accent,
    color: "white",
    flexShrink: 0,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <button style={closeButtonStyle} onClick={onClose}>
            <X size={24} />
          </button>

          <h2 style={titleStyle}>Order #{order.orderNumber || order.id?.slice?.(-5)?.toUpperCase() || order.id}</h2>
          <span style={badgeStyle}>
            {statusStyle.showCheck && <Check size={14} />}
            {statusStyle.label}
          </span>
        </div>

        <div style={bodyStyle}>
          {/* Total Amount - if available */}
          {order.totalAmount && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              backgroundColor: colors.cardBg,
              borderRadius: "12px",
              marginBottom: "24px",
            }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: colors.accent }}>
                Total Amount
              </span>
              <span style={{ fontSize: "18px", fontWeight: "800", color: colors.accent }}>
                ${typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : order.totalAmount}
              </span>
            </div>
          )}

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Order Information</h3>
            <div style={infoRowStyle}>
              <MapPin size={20} style={iconStyle} />
              <span style={infoTextStyle}>{order.table}</span>
            </div>
            <div style={infoRowStyle}>
              <Clock size={20} style={iconStyle} />
              <span style={infoTextStyle}>Placed {order.time}</span>
            </div>
            <div style={infoRowStyle}>
              <User size={20} style={iconStyle} />
              <span style={infoTextStyle}>Customer: {order.customerName || "Walk-in Guest"}</span>
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Order Items</h3>
            <ul style={itemsListStyle}>
              {itemsArray.map((item, index) => (
                <li key={item.id || index} style={itemStyle}>
                  <div style={{ flex: 1 }}>
                    <span>{item.name}</span>
                    {item.notes ? (
                      <div style={specialInstructionsStyle}>
                        📝 {item.notes}
                      </div>
                    ) : null}
                  </div>
                  {item.quantity && (
                    <span style={quantityBadgeStyle}>×{item.quantity}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Order Images</h3>
            {itemsArray.length > 0 && (
              <p style={{
                fontSize: "12px",
                color: colors.textSecondary,
                marginBottom: "8px",
              }}>
                {itemsArray.length} items in order
              </p>
            )}
            <div style={{ borderRadius: "16px", overflow: "hidden" }}>
              {Array.isArray(order.items) && order.items.length > 0 ? (
                <ItemCarousel
                  items={order.items}
                  width="100%"
                  height={280}
                />
              ) : order.image ? (
                <img
                  style={{
                    width: "100%",
                    height: "280px",
                    objectFit: "cover",
                    borderRadius: "16px",
                  }}
                  alt="order"
                  src={order.image}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
