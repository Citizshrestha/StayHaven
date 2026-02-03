import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, googleLogin, googleRegister } from '../../api/auth';
import { toast } from 'react-toastify';
import GoogleConfirmModal from '../GoogleConfirmModal';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await login(formData.email, formData.password);
      if (response.success) {
        toast.success('Login successful! Welcome back.');
        // Navigate based on role
        if (response.role === 'admin' || response.role === 'owner' || response.role === 'manager') {
          navigate('/hoteladmin-dashboard');
        } else if (response.role === 'superadmin') {
          navigate('/superadmindashboard');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);

      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google.");
      }

      const result = await googleLogin(credentialResponse.credential);
      
      if (result.success) {
        toast.success(`Welcome back!`);
        // Navigate based on role
        if (result.role === 'admin' || result.role === 'owner' || result.role === 'manager') {
          navigate('/hoteladmin-dashboard');
        } else if (result.role === 'superadmin') {
          navigate('/superadmindashboard');
        } else {
          navigate('/');
        }
      } else if (result.needsRegistration) {
        toast.error('This Google account is not registered. Please use the registration page to create an account.');
        setTimeout(() => navigate('/register'), 2000);
        return;
      }
    } catch (error) {
      let errorMessage = "Google login failed";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        if (errorMessage.includes("No account found") || 
            errorMessage.includes("Account not found") ||
            errorMessage.includes("User not found") ||
            errorMessage.includes("not registered")) {
          toast.error('This Google account is not registered. Please use the registration page to create an account.');
          setTimeout(() => navigate('/register'), 2000);
          return;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleConfirm = async () => {
    setLoading(true);
    try {
      const result = await googleRegister(currentCredential);
      if (result.success) {
        toast.success('Registration successful! Welcome to StayHaven!');
        setShowGoogleModal(false);
        // Navigate based on role
        if (result.role === 'admin' || result.role === 'owner' || result.role === 'manager') {
          navigate('/hoteladmin-dashboard');
        } else if (result.role === 'superadmin') {
          navigate('/superadmindashboard');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Google registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCancel = () => {
    setShowGoogleModal(false);
    setGoogleUserInfo(null);
    setCurrentCredential(null);
    toast.info("Google sign-up cancelled by user.");
  };

  const handleGoogleError = () => {
    const errorMessage = "Google Sign In failed. Please try again.";
    toast.error(errorMessage);
  };

  const handleAppleLogin = () => {
    toast.info("Apple Sign-In is coming soon! Please use Google or email login for now.");
  };

  const handlePassVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background with Gradient Overlay */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/source/loginBackgroundImage.jpg')",
        }}
      >
        {/* Dark gradient overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-900/50 to-teal-900/40"></div>
      </div>

      {/* Login Form */}
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
              Welcome Back
            </h3>
            <p className="text-gray-300 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Social Login Buttons */}
            <div className="space-y-3">
              {/* Google Login */}
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

              {/* Apple Login */}
              <button
                type="button"
                onClick={handleAppleLogin}
                disabled={loading}
                className="w-full h-12 bg-white hover:bg-gray-50 text-black font-medium rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                </svg>
                Sign in with Apple
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
              <span className="text-gray-300 text-sm font-medium">or</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-white text-sm font-medium">
                Email Address
              </label>
              <div className="relative group">
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
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer group">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 bg-white/10 border-white/20 rounded focus:ring-teal-400 focus:ring-2 text-teal-500 transition-all duration-200"
                />
                <span className="group-hover:text-white transition-colors duration-200">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-teal-400 text-sm hover:text-teal-300 font-medium transition-colors duration-200 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
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
                    Signing In...
                  </span>
                ) : 'Sign In'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Sign Up Link */}
            <div className="text-center pt-4">
              <span className="text-gray-300 text-sm">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  className="text-teal-400 font-semibold hover:text-teal-300 transition-colors duration-200 hover:underline"
                >
                  Sign up
                </button>
              </span>
            </div>
          </form>
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

export default Login;
