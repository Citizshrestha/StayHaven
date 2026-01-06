/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

// Create the context
const StaffAuthContext = createContext(null);

// Token refresh interval (refresh 5 minutes before expiry for 1-hour token)
const TOKEN_REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes

export const StaffAuthProvider = ({ children }) => {
  const [staffUser, setStaffUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // Proactive token refresh function
  const refreshToken = useCallback(async () => {
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/staff/refresh-token`,
        {},
        { withCredentials: true }
      );
      
      if (data.success && data.accessToken) {
        localStorage.setItem("staffAccessToken", data.accessToken);
        console.log("🔄 Token refreshed proactively");
        return true;
      }
      return false;
    } catch (error) {
      console.warn("⚠️ Proactive token refresh failed:", error.message);
      return false;
    }
  }, []);

  // Setup proactive token refresh timer
  const setupRefreshTimer = useCallback(() => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    
    // Set up new timer for proactive refresh
    refreshTimerRef.current = setInterval(() => {
      const hasToken = localStorage.getItem("staffAccessToken");
      if (hasToken) {
        refreshToken();
      }
    }, TOKEN_REFRESH_INTERVAL);
  }, [refreshToken]);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem("staffUser");
        const savedRole = localStorage.getItem("staffRole");
        const savedToken = localStorage.getItem("staffAccessToken");
        
        if (savedUser && savedRole && savedToken) {
          const user = JSON.parse(savedUser);
          setStaffUser(user);
          
          // Try to refresh token on mount to ensure it's valid
          const refreshed = await refreshToken();
          if (!refreshed) {
            // Token refresh failed, but don't logout immediately
            // The axios interceptor will handle 401s
            console.log("⚠️ Initial token refresh failed, will retry on next request");
          }
          
          // Setup proactive refresh timer
          setupRefreshTimer();
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        // Clear corrupted data
        localStorage.removeItem("staffUser");
        localStorage.removeItem("staffRole");
        localStorage.removeItem("activeProperty");
        localStorage.removeItem("staffAccessToken");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    
    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshToken, setupRefreshTimer]);

  // Login function - called after successful API login
  const login = (userData) => {
    setStaffUser(userData);
    localStorage.setItem("staffUser", JSON.stringify(userData));
    localStorage.setItem("staffRole", userData.role);
    if (userData.activeProperty) {
      localStorage.setItem("activeProperty", JSON.stringify(userData.activeProperty));
    }
    // Setup proactive refresh timer after login
    setupRefreshTimer();
  };
  
  // Logout function - clears all auth data
  const logout = () => {
    // Clear refresh timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    setStaffUser(null);
    localStorage.removeItem("staffUser");
    localStorage.removeItem("staffRole");
    localStorage.removeItem("activeProperty");
    localStorage.removeItem("staffAccessToken");
    localStorage.removeItem("restaurant_orders");
  };

  // Update user data (e.g., after profile update)
  const updateUser = (updatedData) => {
    const newUser = { ...staffUser, ...updatedData };
    setStaffUser(newUser);
    localStorage.setItem("staffUser", JSON.stringify(newUser));
  };

  // Computed values
  const isAuthenticated = !!staffUser;
  const staffRole = staffUser?.role || null;
  const activeProperty = staffUser?.activeProperty || null;

  const value = {
    staffUser,
    isAuthenticated,
    isLoading,
    staffRole,
    activeProperty,
    login,
    logout,
    updateUser,
  };

  return (
    <StaffAuthContext.Provider value={value}>
      {children}
    </StaffAuthContext.Provider>
  );
};

/**
 * useStaffAuth - Custom hook to access staff auth context
 * 
 * Usage:
 * const { staffUser, isAuthenticated, logout } = useStaffAuth();
 */
export const useStaffAuth = () => {
  const context = useContext(StaffAuthContext);
  
  if (!context) {
    throw new Error("useStaffAuth must be used within a StaffAuthProvider");
  }
  
  return context;
};

export default StaffAuthContext;
