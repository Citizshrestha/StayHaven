import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, googleLogin, sendSignupOtp, verifySignupOtp, checkUserExists } from '../api/auth';
import { toast } from 'react-toastify';

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
        fullName: formData.fullName,
        fullname: formData.fullName, // Backend expects 'fullname'
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

  const handleGoogleSignup = () => {
    // Initialize Google Sign-In
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse
      });
      window.google.accounts.id.prompt();
    } else {
      toast.error('Google Sign-In not loaded. Please try again.');
    }
  };

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    try {
      const result = await googleLogin(response.credential);
      if (result.success) {
        toast.success('Google signup successful!');
        navigate('/dashboard'); // or wherever you want to redirect after successful login
      }
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error(error.response?.data?.message || 'Google signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePassVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Load Google Sign-In script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
      <div className="relative z-10 min-h-screen flex items-center justify-center p-10">
        <div className="bg-slate-900/40 rounded-3xl p-12 w-[440px] max-w-lg shadow-2xl border border-white/20 transform hover:scale-[1.01] transition-all duration-300 h-[530px] flex flex-col justify-center">
          {/* Logo and Title */}
          <div className="text-center mb-6 mt-4">
            <div 
            style={{marginBottom: "1.5rem"}}
            className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-white text-xl font-light tracking-wider" style={{fontFamily: 'Nunito'}}>
                Stay<span className="font-bold text-teal-400">Haven</span>
              </span>
            </div>
            <h2 className="text-[#F9FAFB] text-2xl font-light mb-2 tracking-tight">
              Create Account
            </h2>
            <p className="text-[#F9FAFB] text-sm">Join us to start your journey</p>
          </div>

          {!otpStep ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Google Signup Button */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              style={{marginLeft: "40px"}}
              className="w-[80%] h-[40px] bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-sm border border-gray-200 hover:shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-white text-sm font-medium">or</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Full Name Field */}
            <div>
              <label 
                style={{marginLeft: "40px"}}
              className="block text-white text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                style={{marginLeft: "40px"}}
                placeholder="Enter your full name"
                className="w-[80%] h-[40px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label 
                style={{marginLeft: "40px"}}
              className="block text-white text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                style={{marginLeft: "40px"}}
                placeholder="Enter your email address"
                className="w-[80%] h-[40px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label 
                style={{marginLeft: "40px"}}
              className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative w-[80%]" style={{marginLeft: "40px"}}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="w-full h-[40px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 pr-12 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
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
            <div>
              <label 
                style={{marginLeft: "40px"}}
              className="block text-white text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative w-[80%]" style={{marginLeft: "40px"}}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  className="w-full h-[40px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 pr-12 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
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
            style={{marginTop: "8px"}}
            className="flex items-start gap-2">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleInputChange}
                style={{marginLeft: "40px"}}
                className="w-4 h-4 bg-gray-50 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 mt-1"
                required
              />
              <label className="text-white text-sm leading-relaxed">
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

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              style={{marginLeft: "40px"}}
              className="w-[80%] h-[40px] bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending OTP...' : 'Create Account'}
            </button>

            {/* Sign In Link */}
            <div 
            style={{marginTop: "5px"}}
            className="text-center pt-2">
              <span className="text-white text-sm">
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
            <div className="text-center mb-4">
              <h3 className="text-white text-lg font-medium mb-2">Verify Your Email</h3>
              <p className="text-gray-300 text-sm">We've sent a verification code to {userEmail}</p>
            </div>

            {/* OTP Input */}
            <div>
              <label 
                style={{marginLeft: "40px"}}
                className="block text-white text-sm font-medium mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{marginLeft: "40px"}}
                placeholder="Enter 6-digit code"
                className="w-[80%] h-[40px] bg-gray-50 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300 text-center text-lg tracking-widest"
                maxLength="6"
                required
              />
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading}
              style={{marginLeft: "40px"}}
              className="w-[80%] h-[40px] bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            {/* Back to Registration */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setOtpStep(false)}
                className="text-gray-300 text-sm hover:text-white transition-colors duration-200"
              >
                ← Back to registration
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
