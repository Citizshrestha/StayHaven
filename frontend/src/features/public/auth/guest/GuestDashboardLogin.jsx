/**
 * Guest Dashboard Login
 * Dedicated login page for guests with confirmed bookings to access their dashboard
 * Route: /guest/login
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../../../core/api/services/auth.service';
import { toast } from 'react-toastify';
import { Hotel, Lock, Mail, Eye, EyeOff, ArrowRight, Shield, Clock, Star } from 'lucide-react';

const GuestDashboardLogin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        // Check if user has guest role
        if (response.role === 'guest') {
          toast.success('Welcome to your dashboard!');
          navigate('/guest-dashboard');
        } else {
          // Not a guest - redirect to appropriate dashboard
          toast.info(`Redirecting to ${response.role} dashboard...`);
          if (response.role === 'receptionist' || response.role === 'manager') {
            navigate('/reception-dashboard');
          } else if (response.role === 'waiter') {
            navigate('/waiter-dashboard');
          } else if (response.role === 'chief') {
            navigate('/kitchen-dashboard');
          } else {
            navigate('/');
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2314b8a6' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding & Features */}
        <div className="hidden md:block space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Hotel className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  Stay<span className="text-teal-600">Haven</span>
                </h1>
                <p className="text-sm text-gray-600">Guest Portal</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome Back to Your Stay
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Access your personalized dashboard to manage bookings, order room service, and enjoy a seamless hotel experience.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: Shield, title: 'Secure Access', desc: 'Your data is protected with enterprise-grade security' },
              { icon: Clock, title: '24/7 Service', desc: 'Order room service and request assistance anytime' },
              { icon: Star, title: 'Premium Experience', desc: 'Manage your stay with our intuitive dashboard' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-teal-100">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Hotel className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Stay<span className="text-teal-600">Haven</span>
            </span>
          </div>

          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Guest Dashboard Login</h3>
            <p className="text-gray-600">Enter your credentials to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Need to book a room?</span>
            </div>
          </div>

          {/* Public Login Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-teal-600 hover:text-teal-700 font-medium transition-colors inline-flex items-center gap-2"
            >
              Browse Hotels & Book Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-8 p-4 bg-teal-50 rounded-xl border border-teal-100">
            <p className="text-sm text-gray-700 text-center">
              <strong>Note:</strong> This login is for guests with confirmed bookings. 
              Check your email for login credentials sent by the hotel staff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestDashboardLogin;
