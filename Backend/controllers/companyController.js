import { Company } from '../models/company.schema.js';
import { User } from '../models/user.schema.js';

// Create a new company
export const createCompany = async (req, res) => {
    try {
        const userId = req.user._id;

        // Check if user already has a company
        const existingCompany = await Company.findOne({ owner: userId });
        if (existingCompany) {
            return res.status(400).json({
                success: false,
                message: 'You already have a company registered'
            });
        }

        const companyData = {
            ...req.body,
            owner: userId,
        };

        const company = await Company.create(companyData);

        // Update user with company reference and role
        await User.findByIdAndUpdate(userId, {
            company: company._id,
            companyRole: 'owner',
        });

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get company details
export const getCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id)
            .populate('owner', 'fullname email contact')
            .populate('admins.user', 'fullname email');

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get my company
export const getMyCompany = async (req, res) => {
    try {
        const company = await Company.findOne({ owner: req.user._id })
            .populate('owner', 'fullname email contact');

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'No company found'
            });
        }

        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update company
export const updateCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Check if user is owner
        if (company.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this company'
            });
        }

        const updatedCompany = await Company.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Company updated successfully',
            data: updatedCompany
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get company properties
export const getCompanyProperties = async (req, res) => {
    try {
        const { Hotel } = await import('../models/hotel.schema.js');

        const properties = await Hotel.find({ company: req.params.id });

        res.json({
            success: true,
            count: properties.length,
            data: properties
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get company users
export const getCompanyUsers = async (req, res) => {
    try {
        const users = await User.find({ company: req.params.id })
            .select('-password -resetOtp -resetOtpExpireAt');

        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
