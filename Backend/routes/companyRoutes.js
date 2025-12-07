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

const router = express.Router();

// Company routes
router.post('/', isAuthenticated, createCompany);
router.get('/me', isAuthenticated, getMyCompany);
router.get('/:id', isAuthenticated, getCompany);
router.put('/:id', isAuthenticated, updateCompany);
router.get('/:id/properties', isAuthenticated, getCompanyProperties);
router.get('/:id/users', isAuthenticated, getCompanyUsers);

export default router;
