import {
  LayoutDashboard,
  UtensilsCrossed,
  Bell,
  Settings,
  LogOut,
  Phone,
  MessageCircle,
  Receipt,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { staffLogout } from "../../../../core/api/services/staffAccount.service";
import { useStaffAuth } from "../../../../core/context/StaffAuthContext";
import StaffSettings from "../../../../shared/components/StaffSettings";
import { useTheme } from "../../../../core/hooks/useTheme";

const Sidebar = ({ activeView = "dashboard", onViewChange, notificationCount = 0, waiterCallCount = 0, onMessagingToggle, unreadMessageCount = 0 }) => {
  const navigate = useNavigate();
  const { staffUser, activeProperty, logout, staffRole } = useStaffAuth();
  const [showSettings, setShowSettings] = useState(false);
  // Tracks whether the profile picture URL failed to load (e.g. an expired
  // Google-hosted photo URL, or the ui-avatars.com fallback being blocked)
  // so we can drop to a locally-rendered initials badge instead of leaving
  // a blank circle.
  const [avatarFailed, setAvatarFailed] = useState(false);
  const initials = (staffUser?.fullname || "Staff")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const { isDark } = useTheme();

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
    color: isActive ? "var(--color-primary)" : (isDark ? "#E5E7EB" : "#374151"),
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
        {staffUser?.profilePicture && !avatarFailed ? (
          <img
            src={staffUser.profilePicture}
            alt="User"
            style={profileImageStyle}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <div
            style={{
              ...profileImageStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--color-accent-light)",
              color: "var(--color-primary)",
              fontWeight: "700",
              fontSize: "16px",
            }}
            aria-label="User"
            role="img"
          >
            {initials || "S"}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: isDark ? "#F8FAFC" : "#0F172A" }}>
            {staffUser?.fullname ?? "Staff Member"}
          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: isDark ? "#CBD5E1" : "#334155", textTransform: "capitalize" }}>{staffUser?.role ?? "Waiter"}</p>
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

        {/* Table bills / payments - waiters only */}
        {!isChief && (
          <button
            style={getMenuItemStyle(activeView === "bills")}
            onClick={() => handleMenuClick("bills")}
          >
            <Receipt size={20} />
            <span style={{ fontSize: "14px" }}>Bills</span>
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
;
