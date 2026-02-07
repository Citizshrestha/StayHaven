import { X, Clock, MapPin, User } from "lucide-react";
const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

import { X, Clock, MapPin, User, Check } from "lucide-react";
import ItemCarousel from "../../shared/ItemCarousel";
const OrderDetailsModal = ({ order, onClose, isDarkMode = false }) => {
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
        : [];const overlayStyle = {
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
  };
  const modalStyle = {
    backgroundColor: "white",
    padding: "16px",
    backgroundColor: colors.bg,
borderRadius: "24px",
    maxWidth: "600px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
    position: "relative",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  };
  const headerStyle = {
    padding: "24px",
    borderBottom: "1px solid #F3F4F6",
    position: "sticky",
    top: 0,
    backgroundColor: "white",
    zIndex: 10,
    borderTopLeftRadius: "24px",
    borderTopRightRadius: "24px",
    overflow: "hidden",
    boxShadow: isDarkMode 
      ? "0 20px 25px -5px rgba(0, 0, 0, 0.4)" 
      : "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    border: isDarkMode ? `1px solid NPR {colors.border}` : "none",
    padding: "20px",
    borderBottom: `1px solid NPR {colors.border}`,
    backgroundColor: colors.bg,
    borderTopRightRadius: "24px",
    flexShrink: 0,
};

  const closeButtonStyle = {
    position: "absolute",
    top: "24px",
    right: "24px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#6B7280",
    top: "20px",
    right: "20px",
    color: colors.textSecondary,
padding: "8px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const titleStyle = {
    fontSize: "24px",
    fontWeight: "800",
    color: "#111827",
    marginBottom: "8px",
  };
  const bodyStyle = {
    padding: "24px",
    fontSize: "20px",
    color: colors.text,
    paddingRight: "40px",
    padding: "20px",
    overflowY: "auto",
    flex: 1,
    backgroundColor: colors.bg,
};

  const sectionStyle = {
    marginBottom: "24px",
  };

  const sectionTitleStyle = {
    fontSize: "14px",
    fontWeight: "700",
    color: "#6B7280",
    fontSize: "12px",
    color: colors.textSecondary,
textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "12px",
  };

  const infoRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
    padding: "12px",
    backgroundColor: "#F9FAFB",
    marginBottom: "8px",
    backgroundColor: colors.cardBg,
borderRadius: "12px",
  };

  const iconStyle = {
    color: "#10B981",
    flexShrink: 0,
  };

  const infoTextStyle = {
    fontSize: "15px",
    color: "#111827",
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
    backgroundColor: "#F9FAFB",
    borderRadius: "12px",
    marginBottom: "8px",
    fontSize: "15px",
    color: "#111827",
    fontWeight: "600",
  };
  const imageStyle = {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    borderRadius: "16px",
    marginTop: "16px",
    backgroundColor: colors.cardBg,
    fontSize: "14px",
    color: colors.text,
    wordWrap: "break-word",
    overflowWrap: "break-word",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  const specialInstructionsStyle = {
    fontSize: "12px",
    color: isDarkMode ? "#FCD34D" : "#D97706",
    backgroundColor: isDarkMode ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
    padding: "6px 10px",
    borderRadius: "8px",
    marginTop: "6px",
    gap: "4px",
    overflowWrap: "break-word",
};

  const getStatusStyles = (status) => {
    switch (status) {
      case "new":
        return { backgroundColor: "#DBEAFE", color: "#2563EB", label: "New" };
      case "preparing":
        return {
          backgroundColor: "#FEF3C7",
          color: "#D97706",
        return { 
          backgroundColor: isDarkMode ? "rgba(37, 99, 235, 0.2)" : "#DBEAFE", 
          color: isDarkMode ? "#60A5FA" : "#2563EB", 
          label: "New" 
        };
          backgroundColor: isDarkMode ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
          color: isDarkMode ? "#FBBF24" : "#D97706",
label: "Preparing",
        };
      case "ready":
        return {
          backgroundColor: "#D1FAE5",
          color: "#059669",
          label: "Ready for Pickup",
        };
      default:
        return { backgroundColor: "#F3F4F6", color: "#4B5563", label: status };
    }
  };
  // TODO: Call getStatusStyles function with order.status
  // LEARN: Function calls, storing returned values
  const statusStyle = getStatusStyles(order.status); // Replace with function call
  const badgeStyle = {
    display: "inline-block",
    padding: "6px 16px",
    borderRadius: "8px",
    fontSize: "13px",
          backgroundColor: isDarkMode ? "rgba(5, 150, 105, 0.2)" : "#D1FAE5",
          color: isDarkMode ? "#34D399" : "#059669",
      case "delivered":
        return {
          color: isDarkMode ? "#6EE7B7" : "#059669",
          label: "Delivered",
          showCheck: true,
        return { 
          backgroundColor: isDarkMode ? "#334155" : "#F3F4F6", 
          color: isDarkMode ? "#94A3B8" : "#4B5563", 
          label: status 
  const statusStyle = getStatusStyles(order.status);
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
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
          <span style={badgeStyle}>{statusStyle.label}</span>
        </div>
        <div style={bodyStyle}>
          <span style={badgeStyle}>
            {statusStyle.showCheck && <Check size={14} />}
            {statusStyle.label}
          </span>
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
                NPR {typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : order.totalAmount}
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
              <span style={infoTextStyle}>Assigned to: Alex Miller</span>
              <span style={infoTextStyle}>Customer: {order.customerName || "Walk-in Guest"}</span>
</div>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Order Items</h3>
            <ul style={itemsListStyle}>
              {order.items.split(", ").map((item, index) => (
                <li key={index} style={itemStyle}>
                  {item}
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
            <h3 style={sectionTitleStyle}>Order Image</h3>
            <img style={imageStyle} alt="order" src={order.image} />
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
              ) : null}
            </div>
</div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
