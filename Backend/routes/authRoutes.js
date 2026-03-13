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
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes
router.get('/check', checkUserExists);
router.post('/login', authLimiter, loginUser);
router.post('/register', authLimiter, registerUser);
router.post('/google-login', authLimiter, googleLogin);
router.post('/google-register', authLimiter, googleRegister);
router.post('/sendResetPasswordOtp', passwordResetLimiter, sendResetPasswordOtp);
router.post('/refresh', authLimiter, refreshAccessToken);

// Public signup OTP routes (no auth required)
router.post('/sendSignupOtp', authLimiter, sendSignupOtp);
router.post('/verifySignupOtp', authLimiter, verifySignupOtp);

// Public password reset routes (no auth required)
router.post('/verifyResetPasswordOtp', passwordResetLimiter, verifyResetPasswordOtp);
router.post('/resetPassword', passwordResetLimiter, resetPassword);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logoutUser); 
router.post('/isAuth', protect, isAuthenticated); 
router.post('/change-password', protect, changePassword);

export default router;

