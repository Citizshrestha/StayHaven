import axiosClient from "../core/api/client";
import { createLogger } from "../core/utils/logger.js";

const logger = createLogger('StaffAPI');

// Staff Login
export const staffLogin = async (email, password) => {
  const response = await axiosClient.post("/api/v1/staff/login", {
    email,
    password,
  });

  if (response.data.success) {
    if (response.data.accessToken) {
      // sessionStorage only — see StaffAuthContext for why localStorage is
      // avoided for the token itself. (Note: this staffLogin export isn't
      // currently called anywhere — StaffLogin.jsx uses the one in
      // core/api/services/staff.service.js — kept consistent regardless.)
      sessionStorage.setItem("staffAccessToken", response.data.accessToken);
    }
    sessionStorage.setItem("staffUserId", response.data.user._id);
    sessionStorage.setItem("staffUser", JSON.stringify(response.data.user));
    sessionStorage.setItem("staffRole", response.data.user.role);
    if (response.data.user.activeProperty) {
      sessionStorage.setItem(
        "activeProperty",
        JSON.stringify(response.data.user.activeProperty)
      );
    } else {
      sessionStorage.removeItem("activeProperty");
    }
  }

  return response.data;
};

// Staff Logout
export const staffLogout = async () => {
  try {
    await axiosClient.post("/api/v1/staff/logout");
  } catch (error) {
    logger.error("Logout error:", error);
  } finally {
    // Clear all staff data
    localStorage.removeItem("staffAccessToken");
    sessionStorage.removeItem("staffUser");
    sessionStorage.removeItem("staffUserId");
    sessionStorage.removeItem("staffRole");
    sessionStorage.removeItem("activeProperty");
    // Defensive: purge any pre-existing localStorage copies from before
    // these moved to sessionStorage, so a stale cross-tab value can't
    // linger and get read by old cached JS still checking localStorage.
    localStorage.removeItem("staffUser");
    localStorage.removeItem("staffUserId");
    localStorage.removeItem("staffRole");
    localStorage.removeItem("activeProperty");
    localStorage.removeItem("restaurant_orders");
  }
};

// Get Staff Profile
export const getStaffProfile = async () => {
  const response = await axiosClient.get("/api/v1/staff/me");
  return response.data;
};

// Check if staff is authenticated
export const isStaffAuthenticated = () => {
  return !!sessionStorage.getItem("staffAccessToken");
};

// Get current staff user
export const getCurrentStaffUser = () => {
  const user = sessionStorage.getItem("staffUser");
  return user ? JSON.parse(user) : null;
};

// Get staff role
export const getStaffRole = () => {
  return sessionStorage.getItem("staffRole");
};

// Get active property
export const getActiveProperty = () => {
  const property = sessionStorage.getItem("activeProperty");
  return property ? JSON.parse(property) : null;
};

// Update order status (for cross-dashboard sync)
export const updateOrderStatus = async (orderId, status) => {
  const response = await axiosClient.put(`/api/v1/staff/orders/${orderId}/status`, { status });
  return response.data;
};


// create order
export const createOrder = async (orderData) => {
  const response = await axiosClient.post("/api/v1/staff/create-order", orderData);
  return response.data;
};

// get order
export const getOrders = async (hotelId, status = "pending", orderType = "dineIn") => {
  const response = await axiosClient.get("/api/v1/staff/orders", {
    params: { hotelId, status, orderType }
  });

  return response.data;
};

// Delete an order
export const deleteOrder = async (orderId) => {
  const response = await axiosClient.delete(`/api/v1/staff/orders/${orderId}`);
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await axiosClient.put("/api/v1/staff/change-password", { currentPassword, newPassword });
  return response.data;
}

export const forgotPassword = async (email) => {
  const response = await axiosClient.post("/api/v1/staff/forgot-password", { email });
  return response.data;
}

export const resetPassword = async (token, newPassword) => {
  const response = await axiosClient.post("/api/v1/staff/reset-password", { token, newPassword });
  return response.data;
}

// Update an order
export const updateOrder = async (orderId, orderData) => {
  const response = await axiosClient.put(`/api/v1/staff/orders/${orderId}`, orderData);
  return response.data;
}

export const updateProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append("profilePicture", file);

  const response = await axiosClient.patch("/api/v1/staff/profile-picture", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const updateStaffProfile = async ({ fullname, contact, username }) => {
  const response = await axiosClient.patch("/api/v1/staff/profile", {
    fullname,
    contact,
    username,
  });
  return response.data;
};
