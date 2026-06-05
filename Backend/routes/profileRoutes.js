import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { writeOperationLimiter } from '../middleware/rateLimiter.js';
import { sanitizeAll } from '../middleware/sanitization.js';
import {
  getProfile,
  updateProfile,
  updateProfilePicture,
  uploadProfilePictureFile,
  changePassword
} from '../controllers/profileController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// All routes require authentication
router.use(protect);

// Profile routes
router.get('/', getProfile);
router.patch('/', writeOperationLimiter, updateProfile);
router.patch('/picture', writeOperationLimiter, updateProfilePicture);
router.post(
  '/picture/upload',
  writeOperationLimiter,
  upload.single('profilePicture'),
  uploadProfilePictureFile
);
router.post('/change-password', writeOperationLimiter, changePassword);

export default router;
