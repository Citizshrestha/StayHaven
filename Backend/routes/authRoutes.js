import express from 'express';
import {
  loginUser,
  registerUser,
  logoutUser, 
  isAuthenticated, 
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

const router = express.Router();

// Public routes
router.get('/check', checkUserExists);
router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/google-login', googleLogin);
router.post('/google-register', googleRegister);
router.post('/sendResetPasswordOtp', sendResetPasswordOtp);
router.post('/refresh', refreshAccessToken);

// Public signup OTP routes (no auth required)
router.post('/sendSignupOtp', sendSignupOtp);
router.post('/verifySignupOtp', verifySignupOtp);

// Public password reset routes (no auth required)
router.post('/verifyResetPasswordOtp', verifyResetPasswordOtp);
router.post('/resetPassword', resetPassword);

// Protected routes
router.post('/logout', protect, logoutUser); 
router.post('/isAuth', protect, isAuthenticated); 
router.post('/change-password', protect, changePassword);

export default router;

