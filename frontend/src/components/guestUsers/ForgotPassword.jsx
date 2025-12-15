import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../api/staff";
import { toast } from "react-toastify";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Email is required");

    setLoading(true);
    try {
      const res = await forgotPassword(email);
      if (res.success) {
        toast.success("Password reset link sent to your email");
        navigate("/staff/reset-password");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-500 mt-1">Enter your work email to receive a reset link.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-gray-700 font-semibold text-sm mb-2">Work Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full bg-gray-50 text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 h-12 px-4"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl h-12 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/staff/login")}
            className="w-full mt-3 text-teal-600 hover:underline"
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
