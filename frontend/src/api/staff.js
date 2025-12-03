import axiosClient from "../axiosClient";

// Staff Login
export const staffLogin = async (email, password) => {
  const response = await axiosClient.post("/api/staff/login", {
    email,
    password,
  });
  
  if (response.data.success) {
    // Store tokens and user data
    localStorage.setItem("staffUser", JSON.stringify(response.data.user));
    localStorage.setItem("staffRole", response.data.user.role);
    localStorage.setItem("activeProperty", JSON.stringify(response.data.user.activeProperty));
  }
  
  return response.data;
};

// Staff Logout
export const staffLogout = async () => {
  try {
    await axiosClient.post("/api/staff/logout");
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    // Clear all staff data
    localStorage.removeItem("staffAccessToken");
    localStorage.removeItem("staffUser");
    localStorage.removeItem("staffRole");
    localStorage.removeItem("activeProperty");
    localStorage.removeItem("restaurant_orders"); 
  }
};

// Get Staff Profile
export const getStaffProfile = async () => {
  const response = await axiosClient.get("/api/staff/me", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("staffAccessToken")}`,
    },
  });
  return response.data;
};

// Check if staff is authenticated
export const isStaffAuthenticated = () => {
  return !!localStorage.getItem("staffAccessToken");
};

// Get current staff user
export const getCurrentStaffUser = () => {
  const user = localStorage.getItem("staffUser");
  return user ? JSON.parse(user) : null;
};

// Get staff role
export const getStaffRole = () => {
  return localStorage.getItem("staffRole");
};

// Get active property
export const getActiveProperty = () => {
  const property = localStorage.getItem("activeProperty");
  return property ? JSON.parse(property) : null;
};
