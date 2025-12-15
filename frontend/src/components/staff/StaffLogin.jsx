import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {  staffLogin } from "../../api/staff";
import { useStaffAuth } from "../../context/StaffAuthContext";
import { toast } from "react-toastify";

const StaffLogin = () => {
  const navigate = useNavigate();
  const { login } = useStaffAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberDevice: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await staffLogin(formData.email, formData.password);

      if (response.success) {
        toast.success(`Welcome back, ${response.user.fullname}!`);
        // Save user to auth context so other components can access it
        login(response.user);
        
        // Redirect based on role
        if (response.redirectPath) {
          navigate(response.redirectPath);
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Staff login error:", error);
      toast.error(
        error.response?.data?.message || "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  // const handleForgotPassword = async() => {
  //    try {
  //       const response =  await forgotPassword(formData.email);
  //       if (response.success){
  //         navigate("/staff/forgot-password");
  //       }
  //    } catch (err) {
  //       toast.error("Some Error Occured", err.message);
  //    }
  // };

  const handleGuestBookings = () => {
    navigate("/");
  };

  return (
    <div 
      className="w-full flex flex-col lg:flex-row fixed inset-0"
      style={{ height: "100vh", overflow: "hidden" }}
    >
      {/* Left Panel - Branding (Hidden on mobile) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(20, 184, 166, 0.4) 100%)",
        }}
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full w-full" style={{ padding: "40px" }}>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <span
              className="text-white text-xl font-light tracking-wider"
              style={{ fontFamily: "Nunito" }}
            >
              Stay<span className="font-bold">Haven</span>
            </span>
          </div>


          {/* Bottom Content - Features */}
          <div style={{ marginTop: "20rem",  }}>
            <div style={{ marginBottom: "24px" }}>
              <h1
                className="text-white font-bold"
                style={{ fontFamily: "Nunito",color:"#FFF", fontSize: "32px",  marginRight: "30rem" }}
              >
                Staff Portal
              </h1>
              <p className="text-white/70" style={{ fontSize: "16px" }}>
                Manage orders, serve guests, deliver excellence.
              </p>
            </div>

            {/* Feature List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Feature 1 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div 
                  className="rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0"
                  style={{ width: "40px", height: "40px" }}
                >
                  <svg
                    className="text-teal-300"
                    style={{ width: "20px", height: "20px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold" style={{ fontSize: "14px", marginBottom: "2px" }}>
                    Real-time order management
                  </h4>
                  <p className="text-white/50" style={{ fontSize: "13px" }}>
                    View and update guest orders instantly from any device.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div 
                  className="rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0"
                  style={{ width: "40px", height: "40px" }}
                >
                  <svg
                    className="text-teal-300"
                    style={{ width: "20px", height: "20px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold" style={{ fontSize: "14px", marginBottom: "2px" }}>
                    Track your performance
                  </h4>
                  <p className="text-white/50" style={{ fontSize: "13px" }}>
                    Access your performance metrics and guest feedback.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div 
                  className="rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0"
                  style={{ width: "40px", height: "40px" }}
                >
                  <svg
                    className="text-teal-300"
                    style={{ width: "20px", height: "20px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold" style={{ fontSize: "14px", marginBottom: "2px" }}>
                    Instant notifications
                  </h4>
                  <p className="text-white/50" style={{ fontSize: "13px" }}>
                    Receive alerts for new orders and important updates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div 
        className="flex-1 lg:w-1/2 bg-[#F8F9FB] flex items-center justify-center"
        style={{ padding: "24px", height: "100%", overflow: "hidden" }}
      >
        {/* Mobile Background (visible only on mobile) */}
        <div
          className="lg:hidden absolute inset-0 -z-10"
          style={{
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(20, 184, 166, 0.5) 100%)",
          }}
        />
        <div
          className="lg:hidden absolute inset-0 -z-20"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Form Card */}
        <div 
          className="w-full bg-white lg:bg-transparent rounded-2xl lg:rounded-none shadow-xl lg:shadow-none"
          style={{ maxWidth: "400px", padding: "32px" }}
        >
          {/* Header */}
          <div className="text-center" style={{ marginBottom: "32px" }}>
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3" style={{ marginBottom: "24px" }}>
              <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <span
                className="text-gray-800 text-xl font-light tracking-wider"
                style={{ fontFamily: "Nunito" }}
              >
                Stay<span className="font-bold text-teal-500">Haven</span>
              </span>
            </div>

            <h1
              className="font-bold text-gray-900 tracking-tight"
              style={{ fontFamily: "Nunito", fontSize: "28px", marginBottom: "8px" }}
            >
              STAFF PORTAL
            </h1>
            <p className="text-gray-600" style={{ fontSize: "15px", marginBottom: "4px" }}>
              Sign in to your dashboard
            </p>
            <p className="text-gray-400" style={{ fontSize: "13px" }}>
              Access restricted to authorized personnel only.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: "20px" }}>
              <label 
                className="block text-gray-700 font-semibold"
                style={{ fontSize: "14px", marginBottom: "8px" }}
              >
                Work Email
              </label>
              <div className="relative">
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 text-gray-400"
                  style={{ left: "16px" }}
                >
                  <svg
                    style={{ width: "18px", height: "18px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your work email"
                  className="w-full bg-gray-50 text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
                  style={{ height: "48px", paddingLeft: "48px", paddingRight: "16px", fontSize: "14px" }}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: "20px" }}>
              <label 
                className="block text-gray-700 font-semibold"
                style={{ fontSize: "14px", marginBottom: "8px" }}
              >
                Password
              </label>
              <div className="relative">
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 text-gray-400"
                  style={{ left: "16px" }}
                >
                  <svg
                    style={{ width: "18px", height: "18px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="w-full bg-gray-50 text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
                  style={{ height: "48px", paddingLeft: "48px", paddingRight: "48px", fontSize: "14px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  style={{ right: "16px" }}
                >
                  {showPassword ? (
                    <svg
                      style={{ width: "20px", height: "20px" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      style={{ width: "20px", height: "20px" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div 
              className="flex items-center justify-between"
              style={{ marginBottom: "24px" }}
            >
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer" style={{ fontSize: "14px" }}>
                <input
                  type="checkbox"
                  name="rememberDevice"
                  checked={formData.rememberDevice}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-teal-500 focus:ring-teal-500 focus:ring-2"
                  style={{ width: "16px", height: "16px" }}
                />
                Remember this device
              </label>
              <button
                type="button"
                className="text-teal-500 font-medium hover:text-teal-600 hover:underline transition-colors duration-200"
                style={{ fontSize: "14px" }}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg"
              style={{ height: "48px", fontSize: "15px" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin text-white"
                    style={{ width: "20px", height: "20px" }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center" style={{ marginTop: "32px" }}>
            <p className="text-gray-500" style={{ fontSize: "14px" }}>
              Don't have staff credentials?{" "}
              <button
                type="button"
                className="text-teal-500 font-semibold hover:text-teal-600 hover:underline transition-colors duration-200"
              >
                Contact your administrator
              </button>
            </p>
            <p className="text-gray-400" style={{ fontSize: "12px", marginTop: "8px" }}>
              For guest bookings, visit{" "}
              <button
                type="button"
                onClick={handleGuestBookings}
                className="text-teal-500 hover:underline"
              >
                stayhaven.com
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
