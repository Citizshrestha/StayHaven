import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../api/staff";
import { toast } from "react-toastify";

const StaffForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword(email);

      if (response.success) {
        setEmailSent(true);
        toast.success("Password reset link sent to your email!");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error(
        error.response?.data?.message || "Failed to send reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/staff/login");
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

          {/* Bottom Content */}
          <div style={{ marginTop: "20rem" }}>
            <div style={{ marginBottom: "24px" }}>
              <h1
                className="text-white font-bold"
                style={{ fontFamily: "Nunito", color:"#FFF", fontSize: "32px", marginRight: "30rem" }}
              >
                Password Recovery
              </h1>
              <p className="text-white/70" style={{ fontSize: "16px" }}>
                We'll help you get back into your account securely.
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold" style={{ fontSize: "14px", marginBottom: "2px" }}>
                    Secure verification
                  </h4>
                  <p className="text-white/50" style={{ fontSize: "13px" }}>
                    We'll send a secure link to your registered email address.
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold" style={{ fontSize: "14px", marginBottom: "2px" }}>
                    Quick process
                  </h4>
                  <p className="text-white/50" style={{ fontSize: "13px" }}>
                    Reset your password and regain access in minutes.
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
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold" style={{ fontSize: "14px", marginBottom: "2px" }}>
                    Protected access
                  </h4>
                  <p className="text-white/50" style={{ fontSize: "13px" }}>
                    Your account security is our top priority.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Forgot Password Form */}
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
          {!emailSent ? (
            <>
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
                  Forgot Password?
                </h1>
                <p className="text-gray-600" style={{ fontSize: "15px", marginBottom: "4px" }}>
                  No worries, we'll send you reset instructions
                </p>
                <p className="text-gray-400" style={{ fontSize: "13px" }}>
                  Enter your work email to receive a password reset link
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {/* Email Field */}
                <div style={{ marginBottom: "24px" }}>
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your work email"
                      className="w-full bg-gray-50 text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
                      style={{ height: "48px", paddingLeft: "48px", paddingRight: "16px", fontSize: "14px" }}
                      required
                    />
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
                      Sending reset link...
                    </span>
                  ) : (
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
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Send Reset Link
                    </span>
                  )}
                </button>

                {/* Back to Login Button */}
                <button
                  type="button"
                  onClick={handleBackToLogin}
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
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
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

                {/* Success Icon */}
                <div 
                  className="mx-auto bg-green-100 rounded-full flex items-center justify-center"
                  style={{ width: "80px", height: "80px", marginBottom: "24px", marginLeft: "6.5rem" }}
                >
                  <svg
                    className="text-green-500"
                    style={{ width: "40px", height: "40px" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                    />
                  </svg>
                </div>

                <h1
                  className="font-bold text-gray-900 tracking-tight"
                  style={{ fontFamily: "Nunito", fontSize: "28px", marginBottom: "12px" }}
                >
                  Check Your Email
                </h1>
                <p className="text-gray-600" style={{ fontSize: "15px", marginBottom: "8px" }}>
                  We've sent password reset instructions to
                </p>
                <p className="text-teal-600 font-semibold" style={{ fontSize: "15px", marginBottom: "24px" }}>
                  {email}
                </p>

                {/* Info Box */}
                <div 
                  className="bg-blue-50 border border-blue-200 rounded-xl text-left"
                  style={{ padding: "16px", marginBottom: "24px" }}
                >
                  <div className="flex gap-3">
                    <svg
                      className="text-blue-500 shrink-0"
                      style={{ width: "20px", height: "20px", marginTop: "2px" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-blue-900 font-medium" style={{ fontSize: "13px", marginBottom: "4px" }}>
                        Didn't receive the email?
                      </p>
                      <p className="text-blue-700" style={{ fontSize: "12px" }}>
                        Check your spam folder or try resending the link after a few minutes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <button
                  onClick={() => setEmailSent(false)}
                  className="w-full bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  style={{ height: "48px", fontSize: "15px", marginBottom: "12px" }}
                >
                  Resend Email
                </button>

                <button
                  onClick={handleBackToLogin}
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
              </div>
            </>
          )}

          {/* Footer */}
          <div className="text-center" style={{ marginTop: "32px" }}>
            <p className="text-gray-400" style={{ fontSize: "12px" }}>
              Need immediate help?{" "}
              <button
                type="button"
                className="text-teal-500 hover:underline font-medium"
              >
                Contact IT Support
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffForgotPassword;