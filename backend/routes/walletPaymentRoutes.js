import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/authMiddleware.js';
import { csrfProtection } from '../middleware/csrf.js';
import { walletConfig, walletStatus, verifyWalletStatus } from '../controllers/walletPaymentController.js';

const router = Router();
router.get('/config', walletConfig);
router.use(protect);
// Verification has its own limit; checkout's 5/hour policy must not block polling.
router.use(rateLimit({ windowMs: 60000, limit: 60, standardHeaders: true, legacyHeaders: false }));
router.get('/:id', walletStatus);
router.post('/:id/verify', csrfProtection, verifyWalletStatus);
export default router;
