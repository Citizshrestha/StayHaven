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
    return <Navigate to="/staff/login" replace />;
  }

  // If allowedRoles provided, ensure user's role is included
  if (allowedRoles.length > 0 && !allowedRoles.includes(staffUser?.role)) {
    return <Navigate to="/staff/login" replace />;
  }

  return children;
};

export default ProtectedStaffRoute;
