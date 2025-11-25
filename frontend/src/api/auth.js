import axiosClient from "../axiosClient";
import axios from "axios";

export const login = async (email, password) => {
  try {
    const response = await axiosClient.post("/api/auth/login", { email, password });
    if (response.data.accessToken) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("userId", response.data._id);
      localStorage.setItem("email", response.data.email);
      localStorage.setItem("username", response.data.username);
      localStorage.setItem("role", response.data.role || 'guest');
      if (response.data.profilePicture) {
        localStorage.setItem("profilePicture", response.data.profilePicture);
      }
      axiosClient.defaults.headers.Authorization = `Bearer ${response.data.accessToken}`;
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Login API Error:", error.response.data);
    } else {
      console.error("Login API Error:", error.message);
    }
    throw error;
  }
};

export const register = async (
  userId,
  email,
  fullname,
  username,
  password,
  gender,
  dob,
  profilePicture
) => {
  try {
    const response = await axiosClient.post("/api/auth/register", {
      userId,
      email,
      fullname,
      username,
      password,
      gender,
      dob,
      profilePicture,
    });
    if (response.data.tokens?.accessToken) {
      localStorage.setItem("accessToken", response.data.tokens.accessToken);
      localStorage.setItem("userId", response.data.user.id);
      localStorage.setItem("username", response.data.user.username);
      axiosClient.defaults.headers.Authorization = `Bearer ${response.data.tokens.accessToken}`;
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Registration API Error:", error.response.data);
    } else {
      console.error("Registration Error:", error.message);
    }
    throw error;
  }
};

export const googleLogin = async (credential) => {
  try {
    const res = await axiosClient.post("/api/auth/google-login", { credential });
    if (res.data.accessToken) {
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("userId", res.data._id);
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("email", res.data.email);
      localStorage.setItem("role", res.data.role || 'guest');
      if (res.data.profilePicture) {
        localStorage.setItem("profilePicture", res.data.profilePicture);
      }
      axiosClient.defaults.headers.Authorization = `Bearer ${res.data.accessToken}`;
    }
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Google Login API Error: ", error.response.data);
    } else {
      console.error("Google Login API Error: ", error.message);
    }
    throw error;
  }
};

export const googleRegister = async (credential) => {
  try {
    const res = await axiosClient.post("/api/auth/google-register", { credential });
    if (res.data.accessToken) {
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("userId", res.data._id);
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("email", res.data.email);
      localStorage.setItem("role", res.data.role || 'guest');
      if (res.data.profilePicture) {
        localStorage.setItem("profilePicture", res.data.profilePicture);
      }
      axiosClient.defaults.headers.Authorization = `Bearer ${res.data.accessToken}`;
    }
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Google Register API Error: ", error.response.data);
    } else {
      console.error("Google Register API Error: ", error.message);
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    await axiosClient.post("/api/auth/logout");
    localStorage.clear();
    delete axiosClient.defaults.headers.Authorization;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Logout API Error:", error.response.data);
    } else {
      console.error("Logout API Error:", error.message);
    }
    localStorage.clear();
    delete axiosClient.defaults.headers.Authorization;
    throw error;
  }
};

export const sendOtpEmailVerification = async (userId) => {
  try {
    const response = await axiosClient.post("/api/auth/sendOtpEmailVerification", { userId });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Send OTP Email Verification API Error:", error.response.data);
    } else {
      console.error("Send OTP Email Verification Error:", error.message);
    }
    throw error;
  }
};

export const verifyEmail = async (userId, otp) => {
  try {
    const response = await axiosClient.post("/api/auth/verifyEmail", { userId, otp });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Verify Email API Error:", error.response.data);
    } else {
      console.error("Verify Email Error:", error.message);
    }
    throw error;
  }
};

export const sendSignupOtp = async (email, signupFormData) => {
  try {
    const response = await axiosClient.post("/api/auth/sendSignupOtp", { email, signupFormData });
    if (response.data.success && response.data.userId) {
      localStorage.setItem("signupUserId", response.data.userId);
    }
    return response.data;
  } catch (error) {
    console.error("Send Signup OTP API Error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      details: axios.isAxiosError(error) ? error.response?.data : error,
    });
    throw error;
  }
};

export const verifySignupOtp = async (userId, otp) => {
  try {
    const response = await axiosClient.post("/api/auth/verifySignupOtp", { userId, otp });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Verify Signup OTP API Error:", error.response.data);
    } else {
      console.error("Verify Signup OTP Error:", error.message);
    }
    throw error;
  }
};

export const isAuthenticated = async (userId) => {
  try {
    const response = await axiosClient.post("/api/auth/isAuth", { userId });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Is Authenticated API Error:", error.response.data);
    } else {
      console.error("Is Authenticated Error:", error.message);
    }
    throw error;
  }
};

export const sendResetPasswordOtp = async (email) => {
  try {
    const response = await axiosClient.post("/api/auth/sendResetPasswordOtp", { email });
    if (response.data.success && response.data.userId) {
      localStorage.setItem("userId", response.data.userId);
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Send Reset Password OTP Error:", error.response.data);
    } else {
      console.error("Send Reset Password OTP Error:", error.message);
    }
    throw error;
  }
};

export const verifyResetPasswordOtp = async (userId, otp) => {
  try {
    const response = await axiosClient.post("/api/auth/verifyResetPasswordOtp", { userId, otp });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Verify Reset Password OTP API Error:", error.response.data);
    } else {
      console.error("Verify Reset Password OTP Error:", error.message);
    }
    throw error;
  }
};

export const resetPassword = async (userId, newPassword) => {
  try {
    const response = await axiosClient.post("/api/auth/resetPassword", { userId, newPassword });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Reset Password API Error:", error.response.data);
    } else {
      console.error("Reset Password Error:", error.message);
    }
    throw error;
  }
};

export const checkUserExists = async (email) => {
  try {
    const response = await axiosClient.get(`/api/auth/check?email=${encodeURIComponent(email)}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Check User Exists API Error:", error.response.data);
    } else {
      console.error("Check User Exists API Error:", error.message);
    }
    throw error;
  }
};

export const changePassword = async (newPassword) => {
  try {
    const response = await axiosClient.post("/api/auth/change-password", {
      newPassword,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Change Password API Error:", error.response.data);
    } else {
      console.error("Change Password Error:", error.message);
    }
    throw error;
  }
};
