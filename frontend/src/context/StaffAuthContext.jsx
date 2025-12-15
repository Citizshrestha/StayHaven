/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";

// Create the context
const StaffAuthContext = createContext(null);

export const StaffAuthProvider = ({ children }) => {
  const [staffUser, setStaffUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem("staffUser");
        const savedRole = localStorage.getItem("staffRole");
        
        if (savedUser && savedRole) {
          const user = JSON.parse(savedUser);
          setStaffUser(user);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        // Clear corrupted data
        localStorage.removeItem("staffUser");
        localStorage.removeItem("staffRole");
        localStorage.removeItem("activeProperty");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function - called after successful API login
  const login = (userData) => {
    setStaffUser(userData);
    localStorage.setItem("staffUser", JSON.stringify(userData));
    localStorage.setItem("staffRole", userData.role);
    if (userData.activeProperty) {
      localStorage.setItem("activeProperty", JSON.stringify(userData.activeProperty));
    }
  };
  
  // Logout function - clears all auth data
  const logout = () => {
    setStaffUser(null);
    localStorage.removeItem("staffUser");
    localStorage.removeItem("staffRole");
    localStorage.removeItem("activeProperty");
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
