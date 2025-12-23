import { X, Clock, MapPin, User } from "lucide-react";

const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

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
    backgroundColor: "white",
    borderRadius: "24px",
    maxWidth: "600px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
  };

  const headerStyle = {
    padding: "20px",
    borderBottom: "1px solid #F3F4F6",
    backgroundColor: "white",
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
    color: "#6B7280",
    padding: "8px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const titleStyle = {
    fontSize: "20px",
    fontWeight: "800",
    color: "#111827",
    marginBottom: "8px",
    paddingRight: "40px",
  };

  const bodyStyle = {
    padding: "20px",
    overflowY: "auto",
    flex: 1,
  };

  const sectionStyle = {
    marginBottom: "24px",
  };

  const sectionTitleStyle = {
    fontSize: "12px",
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
    marginBottom: "8px",
    padding: "12px",
    backgroundColor: "#F9FAFB",
    borderRadius: "12px",
  };

  const iconStyle = {
    color: "#10B981",
    flexShrink: 0,
  };

  const infoTextStyle = {
    fontSize: "14px",
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
    fontSize: "14px",
    color: "#111827",
    fontWeight: "600",
    wordWrap: "break-word",
    overflowWrap: "break-word",
  };

  const specialInstructionsStyle = {
    fontSize: "12px",
    color: "#D97706",
    backgroundColor: "#FEF3C7",
    padding: "6px 10px",
    borderRadius: "8px",
    marginTop: "6px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    wordWrap: "break-word",
    overflowWrap: "break-word",
  };

  // Image container with horizontal scroll
  const imageContainerStyle = {
    display: "flex",
    gap: "12px",
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: "12px",
    marginTop: "12px",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "thin",
    position: "relative",
  };

  const imageWrapperStyle = {
    position: "relative",
  };

  const imageStyle = {
    minWidth: "85vw",
    maxWidth: "85vw",
    height: "220px",
    objectFit: "cover",
    borderRadius: "12px",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  };

  const scrollIndicatorStyle = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#10B981",
    zIndex: 5,
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

  const statusStyle = getStatusStyles(order.status);

  const badgeStyle = {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "12px",
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
              <span style={infoTextStyle}>Customer: {order.customerName || "Walk-in Guest"}</span>
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Order Items</h3>
            <ul style={itemsListStyle}>
              {itemsArray.map((item, index) => (
                <li key={item.id || index} style={itemStyle}>
                  {item.quantity ? `${item.quantity}× ` : ""}{item.name}
                  {item.notes ? (
                    <div style={specialInstructionsStyle}>
                      📝 {item.notes}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Order Images</h3>
            <p style={{
              fontSize: "11px",
              color: "#9CA3AF",
              marginBottom: "8px",
              fontStyle: "italic"
            }}>
              👈 Swipe to view more images
            </p>
            <div style={imageContainerStyle}>
              <img style={imageStyle} alt="order" src={order.image} />
              {/* Add more images here if available */}
              {/* Example: order.images?.map((img, i) => <img key={i} style={imageStyle} alt={`order-${i}`} src={img} />) */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
