import axiosClient from "../client";

// Staff Login
export const staffLogin = async (email, password) => {
  const response = await axiosClient.post("/api/staff/login", {
    email,
    password,
  });

  if (response.data.success) {
    if (response.data.accessToken) {
      sessionStorage.setItem("staffAccessToken", response.data.accessToken);
      localStorage.setItem("staffAccessToken", response.data.accessToken); // backward compatibility fallback
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
    sessionStorage.removeItem("staffAccessToken");
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
  return !!(sessionStorage.getItem("staffAccessToken") || localStorage.getItem("staffAccessToken"));
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

// Update order status (for cross-dashboard sync)
export const updateOrderStatus = async (orderId, status) => {
  const response = await axiosClient.put(`/api/staff/orders/${orderId}/status`, { status });
  return response.data;
};


// create order
export const createOrder = async (orderData) => {
  const response = await axiosClient.post("/api/staff/create-order", orderData);
  return response.data;
};

// get order
export const getOrders = async (arg1, statusArg = "all", orderTypeArg = "all") => {
  // Backward compatible signature support:
  // - New: getOrders({ hotelId, status, orderType, page, limit, search })
  // - Old: getOrders(hotelId, status, orderType)
  const params = typeof arg1 === 'object' && arg1 !== null
    ? {
      hotelId: arg1.hotelId,
      status: arg1.status ?? "all",
      orderType: arg1.orderType ?? "all",
      page: arg1.page ?? 1,
      limit: arg1.limit ?? 100,
      search: arg1.search ?? "",
    }
    : {
      hotelId: arg1,
      status: statusArg,
      orderType: orderTypeArg,
      page: 1,
      limit: 100,
      search: "",
    };

  const response = await axiosClient.get("/api/staff/orders", {
    params
  });

  return response.data;
};

// Delete an order
export const deleteOrder = async (orderId) => {
  const response = await axiosClient.delete(`/api/staff/orders/${orderId}`);
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await axiosClient.put("/api/staff/change-password", { currentPassword, newPassword });
  return response.data;
}

export const forgotPassword = async (email) => {
  const response = await axiosClient.post("/api/staff/forgot-password", { email });
  return response.data;
}

export const resetPassword = async (token, newPassword) => {
  const response = await axiosClient.post("/api/staff/reset-password", { token, newPassword });
  return response.data;
}

// Update an order
export const updateOrder = async (orderId, orderData) => {
  const response = await axiosClient.put(`/api/staff/orders/${orderId}`, orderData);
  return response.data;
}

export const sendOrderBill = async (orderId, payload) => {
  const response = await axiosClient.post(`/api/staff/orders/${orderId}/send-bill`, payload);
  return response.data;
}

export const getMenuItems = async (hotelId, category = '', available = 'all') => {
  const response = await axiosClient.get('/api/staff/menu-items', {
    params: { hotelId, category, available }
  });
  return response.data;
}

export const updateProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append("profilePicture", file);

  const response = await axiosClient.patch("/api/staff/profile-picture", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}