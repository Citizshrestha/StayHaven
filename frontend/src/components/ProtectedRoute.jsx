import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('accessToken') || localStorage.getItem('staffAccessToken');

  if (!token) {
    // Redirect to login and preserve the location to come back after authentication
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
