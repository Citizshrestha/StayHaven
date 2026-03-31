import { resetPassword } from "../../../../api/staff";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify";


const StaffResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/staff/forgot-password");
      toast.error("Invalid or Expired Reset Link");
    }


  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await resetPassword(token, newPassword);
      if (response.success) {
        toast.success("Password reset successfully!. Please login with your new password. ");
        setTimeout(() => {
          navigate("/staff/login");
        }, 500);
      }
    } catch {
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      className="w-full flex flex-col lg:flex-row "
      style={{ minHeight: "100vh" }}
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
          {/* Bottom Content */}
          <div style={{ marginTop: "20rem" }}>
            <div style={{ marginBottom: "24px" }}>
              <h1
                className="text-white font-bold"
                style={{ fontFamily: "Nunito", color: "#FFF", fontSize: "32px", marginRight: "30rem" }}
              >
                Reset Your Password
              </h1>
              <p className="text-white/70" style={{ fontSize: "16px" }}>
                Choose a strong password to secure your account.
              </p>
            </div>
            {/* Security Features */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold" style={{ fontSize: "14px", marginBottom: "2px" }}>
                    Secure & encrypted
                  </h4>
                  <p className="text-white/50" style={{ fontSize: "13px" }}>
                    Your password is securely hashed and never stored in plain text.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Right Panel - Reset Password Form */}
      <div
        className="flex-1 lg:w-1/2 bg-[#F8F9FB] flex items-center justify-center"
        style={{ padding: "24px", height: "100%", overflow: "auto" }}
      >
        {/* Mobile Background */}
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
            {/* Icon */}
            <div
              className="mx-auto bg-teal-100 rounded-full flex items-center justify-center"
              style={{ width: "64px", height: "64px", marginBottom: "20px", marginLeft: "7rem" }}
            >
              <svg
                className="text-teal-500"
                style={{ width: "32px", height: "32px" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <h1
              className="font-bold text-gray-900 tracking-tight"
              style={{ fontFamily: "Nunito", fontSize: "28px", marginBottom: "8px" }}
            >
              Create New Password
            </h1>
            <p className="text-gray-600" style={{ fontSize: "15px", marginBottom: "4px" }}>
              Your new password must be different from previous passwords
            </p>
          </div>
          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* New Password Field */}
            <div style={{ marginBottom: "20px" }}>
              <label
                className="block text-gray-700 font-semibold"
                style={{ fontSize: "14px", marginBottom: "8px" }}
              >
                New Password
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
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-gray-50 text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
                  style={{ height: "48px", paddingLeft: "48px", paddingRight: "48px", fontSize: "14px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  style={{ right: "16px" }}
                >
                  <svg
                    style={{ width: "18px", height: "18px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {showPassword ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    )}
                  </svg>
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>
            {/* Confirm Password Field */}
            <div style={{ marginBottom: "24px" }}>
              <label
                className="block text-gray-700 font-semibold"
                style={{ fontSize: "14px", marginBottom: "8px" }}
              >
                Confirm Password
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
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-gray-50 text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
                  style={{ height: "48px", paddingLeft: "48px", paddingRight: "48px", fontSize: "14px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  style={{ right: "16px" }}
                >
                  <svg
                    style={{ width: "18px", height: "18px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {showConfirmPassword ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </div>
            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg"
              style={{ height: "48px", fontSize: "15px", marginBottom: "16px" }}
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
                  Resetting Password...
                </span>
              ) : (
                "Reset Password"
              )}
            </button>
            {/* Back to Login */}
            <button
              type="button"
              onClick={() => navigate("/staff/login")}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
              style={{ height: "48px", fontSize: "15px" }}
            >
              <span className="flex items-center justify-center gap-2">
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Login
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default StaffResetPassword