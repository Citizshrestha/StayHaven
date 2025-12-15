import { X, Clock, MapPin, User } from "lucide-react";

const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

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
    padding: "20px",
  };

  const modalStyle = {
    backgroundColor: "white",
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
  };

  const closeButtonStyle = {
    position: "absolute",
    top: "24px",
    right: "24px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#6B7280",
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
  };

  const sectionStyle = {
    marginBottom: "24px",
  };

  const sectionTitleStyle = {
    fontSize: "14px",
    fontWeight: "700",
    color: "#6B7280",
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
    borderRadius: "12px",
  };

  const iconStyle = {
    color: "#10B981",
    flexShrink: 0,
  };

  const infoTextStyle = {
    fontSize: "15px",
    color: "#111827",
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
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "new":
        return { backgroundColor: "#DBEAFE", color: "#2563EB", label: "New" };
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
    fontWeight: "700",
    backgroundColor: statusStyle.backgroundColor,
    color: statusStyle.color,
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
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Order Items</h3>
            <ul style={itemsListStyle}>
              {order.items.split(", ").map((item, index) => (
                <li key={index} style={itemStyle}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Order Image</h3>
            <img style={imageStyle} alt="order" src={order.image} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
