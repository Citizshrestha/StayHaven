import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { googleRegister, sendSignupOtp, verifySignupOtp, checkUserExists } from '../api/auth';
import { toast } from 'react-toastify';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import GoogleConfirmModal from './GoogleConfirmModal';

const Register = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

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
      const existsResponse = await checkUserExists(formData.email);
      if (existsResponse.exists) {
        toast.error('This email is already registered. Please log in.');
        setLoading(false);
        return;
      }

      const signupFormData = {
        fullname: formData.fullName,
        email: formData.email,
        password: formData.password,
        username: formData.email.split('@')[0]
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
      const response = await verifySignupOtp(userEmail, otp);
      if (response.success) {
        toast.success('Registration successful! You can now log in.');
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
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (error) {
      console.error('Google registration error:', error);
      let errorMessage = 'Google registration failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        if (errorMessage.includes('already registered') || 
            errorMessage.includes('already exists') || 
            errorMessage.includes('User already exists') ||
            errorMessage.includes('Account already exists')) {
          toast.error('This Google account is already registered. Please use the login page to sign in.');
          setShowGoogleModal(false);
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
    toast.info("Apple Sign-In is coming soon! Please use Google or email registration for now.");
  };

  const handlePassVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Calculate password strength
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^a-zA-Z\d]/.test(password)) strength += 1;

    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-teal-500', 'bg-green-500'];
    
    return {
      strength,
      label: labels[strength],
      color: colors[strength]
    };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background with Gradient Overlay */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1531971589569-0d9370cbe1e5?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1181')",
        }}
      >
        {/* Dark gradient overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-900/50 to-teal-900/40"></div>
      </div>

      {/* Register Form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="bg-slate-900/30 backdrop-blur-xl rounded-3xl p-8 sm:p-10 lg:p-12 w-full max-w-md shadow-2xl border border-white/10 hover:border-teal-400/30 transition-all duration-500 animate-fade-in">
          
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/50">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-white text-2xl font-light tracking-wider" style={{fontFamily: 'Nunito'}}>
                Stay<span className="font-bold text-teal-400">Haven</span>
              </span>
            </div>
            <h3 className="text-white text-3xl font-light mb-2 tracking-tight">
              {otpStep ? 'Verify Email' : 'Create Account'}
            </h3>
            <p className="text-gray-300 text-sm">
              {otpStep ? `We sent a code to ${userEmail}` : 'Join us to start your journey'}
            </p>
          </div>

          {!otpStep ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Social Signup Buttons */}
              <div className="space-y-3">
                {/* Google Signup */}
                <div className="flex justify-center">
                  <div className="w-full">
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

                {/* Apple Signup */}
                <button
                  type="button"
                  onClick={handleAppleSignup}
                  disabled={loading}
                  className="w-full h-12 bg-white hover:bg-gray-50 text-black font-medium rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                  </svg>
                  Continue with Apple
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
                <span className="text-gray-300 text-sm font-medium">or</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
              </div>

              {/* Full Name Field */}
              <div className="space-y-2">
                <label className="block text-white text-sm font-medium">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="w-full h-12 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white/15 transition-all duration-300 border border-white/10 hover:border-white/20 focus:border-teal-400/50"
                  required
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-white text-sm font-medium">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  className="w-full h-12 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white/15 transition-all duration-300 border border-white/10 hover:border-white/20 focus:border-teal-400/50"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-white text-sm font-medium">
                  Password
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="w-full h-12 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white/15 transition-all duration-300 border border-white/10 hover:border-white/20 focus:border-teal-400/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={handlePassVisibility}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-teal-400 transition-colors duration-200"
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
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            level <= passwordStrength.strength
                              ? passwordStrength.color
                              : 'bg-white/10'
                          }`}
                        ></div>
                      ))}
                    </div>
                    {passwordStrength.label && (
                      <p className="text-xs text-gray-300">{passwordStrength.label}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="block text-white text-sm font-medium">
                  Confirm Password
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className="w-full h-12 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white/15 transition-all duration-300 border border-white/10 hover:border-white/20 focus:border-teal-400/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={handlePassVisibility}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-teal-400 transition-colors duration-200"
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
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="w-5 h-5 mt-0.5 bg-white/10 border-white/20 rounded focus:ring-teal-400 focus:ring-2 text-teal-500 transition-all duration-200 cursor-pointer"
                  required
                />
                <label className="text-gray-300 text-sm leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    className="text-teal-400 hover:text-teal-300 font-medium transition-colors duration-200 hover:underline"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    className="text-teal-400 hover:text-teal-300 font-medium transition-colors duration-200 hover:underline"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending OTP...
                    </span>
                  ) : 'Create Account'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>

              {/* Sign In Link */}
              <div className="text-center pt-4">
                <span className="text-gray-300 text-sm">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={handleLoginClick}
                    className="text-teal-400 font-semibold hover:text-teal-300 transition-colors duration-200 hover:underline"
                  >
                    Sign in
                  </button>
                </span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtpVerification} className="space-y-6">
              {/* OTP Input */}
              <div className="space-y-3">
                <label className="block text-white text-sm font-medium text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-full h-14 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white/15 transition-all duration-300 border border-white/10 hover:border-white/20 focus:border-teal-400/50 text-center text-2xl tracking-widest font-semibold"
                  maxLength="6"
                  required
                />
                <p className="text-xs text-gray-400 text-center">
                  Please enter the 6-digit code sent to your email
                </p>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </span>
                  ) : 'Verify Email'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>

              {/* Back to Registration */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setOtpStep(false)}
                  className="text-gray-300 text-sm hover:text-white transition-colors duration-200 flex items-center justify-center gap-2 mx-auto group"
                >
                  <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to registration
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

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Register;
