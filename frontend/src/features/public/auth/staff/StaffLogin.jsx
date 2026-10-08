import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { staffLogin } from "../../../../core/api/services/staff.service";
import { useStaffAuth } from "../../../../core/context/StaffAuthContext";
import { toast } from "react-toastify";
import { usePageMeta } from "../../hotels/lib/pageMeta";

const StaffLogin = () => {
  const navigate = useNavigate();
  const { login } = useStaffAuth();
  usePageMeta({ title: "Staff sign in", description: "StayHaven staff portal sign in for hotel teams." });

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberDevice: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (error) setError("");
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError("Please enter your work email and password.");
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
        // Only follow same-site paths from the server ("/x"), never "//host" or full URLs.
        if (typeof response.redirectPath === "string" && /^\/(?!\/)/.test(response.redirectPath)) {
          navigate(response.redirectPath);
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      const status = error.response?.status;
      // Show the server's own message (wrong password, account locked for 30 minutes, too many attempts).
      setError(
        error.response?.data?.message ||
          (status === 429 ? "Too many attempts. Please wait a few minutes and try again."
            : !error.response ? "Cannot reach the server. Check your connection and try again."
              : "Login failed. Please check your credentials.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordClick = async () => {
    try {

      navigate("/staff/forgot-password");

    } catch (err) {
      toast.error("Some Error Occured", err.message);
    }
  };

  const handleGuestBookings = () => {
    navigate("/");
  };

  return (
    <div
      className="w-full flex flex-col lg:flex-row fixed inset-0 overflow-y-auto lg:overflow-hidden"
      style={{ height: "100dvh" }}
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
          <div style={{ marginTop: "20rem", }}>
            <div style={{ marginBottom: "24px", marginTop: "45px" }}>
              <h1
                className="text-white font-bold"
                style={{ fontFamily: "Nunito", color: "#FFF", fontSize: "32px", marginRight: "30rem" }}
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
        className="flex-1 lg:w-1/2 bg-[#F8F9FB] flex items-center justify-center relative"
        style={{ padding: "16px", minHeight: "100%" }}
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
          className="w-full bg-white lg:bg-transparent rounded-2xl lg:rounded-none shadow-xl lg:shadow-none p-5 sm:p-8 my-auto"
          style={{ maxWidth: "400px" }}
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
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium" style={{ padding: "12px 16px", marginBottom: "20px" }}>
                {error}
              </div>
            )}
            {/* Email Field */}
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="staff-email"
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
                  id="staff-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your work email"
                  className="w-full bg-gray-50 text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
                  style={{ height: "48px", paddingLeft: "48px", paddingRight: "16px", fontSize: "16px" }}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="staff-password"
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
                  id="staff-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="w-full bg-gray-50 text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
                  style={{ height: "48px", paddingLeft: "48px", paddingRight: "48px", fontSize: "16px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200 flex items-center justify-center"
                  style={{ right: "2px", width: "44px", height: "44px" }}
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
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer" style={{ fontSize: "14px", minHeight: "44px" }}>
                <input
                  type="checkbox"
                  name="rememberDevice"
                  checked={formData.rememberDevice}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-teal-500 focus:ring-teal-500 focus:ring-2"
                  style={{ width: "20px", height: "20px" }}
                />
                Remember this device
              </label>
              <button
                onClick={handleForgotPasswordClick}
                type="button"
                className="text-teal-600 font-medium hover:text-teal-700 hover:underline transition-colors duration-200"
                style={{ fontSize: "14px", minHeight: "44px", padding: "0 4px" }}
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
              Don't have staff credentials? Ask your hotel administrator to invite you.
            </p>
            <p className="text-gray-400" style={{ fontSize: "12px", marginTop: "8px" }}>
              Looking to book a stay?{" "}
              <button
                type="button"
                onClick={handleGuestBookings}
                className="text-teal-600 hover:underline"
                style={{ minHeight: "44px", padding: "0 4px" }}
              >
                Go to the guest site
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
