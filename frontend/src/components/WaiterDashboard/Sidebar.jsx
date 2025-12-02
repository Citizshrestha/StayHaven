import {
  LayoutDashboard,
  UtensilsCrossed,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { staffLogout } from "../../api/staff";


const Sidebar = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const navigate = useNavigate();

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
  };

  const handleLogout = async () => {
    try {
      await staffLogout();
      navigate("/staff/login");
    } catch (err) {
      console.error("Logout Failed:", err);
      toast.error("Logout Failed! Please try again");
    }
  }

  const containerStyle = {
    height: "100%",
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #E5E7EB",
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
    backgroundColor: isActive ? "#D1FAE5" : "transparent",
    color: isActive ? "#059669" : "#374151",
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
          src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&auto=format&fit=crop&q=60"
          alt="User"
          style={profileImageStyle}
        />
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>
            Alex Miller
          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#6B7280" }}>Waiter</p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav style={navSectionStyle}>
        {/* Dashboard Button */}
        <button
          style={getMenuItemStyle(activeMenu === "dashboard")}
          onClick={() => handleMenuClick("dashboard")}
        >
          <LayoutDashboard size={20} />
          <span style={{ fontSize: "14px" }}>Dashboard</span>
        </button>

        {/* Assigned Tables Button */}
        <button
          style={getMenuItemStyle(activeMenu === "assignedTables")}
          onClick={() => handleMenuClick("assignedTables")}
        >
          <UtensilsCrossed size={20} />
          <span style={{ fontSize: "14px" }}>Assigned Tables</span>
        </button>

        {/* Notifications Button */}
        <button
          style={getMenuItemStyle(activeMenu === "notifications")}
          onClick={() => handleMenuClick("notifications")}
        >
          <Bell size={20} />
          <span style={{ fontSize: "14px" }}>Notifications</span>
          <span style={badgeStyle}>3</span>
        </button>
      </nav>

      {/* Bottom Actions */}
      <div style={bottomSectionStyle}>
        <button
          style={getMenuItemStyle(activeMenu === "settings")}
          onClick={() => handleMenuClick("settings")}
        >
          <Settings size={20} />
          <span style={{ fontSize: "14px" }}>Settings</span>
        </button>

        <button
          style={getMenuItemStyle(activeMenu === "logout")}
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span style={{ fontSize: "14px" }}>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
