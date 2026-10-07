import express from 'express';
import {
    createCompany,
    getCompany,
    getMyCompany,
    updateCompany,
    getCompanyProperties,
    getCompanyUsers,
} from '../controllers/companyController.js';
import { isAuthenticated } from '../middleware/isAuthenticated.js';
import { writeOperationLimiter } from '../middleware/rateLimiter.js';
import { sanitizeAll } from '../middleware/sanitization.js';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// Company routes
router.post('/', isAuthenticated, writeOperationLimiter, createCompany);
router.get('/me', isAuthenticated, getMyCompany);
router.get('/:id', isAuthenticated, getCompany);
router.put('/:id', isAuthenticated, writeOperationLimiter, updateCompany);
router.get('/:id/properties', isAuthenticated, getCompanyProperties);
router.get('/:id/users', isAuthenticated, getCompanyUsers);

export default router;
