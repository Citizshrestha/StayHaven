import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, googleLogin, googleRegister } from '../api/auth';
import { toast } from 'react-toastify';
import GoogleConfirmModal from './GoogleConfirmModal';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
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
        navigate('/dashboard'); // or wherever you want to redirect after successful login
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

      // Try to login first
      const result = await googleLogin(credentialResponse.credential);
      
      if (result.success) {
        toast.success(`Welcome back!`);
        navigate('/dashboard');
      } else if (result.needsRegistration) {
        // Decode the JWT to get user info for confirmation modal
        const decoded = jwtDecode(credentialResponse.credential);
        setGoogleUserInfo({
          name: decoded.name,
          email: decoded.email,
          picture: decoded.picture
        });
        setCurrentCredential(credentialResponse.credential);
        setShowGoogleModal(true);
      }
    } catch (error) {
      let errorMessage = "Google login failed";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        // If the error is "no account found", show registration modal
        if (errorMessage.includes("No account found") || errorMessage.includes("Account not found")) {
          try {
            const decoded = jwtDecode(credentialResponse.credential);
            setGoogleUserInfo({
              name: decoded.name,
              email: decoded.email,
              picture: decoded.picture
            });
            setCurrentCredential(credentialResponse.credential);
            setShowGoogleModal(true);
            return;
          } catch (decodeError) {
            console.error('Failed to decode Google token:', decodeError);
          }
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
        navigate('/dashboard');
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

  const handlePassVisibility = () => {
    setShowPassword(!showPassword);
  };

    const handleRegisterClick = () => {
    navigate('/register')
  }

  // No need to load Google Sign-In script manually when using @react-oauth/google

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background Image with High Quality */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/source/loginBackgroundImage.jpg')",
        }}
      >
        
      </div>

      {/* Login Form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-10">
        <div className="bg-slate-900/40 rounded-3xl p-12 w-[440px] max-w-lg shadow-2xl border border-white/20 transform hover:scale-[1.01] transition-all duration-300 h-[430px] flex flex-col justify-center">
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
              Welcome Back
            </h2>
            <p className="text-[#F9FAFB] text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Google Login Button */}
            <div style={{marginLeft: "40px"}} className="w-[80%] flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                ux_mode="popup"
                text="continue_with"
                shape="rectangular"
                theme="filled_blue"
                size="large"
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-white text-sm font-medium">or</span>
              <div className="flex-1 h-px bg-gray-300"></div>
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
                className="w-[80%] h-[40px]  bg-gray-50 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all duration-200 border border-gray-200 hover:border-gray-300"
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

            {/* Remember Me and Forgot Password */}
            <div 
            style={{marginTop: "8px"}}
            className="flex items-center  justify-between">
              <label 
                style={{marginLeft: "40px"}}
              className="flex items-center gap-2 text-white  text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}

                  className="w-4 h-4 bg-gray-50  border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                style={{marginRight: "65px"}}
                className="text-[#08F0D9] text-sm hover:underline font-medium transition-colors duration-200"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              style={{marginLeft: "40px"}}
              className="w-[80%] h-[40px] bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Sign Up Link */}
            <div 
            style={{marginTop: "5px"}}
            className="text-center pt-2">
              <span className="text-white text-sm">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  className="text-[#08f0d9] font-semibold transition-colors duration-200"
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
    </div>
  );
};

export default Login;
