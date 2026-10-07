/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import apiClient, { refreshSession } from "../api/client";


// Create the context
const StaffAuthContext = createContext(null);

// Refresh this long before the access token's own `exp` (the server decides the
// lifetime via JWT_EXPIRE, so a fixed page-load interval drifts or overshoots).
const REFRESH_LEAD_MS = 60 * 1000;
const MIN_REFRESH_DELAY_MS = 5 * 1000;
const FALLBACK_REFRESH_DELAY_MS = 10 * 60 * 1000;

const tokenExpiresAt = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

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
      await refreshSession("staff");
      return true;
    } catch {
      // Refresh token absent or expired — silently fail; the axios interceptor
      // in client.js will handle actual 401s from real API calls.
      return false;
    } finally {
      refreshInProgressRef.current = false;
    }
  }, []);

  // Proactive refresh, scheduled from the current token's `exp` and re-armed
  // after every refresh (including ones done by the 401 interceptor).
  const setupRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    const schedule = () => {
      const token = sessionStorage.getItem("staffAccessToken");
      if (!token) {
        refreshTimerRef.current = null;
        return;
      }
      const expiresAt = tokenExpiresAt(token);
      const delay = expiresAt
        ? Math.max(MIN_REFRESH_DELAY_MS, expiresAt - Date.now() - REFRESH_LEAD_MS)
        : FALLBACK_REFRESH_DELAY_MS;
      refreshTimerRef.current = setTimeout(async () => {
        // Skip if another request already rotated the token in the meantime.
        const current = sessionStorage.getItem("staffAccessToken");
        const currentExpiry = current && tokenExpiresAt(current);
        if (current && (!currentExpiry || currentExpiry - Date.now() <= REFRESH_LEAD_MS + MIN_REFRESH_DELAY_MS)) {
          // A failed refresh stops the timer; the 401 interceptor owns recovery.
          if (!(await refreshToken())) {
            refreshTimerRef.current = null;
            return;
          }
        }
        schedule();
      }, delay);
    };
    schedule();
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
        clearTimeout(refreshTimerRef.current);
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
    // Setup proactive refresh timer after login (next tick: some callers store
    // the access token right after calling login()).
    setTimeout(setupRefreshTimer, 0);
  };
  
  // Logout: clears local auth data immediately (callers navigate right after)
  // and revokes the refresh token on the server. The returned promise settles
  // when the server call finishes; it never rejects.
  const logout = () => {
    // Clear refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const token = sessionStorage.getItem("staffAccessToken");
    const revoke = token
      ? apiClient.post("/api/v1/staff/logout", {}, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 8000,
        }).then(() => undefined, () => undefined) // offline / already signed out
      : Promise.resolve();

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
    return revoke;
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
