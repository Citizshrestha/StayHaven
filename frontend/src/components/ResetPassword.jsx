import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyResetPasswordOtp, resetPassword } from '../api/auth';
import { toast } from 'react-toastify';

const ResetPassword = () => {
  const [step, setStep] = useState(1); // 1 = OTP verification, 2 = New password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have the reset email from the previous step
    const resetEmail = localStorage.getItem('resetEmail');
    const storedUserId = localStorage.getItem('userId');
    
    if (!resetEmail && !storedUserId) {
      toast.error('Please start the password reset process from the beginning');
      navigate('/forgot-password');
    }
    
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, [navigate]);

  const handleOtpVerification = async (e) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      toast.error('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyResetPasswordOtp(userId, otp);
      if (response.success) {
        toast.success('OTP verified successfully');
        setStep(2);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(userId, newPassword);
      if (response.success) {
        toast.success('Password reset successfully! You can now log in.');
        // Clean up stored data
        localStorage.removeItem('resetEmail');
        localStorage.removeItem('userId');
        navigate('/login');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
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
        <div className="bg-slate-900/40 rounded-3xl p-12 w-[440px] max-w-lg shadow-2xl border border-white/20 transform hover:scale-[1.01] transition-all duration-300">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div 
              style={{marginTop: "10px"}}
            className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-white text-xl font-light tracking-wider">
                Stay<span className="font-bold text-teal-400">Haven</span>
              </span>
            </div>
            <h2 className="text-[#F9FAFB] text-2xl font-light mb-2 tracking-tight">
              {step === 1 ? 'Verify OTP' : 'Reset Password'}
            </h2>
            <p className="text-[#F9FAFB] text-sm">
              {step === 1 ? 'Enter the OTP sent to your email' : 'Enter your new password'}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleOtpVerification} className="space-y-6">
              {/* OTP Field */}
              <div>
                <label 
                style={{marginLeft: "40px", marginTop: "10px"}}

                className="block text-white text-sm font-medium mb-2 ml-10">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  style={{marginLeft: "40px"}}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-[80%] h-[40px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 text-center text-lg tracking-widest ml-10"
                  maxLength="6"
                  required
                />
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading}
                style={{marginLeft: "40px", marginTop:"10px"}}
                className="w-[80%] h-[40px] bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed ml-10"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              {/* New Password Field */}
              <div>
                <label 
                style={{marginTop: "10px", marginLeft: "40px"}}
                className="block text-white text-sm font-medium mb-2 ml-10">
                  New Password
                </label>
                <div className="relative w-[80%] ml-10">
                  <input
                   style={{marginLeft: "40px"}}
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full h-[40px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 pr-12 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 left-90 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label 
                  style={{marginLeft: "40px"}}
                className="block text-white text-sm font-medium mb-2 ml-10">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  style={{marginLeft: "40px"}}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-[80%] h-[40px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 ml-10"
                  required
                />
              </div>

              {/* Reset Button */}
              <button
                type="submit"
                  style={{marginLeft: "40px", marginTop: "10px"}}
                disabled={loading}
                className="w-[80%] h-[40px] bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed ml-10"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Back to Login */}
          <div className="text-center pt-6">
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
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
