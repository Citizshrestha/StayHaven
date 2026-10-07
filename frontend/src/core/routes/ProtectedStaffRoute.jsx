import React from "react";
import { Navigate } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext";
import { staffHomeRoute } from "./staffRoleRoutes";

const ProtectedStaffRoute = ({ children, allowedRoles = [] }) => {
  const { staffUser, isLoading, isAuthenticated } = useStaffAuth();
  const loginPath = allowedRoles.includes('superadmin') ? '/login' : '/staff/login';

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" style={{ padding: 24, textAlign: "center" }}>Loading...</div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace />;
  }

  // If allowedRoles provided, ensure user's role is included
  if (allowedRoles.length > 0 && !allowedRoles.includes(staffUser?.role)) {
    // Send the user to their own dashboard (same map the backend login uses);
    // unknown roles go back to sign-in.
    return <Navigate to={staffHomeRoute(staffUser?.role) || loginPath} replace />;
  }

  return children;
};

export default ProtectedStaffRoute;
