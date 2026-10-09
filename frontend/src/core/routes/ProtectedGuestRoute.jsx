/**
 * Protected Route for Guest Dashboard
 * Ensures user is authenticated and has 'guest' role
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedGuestRoute = ({ children }) => {
  const location = useLocation();
  // Get auth data from localStorage
  const token = localStorage.getItem('accessToken');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');

  // Check if user is authenticated
  if (!token || !userId) {
    // Remember the deep link; GuestDashboardLogin only honours /guest-dashboard* (REQ-guest-2).
    return <Navigate to="/guest/login" replace state={{ from: location.pathname + location.search }} />;
  }

  // Check if user has guest role
  if (role !== 'guest') {
    // Redirect to appropriate dashboard based on role
    if (['receptionist', 'manager', 'admin', 'owner'].includes(role)) {
      return <Navigate to="/reception-dashboard" replace />;
    }
    if (role === 'waiter') {
      return <Navigate to="/waiter-dashboard" replace />;
    }
    if (role === 'chief') {
      return <Navigate to="/kitchen-dashboard" replace />;
    }
    // If not a guest and no matching role, redirect to guest login
    return <Navigate to="/guest/login" replace />;
  }

  return children;
};

export default ProtectedGuestRoute;
