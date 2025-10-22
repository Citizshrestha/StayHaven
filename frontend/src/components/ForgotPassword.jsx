import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendResetPasswordOtp } from '../api/auth';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await sendResetPasswordOtp(email);
      if (response.success) {
        toast.success('Password reset OTP sent to your email');
        // Store email for the reset process
        localStorage.setItem('resetEmail', email);
        navigate('/reset-password');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(error.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1531971589569-0d9370cbe1e5?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1181')",
        }}
      />

      {/* Form Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-10">
        <div className="bg-slate-900/40 rounded-3xl h-[250px] p-12 w-[430px] max-w-lg shadow-2xl border border-white/20 transform hover:scale-[1.01] transition-all duration-300">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div 
              style={{marginTop: "10px"}}
            className="flex items-center justify-center gap-3 mb-6">
              <div 
              className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-white text-xl font-light tracking-wider">
                Stay<span className="font-bold text-teal-400">Haven</span>
              </span>
            </div>
            <h2 className="text-[#F9FAFB] text-2xl font-light mb-2 tracking-tight">
              Forgot Password
            </h2>
            <p className="text-[#F9FAFB] text-sm">Enter your email to reset your password</p>
          </div>

          <form onSubmit={handleSubmit}
          style={{marginTop: "10px"}}
           className="space-y-6 ">
            {/* Email Field */}
            <div>
              <label 
              style={{marginLeft: "40px"}}
              className="block text-white text-sm font-medium mb-2 ml-10">
                Email Address
              </label>
              <input
                type="email"
                value={email}
              style={{marginLeft: "40px"}}

                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-[80%] h-[40px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 ml-10"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{marginLeft: "40px", marginTop: "10px"}}

              className="w-[80%] h-[40px] bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed ml-10"
            >
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>

            {/* Back to Login */}
            <div className="text-center pt-4">
              <span className="text-white text-sm">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-[#08f0d9] font-semibold transition-colors duration-200 hover:underline"
                >
                  Sign in
                </button>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
