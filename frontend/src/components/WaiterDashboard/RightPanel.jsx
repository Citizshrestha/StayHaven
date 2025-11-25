import React from "react";
import { Utensils, ClipboardList, Clock } from "lucide-react"; // Changed icons to match reference better

const RightPanel = () => {
  const assignedAreas = [
    { id: 1, name: "Table 5", orderCount: 2 },
    { id: 2, name: "Table 8A", orderCount: 1 },
    { id: 3, name: "Room 204", orderCount: 1 },
    { id: 4, name: "Table 12", orderCount: 1 },
  ];

  const notifications = [
    {
      id: 1,
      type: "new_order",
      Icon: Utensils, // Using icon component directly
      iconBg: "#DBEAFE", // Blue-100
      iconColor: "#2563EB", // Blue-600
      message: "New order received for Table 5",
      time: "2 minutes ago",
    },
    {
      id: 2,
      type: "order_ready",
      Icon: ClipboardList,
      iconBg: "#D1FAE5", // Green-100
      iconColor: "#059669", // Green-600
      message: "Order #82299 is ready for pickup",
      time: "5 minutes ago",
    },
    {
      id: 3,
      type: "kitchen_update",
      Icon: Clock,
      iconBg: "#FEF3C7", // Yellow-100
      iconColor: "#D97706", // Yellow-600
      message: "Kitchen update: Order #82300 delayed",
      time: "10 minutes ago",
    },
  ];

  // Inline Styles
  const containerStyle = {
    backgroundColor: "#F8F9FB", // Light gray background for panel
    height: "100%",
    overflowY: "auto",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    fontFamily: "'Nunito', sans-serif",
  };

  const sectionTitleStyle = {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111827", // Gray-900
    marginBottom: "16px",
  };

  const cardContainerStyle = {
    backgroundColor: "white",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  };

  const assignedListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };

  const assignedItemStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#F9FAFB", // Gray-50
    borderRadius: "12px",
  };

  const assignedNameStyle = {
    fontWeight: "600",
    color: "#1F2937", // Gray-800
    fontSize: "15px",
  };

  const assignedCountStyle = {
    fontSize: "14px",
    color: "#9CA3AF", // Gray-400
    fontWeight: "500",
  };

  const notificationListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  };

  const notificationItemStyle = {
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  };

  const getIconContainerStyle = (bgColor) => ({
    flexShrink: 0,
    width: "48px",
    height: "48px",
    backgroundColor: bgColor,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const notificationContentStyle = {
    flex: 1,
  };

  const notificationMessageStyle = {
    fontSize: "14px",
    color: "#111827", // Gray-900
    fontWeight: "600",
    lineHeight: "1.4",
    marginBottom: "4px",
  };

  const notificationTimeStyle = {
    fontSize: "12px",
    color: "#6B7280", // Gray-500
    fontWeight: "500",
  };

  return (
    <div style={containerStyle}>
      {/* Assigned Areas Section */}
      <div>
        <h2 style={sectionTitleStyle}>Assigned Areas</h2>

        <div style={cardContainerStyle}>
          <div style={assignedListStyle}>
            {assignedAreas.map((area) => (
              <div key={area.id} style={assignedItemStyle}>
                <span style={assignedNameStyle}>{area.name}</span>
                <span style={assignedCountStyle}>
                  {area.orderCount} {area.orderCount === 1 ? "Order" : "Orders"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div>
        <h2 style={sectionTitleStyle}>Notifications</h2>

        <div style={cardContainerStyle}>
          <div style={notificationListStyle}>
            {notifications.map((notification) => {
              const { Icon, iconBg, iconColor } = notification;
              return (
                <div key={notification.id} style={notificationItemStyle}>
                  <div style={getIconContainerStyle(iconBg)}>
                    <Icon size={20} color={iconColor} />
                  </div>
                  <div style={notificationContentStyle}>
                    <p style={notificationMessageStyle}>
                      {notification.message}
                    </p>
                    <p style={notificationTimeStyle}>{notification.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
