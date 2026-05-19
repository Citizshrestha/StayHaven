import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, googleLogin, googleRegister, sendSignupOtp, verifySignupOtp, checkUserExists } from '../../../../core/api/services/auth.service';
import { toast } from 'react-toastify';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import GoogleConfirmModal from '../../../../shared/ui/GoogleConfirmModal';
import styles from './AuthPage.module.css';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine initial tab based on route
  const [activeTab, setActiveTab] = useState(
    location.pathname === '/register' ? 'signup' : 'signin'
  );

  // Update tab when route changes
  useEffect(() => {
    if (location.pathname === '/register') {
      setActiveTab('signup');
    } else if (location.pathname === '/login') {
      setActiveTab('signin');
    }
  }, [location.pathname]);

  // Sign In State
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  // Sign Up State
  const [signUpData, setSignUpData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    agreeToTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState(null);
  const [currentCredential, setCurrentCredential] = useState(null);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Password Strength Calculator
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getStrengthLabel = (strength) => {
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return labels[strength - 1] || 'Weak';
  };

  const getStrengthClass = (strength) => {
    const classes = [styles.strengthWeak, styles.strengthFair, styles.strengthGood, styles.strengthStrong];
    return classes[strength - 1] || styles.strengthWeak;
  };

  const passwordStrength = calculatePasswordStrength(signUpData.password);

  // Handle Tab Switch
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    // Update URL without page reload
    if (tab === 'signin') {
      navigate('/login', { replace: true });
    } else {
      navigate('/register', { replace: true });
    }
  };

  // Sign In Handlers
  const handleSignInChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSignInData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();

    if (!signInData.email || !signInData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await login(signInData.email, signInData.password);
      if (response.success) {
        toast.success('Login successful! Welcome back.');

        const pendingBooking = sessionStorage.getItem('pendingBooking');

        if (pendingBooking) {
          try {
            const bookingData = JSON.parse(pendingBooking);
            sessionStorage.removeItem('pendingBooking');
            toast.info('Resuming your booking...', { autoClose: 2000 });

            setTimeout(() => {
              if (bookingData.returnUrl) {
                navigate(bookingData.returnUrl, { state: { resumeBooking: bookingData } });
              } else if (bookingData.hotelId) {
                navigate(`/hotels/${bookingData.hotelId}`, { state: { resumeBooking: bookingData } });
              } else {
                navigate('/');
              }
            }, 1000);
            return;
          } catch (error) {
            console.error('Error parsing pending booking:', error);
            sessionStorage.removeItem('pendingBooking');
          }
        }

        // Redirect based on user role
        if (response.role === 'admin') {
          navigate('/dashboard');
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

  // Sign Up Handlers
  const handleSignUpChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSignUpData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();

    if (!signUpData.agreeToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (signUpData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      const existsResponse = await checkUserExists(signUpData.email);
      if (existsResponse.exists) {
        toast.error('This email is already registered. Please log in.');
        setLoading(false);
        return;
      }

      const signupFormData = {
        fullname: `${signUpData.firstName} ${signUpData.lastName}`,
        email: signUpData.email,
        password: signUpData.password,
        username: signUpData.email.split('@')[0]
      };

      const response = await sendSignupOtp(signUpData.email, signupFormData);
      if (response.success) {
        setUserEmail(signUpData.email);
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
        handleTabSwitch('signin');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Google Auth Handlers
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);

      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google.");
      }

      if (activeTab === 'signin') {
        const result = await googleLogin(credentialResponse.credential);

        if (result.success) {
          toast.success('Welcome back!');

          const pendingBooking = sessionStorage.getItem('pendingBooking');

          if (pendingBooking) {
            try {
              const bookingData = JSON.parse(pendingBooking);
              sessionStorage.removeItem('pendingBooking');
              toast.info('Resuming your booking...', { autoClose: 2000 });

              setTimeout(() => {
                if (bookingData.returnUrl) {
                  navigate(bookingData.returnUrl, { state: { resumeBooking: bookingData } });
                } else if (bookingData.hotelId) {
                  navigate(`/hotels/${bookingData.hotelId}`, { state: { resumeBooking: bookingData } });
                } else {
                  navigate('/');
                }
              }, 1000);
              return;
            } catch (error) {
              console.error('Error parsing pending booking:', error);
              sessionStorage.removeItem('pendingBooking');
            }
          }

          // Redirect based on user role
          if (result.role === 'admin') {
            navigate('/dashboard');
          } else {
            navigate('/');
          }
        } else if (result.needsRegistration) {
          toast.error('This Google account is not registered. Please use the registration tab.');
          handleTabSwitch('signup');
          return;
        }
      } else {
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
      let errorMessage = "Google authentication failed";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        if (activeTab === 'signin' && (
          errorMessage.includes("No account found") ||
          errorMessage.includes("Account not found") ||
          errorMessage.includes("User not found") ||
          errorMessage.includes("not registered")
        )) {
          toast.error('This Google account is not registered. Please use the registration tab.');
          handleTabSwitch('signup');
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
      const registerResult = await googleRegister(currentCredential);
      if (registerResult.success) {
        toast.success('Registration successful! Please login.');
        setShowGoogleModal(false);
        handleTabSwitch('signin');
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
          toast.error('This Google account is already registered. Please use the login tab.');
          setShowGoogleModal(false);
          handleTabSwitch('signin');
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
    toast.info("Google authentication cancelled.");
  };

  const handleGoogleError = () => {
    toast.error("Google Sign In failed. Please try again.");
  };

  return (
    <div className={styles.authContainer}>
      {/* Left Panel - Hotel Image */}
      <div className={styles.leftPanel}>
        <div className={styles.leftPanelContent}>
          {/* Logo */}
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <img src="/logo.png" alt="StayHaven" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className={styles.logoText}>
              Stay<span>Haven</span>
            </div>
          </div>

          {/* Bottom Content */}
          <div className={styles.bottomContent}>
            <div className={styles.quote}>
              Your next <em>perfect</em> stay awaits.
            </div>
            <div className={styles.subtitle}>
              Experience luxury and comfort like never before
            </div>
            <div className={styles.trustStats}>
              <span>50K+ Travelers</span>
              <span>4.8★ Rating</span>
              <span>200+ Hotels</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          <div className={styles.header}>
            <div className={styles.welcomeText}>WELCOME TO STAYHAVEN</div>
          </div>

          {/* Tab Toggle */}
          <div className={styles.tabToggle}>
            <button
              className={`${styles.tab} ${activeTab === 'signin' ? styles.tabActive : ''}`}
              onClick={() => handleTabSwitch('signin')}
            >
              Sign In
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'signup' ? styles.tabActive : ''}`}
              onClick={() => handleTabSwitch('signup')}
            >
              Create Account
            </button>
          </div>

          {/* Sign In Form */}
          {activeTab === 'signin' && !otpStep && (
            <div className={styles.formContent} key="signin">
              <h2 className={styles.formTitle}>Welcome back</h2>
              <p className={styles.formSubtitle}>Sign in to manage your bookings and discover new stays.</p>

              {/* Google Sign In */}
              <div style={{ width: '100%' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  ux_mode="popup"
                  text="continue_with"
                  shape="rectangular"
                  theme="outline"
                  size="large"
                />
              </div>

              <div className={styles.divider}>or continue with email</div>

              <form onSubmit={handleSignInSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Address</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="email"
                      name="email"
                      value={signInData.email}
                      onChange={handleSignInChange}
                      placeholder="you@example.com"
                      className={styles.input}
                      required
                    />
                    <span className={styles.inputIcon}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Password</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={signInData.password}
                      onChange={handleSignInChange}
                      placeholder="Enter your password"
                      className={styles.input}
                      required
                    />
                    <span className={styles.inputIcon} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </span>
                  </div>
                </div>

                <div className={styles.rememberRow}>
                  <label className={styles.rememberLabel}>
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={signInData.rememberMe}
                      onChange={handleSignInChange}
                      className={styles.checkbox}
                    />
                    Remember me
                  </label>
                  <a href="/forgot-password" className={styles.forgotLink}>
                    Forgot password?
                  </a>
                </div>

                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>

                <div className={styles.switchLink}>
                  Don't have an account? <button type="button" onClick={() => handleTabSwitch('signup')}>Create one free →</button>
                </div>
              </form>
            </div>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && !otpStep && (
            <div className={styles.formContent} key="signup">
              <h2 className={styles.formTitle}>Create account</h2>
              <p className={styles.formSubtitle}>Join 50,000+ travelers booking smarter across Nepal.</p>

              {/* Google Sign Up */}
              <div style={{ width: '100%' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  ux_mode="popup"
                  text="continue_with"
                  shape="rectangular"
                  theme="outline"
                  size="large"
                />
              </div>

              <div className={styles.divider}>or sign up with email</div>

              <form onSubmit={handleSignUpSubmit}>
                <div className={styles.nameGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={signUpData.firstName}
                      onChange={handleSignUpChange}
                      placeholder="Enter first name"
                      className={styles.input}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={signUpData.lastName}
                      onChange={handleSignUpChange}
                      placeholder="Enter last name"
                      className={styles.input}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Address</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="email"
                      name="email"
                      value={signUpData.email}
                      onChange={handleSignUpChange}
                      placeholder="you@example.com"
                      className={styles.input}
                      required
                    />
                    <span className={styles.inputIcon}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Password</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={signUpData.password}
                      onChange={handleSignUpChange}
                      placeholder="Min. 8 characters"
                      className={styles.input}
                      required
                    />
                    <span className={styles.inputIcon} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </span>
                  </div>
                  {signUpData.password && (
                    <div className={styles.strengthMeter}>
                      <div className={styles.strengthBars}>
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`${styles.strengthBar} ${level <= passwordStrength ? styles.active : ''}`}
                            style={{ 
                              background: level <= passwordStrength 
                                ? (passwordStrength === 1 ? '#ef4444' : passwordStrength === 2 ? '#f59e0b' : passwordStrength === 3 ? '#10b981' : '#059669')
                                : '#e5e7eb' 
                            }}
                          />
                        ))}
                      </div>
                      <div className={`${styles.strengthLabel} ${getStrengthClass(passwordStrength)}`}>
                        {getStrengthLabel(passwordStrength)}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={signUpData.agreeToTerms}
                    onChange={handleSignUpChange}
                    className={styles.checkbox}
                    required
                  />
                  <label className={styles.checkboxLabel}>
                    I agree to StayHaven's <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
                  </label>
                </div>

                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className={styles.switchLink}>
                  Already have an account? <button type="button" onClick={() => handleTabSwitch('signin')}>Sign in →</button>
                </div>
              </form>
            </div>
          )}

          {/* OTP Verification Form */}
          {otpStep && (
            <div className={styles.formContent} key="otp">
              <h2 className={styles.formTitle}>Verify Your Email</h2>
              <p className={styles.formSubtitle}>We've sent a verification code to {userEmail}</p>

              <form onSubmit={handleOtpVerification}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Verification Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className={styles.input}
                    maxLength="6"
                    style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '18px' }}
                    required
                  />
                </div>

                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>

                <div className={styles.switchLink}>
                  <button type="button" onClick={() => setOtpStep(false)}>← Back to registration</button>
                </div>
              </form>
            </div>
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

export default AuthPage;
