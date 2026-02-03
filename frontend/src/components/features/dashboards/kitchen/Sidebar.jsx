import { useState } from "react";
import { ChefHat, Settings, LogOut, Bell, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { staffLogout } from "../../../../api/staff";
import { toast } from "react-toastify";
import { useStaffAuth } from "../../../../context/StaffAuthContext";
import StaffSettings from "../../../shared/StaffSettings";

const Sidebar = ({
  activeView,
  onViewChange,
  notificationCount = 0,
  isDarkMode = false
}) => {
  const navigate = useNavigate();
  const { staffUser, logout } = useStaffAuth();
  const [showSettings, setShowSettings] = useState(false);

  // Theme colors
  const colors = {
    bg: isDarkMode ? "#1E293B" : "white",
    text: isDarkMode ? "#F8FAFC" : "#111827",
    textSecondary: isDarkMode ? "#94A3B8" : "#6B7280",
    border: isDarkMode ? "#334155" : "#E5E7EB",
    cardBg: isDarkMode ? "#334155" : "#F0FDF4",
    cardBorder: isDarkMode ? "#475569" : "#BBF7D0",
    cardText: isDarkMode ? "#86EFAC" : "#166534",
    cardTextSecondary: isDarkMode ? "#6EE7B7" : "#15803D",
    menuActive: isDarkMode ? "#334155" : "#F3F4F6",
    menuHover: isDarkMode ? "#475569" : "#F9FAFB",
  };

  const handleLogout = async () => {
    try {
      await staffLogout();
      logout();
      toast.success("Logged out successfully");
      navigate("/staff/login");
    } catch (err) {
      console.error("Logout error: ", err);
      toast.error("Logout Failed! Please try again");
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "notifications", label: "Notifications", icon: Bell, badge: notificationCount },
  ];

  return (
    <>
      <div
        style={{
          width: "280px",
          backgroundColor: colors.bg,
          borderRight: `1px solid ${colors.border}`,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          transition: "background-color 0.3s ease",
        }}
      >
        {/* User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <img
            src={staffUser?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffUser?.fullname || 'Chief')}`}
            alt="User"
            style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }}
          />
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "800", color: colors.text }}>
              {staffUser?.fullname ?? 'Chief Staff'}
            </h1>
            <p style={{ fontSize: "14px", color: colors.textSecondary, textTransform: "capitalize" }}>
              {staffUser?.role ? `${staffUser.role} ` : 'Chief'}
            </p>
            <p style={{ fontSize: "12px", color: "#10B981" }}>
              🏨 {staffUser?.hotelName || 'Hotel'}
            </p>
          </div>
        </div>

        {/* Kitchen Mode Card */}
        <div
          style={{
            padding: "16px",
            backgroundColor: colors.cardBg,
            borderRadius: "12px",
            border: `1px solid ${colors.cardBorder}`,
            marginBottom: "24px",
          }}
        >
          <div style={{
            fontSize: "14px",
            fontWeight: "600",
            color: colors.cardText,
            marginBottom: "4px"
          }}>
            🔥 Kitchen Mode
          </div>
          <div style={{ fontSize: "12px", color: colors.cardTextSecondary }}>
            Accept orders & mark ready
          </div>
        </div>

        {/* Menu Items */}
        <nav style={{ flex: 1 }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange?.(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: activeView === item.id ? colors.menuActive : "transparent",
                color: activeView === item.id ? colors.text : colors.textSecondary,
                cursor: "pointer",
                marginBottom: "8px",
                transition: "all 0.2s ease",
                fontWeight: activeView === item.id ? "600" : "500",
                fontSize: "14px",
              }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    backgroundColor: "#EF4444",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "10px",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "16px" }}>
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "transparent",
              color: colors.textSecondary,
              cursor: "pointer",
              marginBottom: "8px",
              transition: "all 0.2s ease",
              fontSize: "14px",
            }}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "transparent",
              color: colors.textSecondary,
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "14px",
            }}
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

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
            padding: "16px",
          }}
          onClick={() => setShowSettings(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <StaffSettings
              onClose={() => setShowSettings(false)}
              variant="kitchen"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
