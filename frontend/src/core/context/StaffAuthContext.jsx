/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { getApiBaseUrl } from "../../utils/apiConfig";

// Create the context
const StaffAuthContext = createContext(null);

// Token refresh interval (refresh 5 minutes before expiry for 1-hour token)
const TOKEN_REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes

export const StaffAuthProvider = ({ children }) => {
  const [staffUser, setStaffUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // Track in-flight refresh so the timer never fires two simultaneous rotations
  const refreshInProgressRef = useRef(false);

  // Proactive token refresh function
  const refreshToken = useCallback(async () => {
    if (refreshInProgressRef.current) return false;
    refreshInProgressRef.current = true;
    try {
      const { data } = await axios.post(
        `${getApiBaseUrl()}/api/v1/staff/refresh-token`,
        {},
        { withCredentials: true }
      );
      
      if (data.success && data.accessToken) {
        sessionStorage.setItem("staffAccessToken", data.accessToken);
        return true;
      }
      return false;
    } catch {
      // Refresh token absent or expired — silently fail; the axios interceptor
      // in client.js will handle actual 401s from real API calls.
      return false;
    } finally {
      refreshInProgressRef.current = false;
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
      const hasToken = sessionStorage.getItem("staffAccessToken");
      if (hasToken) {
        refreshToken();
      }
    }, TOKEN_REFRESH_INTERVAL);
  }, [refreshToken]);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = sessionStorage.getItem("staffUser");
        const savedRole = sessionStorage.getItem("staffRole");
        const savedToken = sessionStorage.getItem("staffAccessToken");
        
        if (savedUser && savedRole && savedToken) {
          const user = JSON.parse(savedUser);
          setStaffUser(user);
          
          // Restore session from sessionStorage. The access token is already
          // stored and valid. DO NOT proactively call refreshToken() here —
          // token rotation means two simultaneous page-loads would race and
          // the loser gets a 401. The axios interceptor in client.js handles
          // actual 401s from API calls.  Just start the proactive timer so
          // the token is renewed before it expires (~55 min into the session).
          setupRefreshTimer();
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        // Clear corrupted data
        sessionStorage.removeItem("staffUser");
        sessionStorage.removeItem("staffRole");
        sessionStorage.removeItem("activeProperty");
        sessionStorage.removeItem("staffAccessToken");
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
  }, [setupRefreshTimer]);

  // Login function - called after successful API login
  const login = (userData) => {
    setStaffUser(userData);
    sessionStorage.setItem("staffUser", JSON.stringify(userData));
    sessionStorage.setItem("staffRole", userData.role);
    if (userData.activeProperty) {
      sessionStorage.setItem("activeProperty", JSON.stringify(userData.activeProperty));
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
    sessionStorage.removeItem("staffUser");
    sessionStorage.removeItem("staffRole");
    sessionStorage.removeItem("activeProperty");
    sessionStorage.removeItem("staffAccessToken");
    // Defensive: purge any pre-existing localStorage copies from before
    // these moved to sessionStorage.
    localStorage.removeItem("staffAccessToken");
    localStorage.removeItem("staffUser");
    localStorage.removeItem("staffRole");
    localStorage.removeItem("activeProperty");
    localStorage.removeItem("restaurant_orders");
  };

  // Update user data (e.g., after profile update)
  const updateUser = useCallback((updatedData) => {
    setStaffUser((prev) => {
      const newUser = { ...prev, ...updatedData };
      sessionStorage.setItem("staffUser", JSON.stringify(newUser));
      return newUser;
    });
  }, []);

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
