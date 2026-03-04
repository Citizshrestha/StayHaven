import {
  LayoutDashboard,
  UtensilsCrossed,
  Bell,
  Settings,
  LogOut,
  Phone,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { staffLogout } from "../../../../api/staff";
import { useStaffAuth } from "../../../../context/StaffAuthContext";
import StaffSettings from "../../../../components/shared/StaffSettings";

const Sidebar = ({ activeView = "dashboard", onViewChange, notificationCount = 0, waiterCallCount = 0, onMessagingToggle, unreadMessageCount = 0 }) => {
  const navigate = useNavigate();
  const { staffUser, activeProperty, logout, staffRole } = useStaffAuth();
  const [showSettings, setShowSettings] = useState(false);

  // Determine if user is chief/kitchen staff (hide waiter-specific items)
  const isChief = staffRole === 'chief' || staffRole === 'kitchen';


  const handleMenuClick = (menu) => {
    if (onViewChange) {
      onViewChange(menu);
    }
  };

  const handleLogout = async () => {
    try {
      await staffLogout();
      // clear auth context/localStorage
      logout();
      navigate("/staff/login");
    } catch (err) {
      console.error("Logout Failed:", err);
      toast.error("Logout Failed! Please try again");
    }
  }

  const containerStyle = {
    height: "100%",
    backgroundColor: "var(--bg-primary)",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--border-color)",
    fontFamily: "'Nunito', sans-serif",
  };

  const profileSectionStyle = {
    padding: "24px 24px 32px 24px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const profileImageStyle = {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  };

  const navSectionStyle = {
    flex: 1,
    padding: "0 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const bottomSectionStyle = {
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    borderTop: "1px solid transparent",
  };

  const getMenuItemStyle = (isActive) => ({
    width: "100%",
    padding: "12px 20px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    transition: "all 0.2s ease",
    border: "none",
    outline: "none",
    cursor: "pointer",
    backgroundColor: isActive ? "var(--color-accent-light)" : "transparent",
    color: isActive ? "var(--color-primary)" : "var(--text-secondary)",
    fontWeight: isActive ? "600" : "500",
  });

  const badgeStyle = {
    marginLeft: "auto",
    width: "20px",
    height: "20px",
    backgroundColor: "#3B82F6",
    color: "white",
    borderRadius: "50%",
    fontSize: "11px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={containerStyle}>
      {/* User Profile */}
      <div style={profileSectionStyle}>
        <img
          src={staffUser?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffUser?.fullname || 'Staff')}`}
          alt="User"
          style={profileImageStyle}
        />
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
            {staffUser?.fullname ?? "Staff Member"}
          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-tertiary)", textTransform: "capitalize" }}>{staffUser?.role ?? "Waiter"}</p>
          {
            activeProperty?.name && (
              <p style={{
                margin: "4px 0 0 0",
                fontSize: "12px",
                color: "var(--color-primary)",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                🏨 {activeProperty.name}
              </p>
            )
          }
        </div>
      </div>

      {/* Navigation Items */}
      <nav style={navSectionStyle}>
        {/* Dashboard Button */}
        <button
          style={getMenuItemStyle(activeView === "dashboard")}
          onClick={() => handleMenuClick("dashboard")}
        >
          <LayoutDashboard size={20} />
          <span style={{ fontSize: "14px" }}>Dashboard</span>
        </button>

        {/* Assigned Tables Button - Only for waiters, not chiefs */}
        {!isChief && (
          <button
            style={getMenuItemStyle(activeView === "assignedTables")}
            onClick={() => handleMenuClick("assignedTables")}
          >
            <UtensilsCrossed size={20} />
            <span style={{ fontSize: "14px" }}>Assigned Tables</span>
          </button>
        )}

        {/* Notifications Button */}
        <button
          style={getMenuItemStyle(activeView === "notifications")}
          onClick={() => handleMenuClick("notifications")}
        >
          <Bell size={20} />
          <span style={{ fontSize: "14px" }}>Notifications</span>
          {notificationCount > 0 && (
            <span style={badgeStyle}>{notificationCount > 99 ? '99+' : notificationCount}</span>
          )}
        </button>

        {/* Waiter Calls Button - Only for waiters, not chiefs */}
        {!isChief && (
          <button
            style={getMenuItemStyle(activeView === "waiterCalls")}
            onClick={() => handleMenuClick("waiterCalls")}
          >
            <Phone size={20} />
            <span style={{ fontSize: "14px" }}>Guest Calls</span>
            {waiterCallCount > 0 && (
              <span style={{ ...badgeStyle, backgroundColor: "#EF4444" }}>{waiterCallCount > 99 ? '99+' : waiterCallCount}</span>
            )}
          </button>
        )}

        {/* Messages Button */}
        <button
          style={getMenuItemStyle(false)}
          onClick={() => onMessagingToggle && onMessagingToggle()}
        >
          <MessageCircle size={20} />
          <span style={{ fontSize: "14px" }}>Messages</span>
          {unreadMessageCount > 0 && (
            <span style={badgeStyle}>{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span>
          )}
        </button>

        {/* Order History removed */}
      </nav>

      {/* Bottom Actions */}
      <div style={bottomSectionStyle}>
        <button
          style={getMenuItemStyle(activeView === "settings")}
          onClick={() => setShowSettings(true)}
        >
          <Settings size={20} />
          <span style={{ fontSize: "14px" }}>Settings</span>
        </button>

        <button
          style={getMenuItemStyle(activeView === "logout")}
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span style={{ fontSize: "14px" }}>Log Out</span>
        </button>
        {/* Settings Modal */}
        {showSettings && (
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
            onClick={() => setShowSettings(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <StaffSettings onClose={() => setShowSettings(false)} variant="waiter" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
