/**
 * Multi-Tenancy Validation Middleware
 *
 * Ensures all queries are properly scoped by hotel or company
 * to prevent data leakage between tenants.
 */

import { createLogger } from "../utils/logger.js";

const logger = createLogger('MultiTenancy');

/**
 * Validate that hotelId exists and user has access to it
 */
export const validateHotelAccess = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Extract hotelId from various sources
    const hotelId =
      req.params.hotelId ||
      req.query.hotelId ||
      req.body.hotelId ||
      req._scopedHotelId || // Set by propertyScope middleware
      user.assignedProperties?.[0]?._id ||
      user.assignedProperties?.[0];

    if (!hotelId) {
      logger.warn('No hotelId found in request', {
        userId: user._id,
        path: req.path,
        method: req.method,
      });

      return res.status(400).json({
        success: false,
        message: 'Hotel ID is required',
      });
    }

    // Check if user has access to this hotel
    const hasAccess = checkUserHotelAccess(user, hotelId);

    if (!hasAccess) {
      logger.warn('Unauthorized hotel access attempt', {
        userId: user._id,
        requestedHotelId: hotelId,
        userHotels: user.assignedProperties,
      });

      return res.status(403).json({
        success: false,
        message: 'You do not have access to this hotel',
      });
    }

    // Attach validated hotelId to request for use in controllers
    req.validatedHotelId = hotelId;
    next();

  } catch (error) {
    logger.error('Hotel access validation error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to validate hotel access',
    });
  }
};

/**
 * Check if user has access to a specific hotel
 */
function checkUserHotelAccess(user, hotelId) {
  // Super admin and owners have access to all hotels in their company
  if (user.role?.name === 'admin' || user.companyRole === 'admin' || user.companyRole === 'owner') {
    return true;
  }

  // Check if hotel is in user's assigned properties
  if (!user.assignedProperties || user.assignedProperties.length === 0) {
    return false;
  }

  const hotelIdStr = hotelId.toString();
  return user.assignedProperties.some(prop => {
    const propId = prop._id ? prop._id.toString() : prop.toString();
    return propId === hotelIdStr;
  });
}

/**
 * Validate company access
 */
export const validateCompanyAccess = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const companyId =
      req.params.companyId ||
      req.query.companyId ||
      req.body.companyId ||
      user.company?._id ||
      user.company;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required',
      });
    }

    // Check if user belongs to this company
    const userCompanyId = user.company?._id ? user.company._id.toString() : user.company?.toString();
    const requestedCompanyId = companyId.toString();

    if (userCompanyId !== requestedCompanyId) {
      logger.warn('Unauthorized company access attempt', {
        userId: user._id,
        userCompany: userCompanyId,
        requestedCompany: requestedCompanyId,
      });

      return res.status(403).json({
        success: false,
        message: 'You do not have access to this company',
      });
    }

    req.validatedCompanyId = companyId;
    next();

  } catch (error) {
    logger.error('Company access validation error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to validate company access',
    });
  }
};

/**
 * Audit query for multi-tenancy compliance
 * Use in development to catch queries without hotel/company filters
 */
export const auditQuery = (modelName, query, context = {}) => {
  if (process.env.NODE_ENV === 'production') {
    return; // Skip in production for performance
  }

  const hasHotelFilter = query.hotel !== undefined;
  const hasCompanyFilter = query.company !== undefined;

  if (!hasHotelFilter && !hasCompanyFilter) {
    logger.warn('Query without multi-tenancy filter detected', {
      model: modelName,
      query: JSON.stringify(query),
      context,
    });
  }
};
