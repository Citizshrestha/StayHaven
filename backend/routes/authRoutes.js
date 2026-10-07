import express from 'express';
import {
  loginUser,
  registerUser,
  logoutUser,
  isAuthenticated,
  getCurrentUser,
  sendResetPasswordOtp,
  verifyResetPasswordOtp,
  resetPassword,
  refreshAccessToken,
  checkUserExists,
  googleLogin,
  googleRegister,
  changePassword,
  sendSignupOtp,
  verifySignupOtp
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  authLimiter,
  passwordResetLimiter,
  otpLimiter,
  signupLimiter,
} from "../middleware/rateLimiter.js";
import { sanitizeAll } from '../middleware/sanitization.js';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// Public routes
router.get('/check', checkUserExists);
router.post('/login', authLimiter, loginUser);
router.post("/register", signupLimiter, registerUser);
router.post('/google-login', authLimiter, googleLogin);
router.post('/google-register', authLimiter, googleRegister);
router.post('/sendResetPasswordOtp', passwordResetLimiter, sendResetPasswordOtp);
router.post('/refresh', authLimiter, refreshAccessToken);

// Public signup OTP routes (no auth required)
router.post("/sendSignupOtp", otpLimiter, sendSignupOtp);
router.post("/verifySignupOtp", signupLimiter, verifySignupOtp);

// Public password reset routes (no auth required)
router.post('/verifyResetPasswordOtp', passwordResetLimiter, verifyResetPasswordOtp);
router.post('/resetPassword', passwordResetLimiter, resetPassword);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logoutUser); 
router.post('/isAuth', protect, isAuthenticated); 
router.post('/change-password', protect, changePassword);

export default router;

