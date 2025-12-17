import axiosClient from "../axiosClient";

// Staff Login
export const staffLogin = async (email, password) => {
  const response = await axiosClient.post("/api/staff/login", {
    email,
    password,
  });

  if (response.data.success) {
    if (response.data.accessToken) {
      localStorage.setItem("staffAccessToken", response.data.accessToken);
    }
    localStorage.setItem("staffUserId", response.data.user._id);
    localStorage.setItem("staffUser", JSON.stringify(response.data.user));
    localStorage.setItem("staffRole", response.data.user.role);
    if (response.data.user.activeProperty) {
      localStorage.setItem(
        "activeProperty",
        JSON.stringify(response.data.user.activeProperty)
      );
    } else {
      localStorage.removeItem("activeProperty");
    }
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
    localStorage.removeItem("staffUserId");
    localStorage.removeItem("staffRole");
    localStorage.removeItem("activeProperty");
    localStorage.removeItem("restaurant_orders");
  }
};

// Get Staff Profile
export const getStaffProfile = async () => {
  const response = await axiosClient.get("/api/staff/me");
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


// create order
export const createOrder = async (orderData) => {
  const response = await axiosClient.post("/api/staff/create-order", orderData);
  return response.data;
};

// get order
export const getOrders = async (hotelId, status="pending", orderType="dineIn") => {
  const response = await axiosClient.get("/api/staff/orders", {
    params: {hotelId, status, orderType}
  });

  return response.data;
};

// Delete an order
export const deleteOrder = async (orderId) => {
  const response = await axiosClient.delete(`/api/staff/orders/${orderId}`);
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
   const response = await axiosClient.post("/api/staff/change-password", { currentPassword, newPassword });
   return response.data;
}

export const forgotPassword = async (email) => {
  const response = await axiosClient.post("/api/staff/forgot-password", {email});
  return response.data;
}

export const resetPassword = async (token, newPassword) => {
  const response = await axiosClient.post("/api/staff/reset-password", {token, newPassword});
  return response.data;
}