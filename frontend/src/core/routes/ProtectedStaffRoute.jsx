import React from "react";
import { Navigate } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext";

const ProtectedStaffRoute = ({ children, allowedRoles = [] }) => {
  const { staffUser, isLoading, isAuthenticated } = useStaffAuth();

  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>
    );
  }

  if (!isAuthenticated) {
    if (allowedRoles.includes("superadmin")) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/staff/login" replace />;
  }

  // If allowedRoles provided, ensure user's role is included
  if (allowedRoles.length > 0 && !allowedRoles.includes(staffUser?.role)) {
    // Redirect to appropriate dashboard based on user's actual role
    const role = staffUser?.role;

    if (role === 'receptionist' || role === 'manager') {
      return <Navigate to="/reception-dashboard" replace />;
    }
    if (role === 'waiter') {
      return <Navigate to="/waiter-dashboard" replace />;
    }
    if (role === 'chief') {
      return <Navigate to="/kitchen-dashboard" replace />;
    }
    if (role === 'hoteladmin') {
      return <Navigate to="/hoteladmin-dashboard" replace />;
    }
    if (role === 'superadmin') {
      return <Navigate to="/superadmindashboard" replace />;
    }

    // Fallback to login if role is unknown
    return <Navigate to="/staff/login" replace />;
  }

  return children;
};

export default ProtectedStaffRoute;
