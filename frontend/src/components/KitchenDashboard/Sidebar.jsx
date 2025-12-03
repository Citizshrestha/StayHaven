import { ChefHat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { staffLogout } from "../../api/staff";
import { toast } from "react-toastify";
import { useStaffAuth } from "../../context/StaffAuthContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const { staffUser, logout } = useStaffAuth();

  const handleLogout = async () => {
    try {
      await staffLogout();
      logout();
      toast.success("Logged out successfully");
      navigate("/staff/login");
    } catch (err) {
      console.error("Logout error: ",err);
      toast.error("Logout Failed! Please try again");
    }
  };
  return (
    <div
      style={{
        width: "280px",
        backgroundColor: "white",
        borderRight: "1px solid #E5E7EB",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          src={staffUser?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffUser?.fullname || 'Kitchen')}`}
          alt="User"
          style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }}
        />
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: "800", color: "#111827" }}>
            {staffUser?.fullname ?? 'Kitchen Staff'}
          </h1>
          <p style={{ fontSize: "14px", color: "#6B7280" }}>{staffUser?.role ?? 'Kitchen'}</p>
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          backgroundColor: "#F0FDF4",
          borderRadius: "12px",
          border: "1px solid #BBF7D0",
        }}
      >
       
        <div style={{ fontSize: "12px", color: "#15803D" }}>
          Accept orders & mark ready
        </div>


         <div
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#166534",
            marginBottom: "4px",
          }}
        >
          🔥 Kitchen Mode
 
        </div>
      </div>

               <button
            onClick={handleLogout}
            style={{
              backgroundColor: "#10B981",
              color: "white",
              padding: "8px 13px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
            marginTop: "28rem",

            }}
          >
            Logout
          </button>
    </div>
  );
};

export default Sidebar;
