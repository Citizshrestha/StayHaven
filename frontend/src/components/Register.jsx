import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {  googleRegister, sendSignupOtp, verifySignupOtp, checkUserExists } from '../api/auth';
import { toast } from 'react-toastify';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import GoogleConfirmModal from './GoogleConfirmModal';

const Register = () => {
   const navigate = useNavigate();

    const handleLoginClick = () => {
    navigate('/login')
  }
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState(null);
  const [currentCredential, setCurrentCredential] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    
    if (!formData.agreeToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      // Check if user already exists
      const existsResponse = await checkUserExists(formData.email);
      if (existsResponse.exists) {
        toast.error('This email is already registered. Please log in.');
        setLoading(false);
        return;
      }

      // Send OTP for signup verification
      const signupFormData = {
        fullname: formData.fullName, 
        email: formData.email,
        password: formData.password,
        username: formData.email.split('@')[0] // Generate username from email
      };

      const response = await sendSignupOtp(formData.email, signupFormData);
      if (response.success) {
        setUserEmail(formData.email);
        setOtpStep(true);
        toast.success('OTP sent to your email. Please check your inbox.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await verifySignupOtp(userEmail, otp); // userEmail is used as userId in this flow
      if (response.success) {
        toast.success('Registration successful! You can now log in.');
        // Clear any stored data
        setOtpStep(false);
        setOtp('');
        setUserEmail('');
        navigate('/login');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google.");
      }

      // Decode the JWT to get user info for confirmation modal
      const decoded = jwtDecode(credentialResponse.credential);
      setGoogleUserInfo({
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture
      });
      setCurrentCredential(credentialResponse.credential);
      setShowGoogleModal(true);
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error('Failed to process Google account information. Please try again.');
    }
  };

  const handleGoogleError = () => {
    const errorMessage = "Google Sign Up failed. Please try again.";
    toast.error(errorMessage);
  };

  const handleGoogleConfirm = async () => {
    setLoading(true);
    try {
      const registerResult = await googleRegister(currentCredential);
      if (registerResult.success) {
        toast.success('Your account has been successfully registered! Please login to enter the dashboard.');
        setShowGoogleModal(false);
        // Redirect to login page after successful registration
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (error) {
      console.error('Google registration error:', error);
      let errorMessage = 'Google registration failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        // Handle specific error cases for already registered accounts
        if (errorMessage.includes('already registered') || 
            errorMessage.includes('already exists') || 
            errorMessage.includes('User already exists') ||
            errorMessage.includes('Account already exists')) {
          toast.error('This Google account is already registered. Please use the login page to sign in.');
          setShowGoogleModal(false);
          // Redirect to login page after showing error
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCancel = () => {
    setShowGoogleModal(false);
    setGoogleUserInfo(null);
    setCurrentCredential(null);
    toast.info("Google registration cancelled by user.");
  };

  const handleAppleSignup = () => {
    // Apple Sign-In implementation will be added here
    toast.info("Apple Sign-In is coming soon! Please use Google or email registration for now.");
  };

  const handlePassVisibility = () => {
    setShowPassword(!showPassword);
  };

  // No need to load Google Sign-In script manually when using @react-oauth/google

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background Image with High Quality */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1531971589569-0d9370cbe1e5?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1181')",
        }}
      >
        
      </div>

      {/* Register Form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="bg-slate-900/40 rounded-3xl p-6 sm:p-8 md:p-12 w-[440px] max-w-[95%] sm:max-w-md md:max-w-lg shadow-2xl border border-white/20 transform hover:scale-[1.01] transition-all duration-300 flex flex-col justify-center">
          {/* Logo and Title */}
          <div className="text-center mb-4 sm:mb-6">
            <div 
            className="flex items-center justify-center gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-white text-lg sm:text-xl font-light tracking-wider" style={{fontFamily: 'Nunito'}}>
                Stay<span className="font-bold text-teal-400">Haven</span>
              </span>
            </div>
            <h2 className="text-[#F9FAFB] text-xl sm:text-2xl font-light mb-2 tracking-tight">
              Create Account
            </h2>
            <p className="text-[#F9FAFB] text-xs sm:text-sm">Join us to start your journey</p>
          </div>

          {!otpStep ? (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" >
            {/* Google Signup Button */}
            <div className="px-4 sm:px-8 md:px-10" style={{paddingLeft: "3.5rem"}}>
              <div className="w-[80%] mx-auto">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  ux_mode="popup"
                  text="continue_with"
                  shape="rectangular"
                  theme="filled_blue"
                  size="large"
                  width="100%"
                />
              </div>
            </div>

            {/* Apple Signup Button */}
            <div className="px-4 sm:px-8 md:px-10" style={{marginTop: "6px", paddingLeft: "3.5rem"}}>
              <button
              type="button"
                onClick={handleAppleSignup}
                disabled={loading}
                className="w-[80%] mx-auto h-[44px] sm:h-[48px] bg-white hover:bg-white/90 text-black font-medium rounded-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 px-4 sm:px-8 md:px-10" style={{marginTop: "5px"}}>
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-white text-sm font-medium">or</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Full Name Field */}
            <div className="px-4 sm:px-8 md:px-10" style={{paddingLeft: "3.5rem"}}>
              <label
              className="block text-white text-xs sm:text-sm font-medium mb-2 w-[80%] mx-auto">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className="w-[80%] mx-auto block h-[40px] sm:h-[44px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 text-sm sm:text-base"
                required
              />
            </div>

            {/* Email Field */}
            <div className="px-4 sm:px-8 md:px-10" style={{paddingLeft: "3.5rem"}}>
              <label
              className="block text-white text-xs sm:text-sm font-medium mb-2 w-[80%] mx-auto">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                className="w-[80%] mx-auto block h-[40px] sm:h-[44px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 text-sm sm:text-base"
                required
              />
            </div>

            {/* Password Field */}
            <div className="px-4 sm:px-8 md:px-10" style={{paddingLeft: "3.5rem"}}>
              <label
              className="block text-white text-xs sm:text-sm font-medium mb-2 w-[80%] mx-auto">
                Password
              </label>
              <div className="relative w-[80%] mx-auto">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="w-full h-[40px] sm:h-[44px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 pr-12 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 text-sm sm:text-base"
                  required
                />
                <button
                  type="button"
                  onClick={handlePassVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
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
            <div className="px-4 sm:px-8 md:px-10" style={{paddingLeft: "3.5rem"}}>
              <label
              className="block text-white text-xs sm:text-sm font-medium mb-2 w-[80%] mx-auto">
                Confirm Password
              </label>
              <div className="relative w-[80%] mx-auto">
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  className="w-full h-[40px] sm:h-[44px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 pr-12 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 text-sm sm:text-base"
                  required
                />
                <button
                  type="button"
                  onClick={handlePassVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
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

            {/* Terms and Conditions */}
            <div
            className="flex items-start gap-2 px-4 sm:px-8 md:px-10" style={{paddingLeft: "3.5rem", }}>
              <div className="w-[80%] mx-auto flex items-start gap-2" >
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  style={{marginTop: "6px"}}
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="w-4 h-4 bg-gray-50 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 mt-1 flex-shrink-0"
                  required
                />
                <label 
                  style={{marginTop: "4px"}}
                className="text-white text-xs sm:text-sm leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    className="text-[#08F0D9] hover:underline font-medium transition-colors duration-200"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    className="text-[#08F0D9] hover:underline font-medium transition-colors duration-200"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>
            </div>

            {/* Register Button */}
            <div className="px-4 sm:px-8 md:px-10" style={{paddingLeft: "3.5rem"}}>
              <button
                type="submit"
                disabled={loading}
                className="w-[80%] mx-auto block h-[40px] sm:h-[44px] bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? 'Sending OTP...' : 'Create Account'}
              </button>
            </div>

            {/* Sign In Link */}
            <div 
            className="text-center pt-2">
              <span className="text-white text-xs sm:text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="text-[#08f0d9] font-semibold transition-colors duration-200"
                >
                  Sign in
                </button>
              </span>
            </div>
          </form>
          ) : (
          <form onSubmit={handleOtpVerification} className="space-y-4">
            <div className="text-center mb-4 px-4">
              <h3 className="text-white text-base sm:text-lg font-medium mb-2">Verify Your Email</h3>
              <p className="text-gray-300 text-xs sm:text-sm break-words">We've sent a verification code to {userEmail}</p>
            </div>

            {/* OTP Input */}
            <div className="px-4 sm:px-8 md:px-10" style={{paddingLeft: "3.5rem"}}>
              <label
                 style={{marginTop: "5px"}}
                className="block text-white text-xs sm:text-sm font-medium mb-2 w-[80%] mx-auto">
                Verification Code
              </label>
              <input
                 style={{marginTop: "5px"}}
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-[80%] mx-auto block h-[40px] sm:h-[44px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 text-center text-base sm:text-lg tracking-widest"
                maxLength="6"
                required
              />
            </div>

            {/* Verify Button */}
            <div className="px-4 sm:px-8 md:px-10" style={{paddingLeft: "3.5rem", marginTop: "5px"}}>
              <button
                type="submit"
                disabled={loading}
                className="w-[80%] mx-auto block h-[40px] sm:h-[44px] bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </div>

            {/* Back to Registration */}
            <div
            className="text-center pt-2">
              <button
                type="button"
                onClick={() => setOtpStep(false)}
                className="text-gray-300 text-xs sm:text-sm hover:text-white transition-colors duration-200"
              >
                ← Back to registration
              </button>
            </div>
          </form>
          )}
        </div>
      </div>

      {/* Google Confirmation Modal */}
      <GoogleConfirmModal
        open={showGoogleModal}
        onClose={handleGoogleCancel}
        onConfirm={handleGoogleConfirm}
        name={googleUserInfo?.name || ''}
        email={googleUserInfo?.email || ''}
        picture={googleUserInfo?.picture}
      />
    </div>
  );
};

export default Register;
