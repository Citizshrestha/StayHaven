import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { resetPassword } from "../../api/staff";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const t = query.get("token");
    if (t) setToken(t);
  }, [query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirm) return toast.error("Please fill all fields");
    if (password !== confirm) return toast.error("Passwords do not match");
    if (!token) return toast.error("Invalid or missing reset token");

    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      if (res.success) {
        toast.success("Password reset successful. Please login.");
        navigate("/staff/login");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-500 mt-1">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-gray-700 font-semibold text-sm mb-2">New Password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            className="w-full bg-gray-50 text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 h-12 px-4"
          />

          <label className="block text-gray-700 font-semibold text-sm mt-4 mb-2">Confirm Password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="********"
            className="w-full bg-gray-50 text-gray-800 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 h-12 px-4"
          />

          <div className="flex items-center gap-2 mt-3">
            <input
              id="show"
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            <label htmlFor="show" className="text-sm text-gray-600">Show passwords</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl h-12 disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset Password"}
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

export default ResetPassword;
