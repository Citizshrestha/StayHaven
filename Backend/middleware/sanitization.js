/**
 * Input Sanitization Middleware
 * Production-grade XSS and injection prevention for hotel booking system
 */

import { body, param, query, validationResult } from "express-validator";

// Regex patterns for common injection attacks
const PATTERNS = {
  // XSS pattern - matches script tags, event handlers, javascript URLs
  xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<[^>]+\son\w+\s*=|\s*javascript\s*:/gi,
  
  // NoSQL injection pattern - matches MongoDB operators
  nosql: /\$\{(?:eq|ne|gt|gte|lt|lte|in|nin|regex|exists|type|mod|where|expr)\}|\$\$/i,
  
  // SQL injection pattern
  sql: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|SCRIPT)\b|--|;|--|\/\*|\*\/)/i,
  
  // HTML tag pattern (for stripping)
  htmlTags: /<[^>]*>/g,
  
  // Null bytes
  nullBytes: /\x00/g,
};

// Fields that should never contain HTML
const NO_HTML_FIELDS = [
  "guestInfo.name",
  "guestInfo.email",
  "guestInfo.phone",
  "guestInfo.idNumber",
  "specialRequests",
  "notes",
  "reason",
  "reference",
];

// Maximum lengths for various fields
const MAX_LENGTHS = {
  "guestInfo.name": 100,
  "guestInfo.email": 100,
  "guestInfo.phone": 20,
  "guestInfo.idNumber": 50,
  "specialRequests": 500,
  "notes": 1000,
  "reason": 500,
  "reference": 100,
};

/**
 * Sanitize string input - removes XSS vectors and trims
 */
const sanitizeString = (value, allowLimitedHtml = false) => {
  if (typeof value !== "string") return value;
  
  let sanitized = value
    .replace(PATTERNS.nullBytes, "") // Remove null bytes
    .trim();
  
  if (!allowLimitedHtml) {
    // Remove all HTML tags
    sanitized = sanitized.replace(PATTERNS.htmlTags, "");
  } else {
    // Allow only specific safe HTML tags (for rich text fields if needed)
    // This is a whitelist approach - only keep b, i, em, strong, br
    sanitized = sanitized.replace(/<(?!\/?(?:b|i|em|strong|br)\b)[^>]*>/gi, "");
  }
  
  // Check for XSS attempts after cleaning
  if (PATTERNS.xss.test(sanitized)) {
    // Remove script patterns entirely
    sanitized = sanitized.replace(PATTERNS.xss, "[removed]");
  }
  
  // Check for NoSQL injection
  if (PATTERNS.nosql.test(sanitized)) {
    sanitized = sanitized.replace(PATTERNS.nosql, "");
  }
  
  return sanitized;
};

/**
 * Deep sanitize object recursively
 */
const deepSanitize = (obj, allowLimitedHtml = false, path = "") => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === "string") {
    return sanitizeString(obj, allowLimitedHtml);
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item, index) => 
      deepSanitize(item, allowLimitedHtml, `${path}[${index}]`)
    );
  }
  
  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key itself is malicious
      const safeKey = sanitizeString(key);
      sanitized[safeKey] = deepSanitize(value, allowLimitedHtml, `${path}.${key}`);
    }
    return sanitized;
  }
  
  // For primitives (number, boolean)
  return obj;
};

/**
 * Middleware: Sanitize entire request body
 */
export const sanitizeBody = (options = {}) => (req, res, next) => {
  if (req.body) {
    req.body = deepSanitize(req.body, options.allowLimitedHtml);
  }
  next();
};

/**
 * Middleware: Sanitize request params
 */
export const sanitizeParams = (req, res, next) => {
  if (req.params) {
    for (const [key, value] of Object.entries(req.params)) {
      req.params[key] = sanitizeString(value);
    }
  }
  next();
};

/**
 * Middleware: Sanitize query parameters
 */
export const sanitizeQuery = (req, res, next) => {
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") {
        req.query[key] = sanitizeString(value);
      }
    }
  }
  next();
};

/**
 * Combined sanitization middleware
 */
export const sanitizeAll = (options = {}) => [
  sanitizeBody(options),
  sanitizeParams,
  sanitizeQuery,
];

/**
 * Validation rules for booking creation with sanitization
 */
export const bookingSanitization = {
  create: [
    body("guestInfo.name")
      .optional()
      .trim()
      .isLength({ min: 2, max: MAX_LENGTHS["guestInfo.name"] })
      .withMessage(`Guest name must be 2-${MAX_LENGTHS["guestInfo.name"]} characters`)
      .custom((value) => {
        const sanitized = sanitizeString(value);
        if (sanitized !== value) {
          throw new Error("Guest name contains invalid characters");
        }
        // Name should only contain letters, spaces, hyphens, apostrophes
        if (!/^[a-zA-Z\s'-]+$/.test(sanitized)) {
          throw new Error("Name contains invalid characters. Only letters, spaces, hyphens, and apostrophes allowed.");
        }
        return true;
      }),
    
    body("guestInfo.email")
      .optional()
      .trim()
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail()
      .isLength({ max: MAX_LENGTHS["guestInfo.email"] })
      .withMessage(`Email must not exceed ${MAX_LENGTHS["guestInfo.email"]} characters`),
    
    body("guestInfo.phone")
      .optional()
      .trim()
      .matches(/^[+]?[\d\s-]{8,20}$/)
      .withMessage("Invalid phone number format")
      .isLength({ max: MAX_LENGTHS["guestInfo.phone"] })
      .withMessage(`Phone must not exceed ${MAX_LENGTHS["guestInfo.phone"]} characters`),
    
    body("guestInfo.idNumber")
      .optional()
      .trim()
      .isLength({ max: MAX_LENGTHS["guestInfo.idNumber"] })
      .withMessage(`ID number must not exceed ${MAX_LENGTHS["guestInfo.idNumber"]} characters`)
      .custom((value) => {
        const sanitized = sanitizeString(value);
        // ID numbers should be alphanumeric with some special chars
        if (!/^[a-zA-Z0-9-]+$/.test(sanitized)) {
          throw new Error("ID number contains invalid characters");
        }
        return true;
      }),
    
    body("specialRequests")
      .optional()
      .trim()
      .isLength({ max: MAX_LENGTHS["specialRequests"] })
      .withMessage(`Special requests must not exceed ${MAX_LENGTHS["specialRequests"]} characters`)
      .custom((value) => {
        const sanitized = sanitizeString(value);
        if (sanitized !== value) {
          throw new Error("Special requests contains invalid characters");
        }
        return true;
      }),
    
    body("notes")
      .optional()
      .trim()
      .isLength({ max: MAX_LENGTHS["notes"] })
      .withMessage(`Notes must not exceed ${MAX_LENGTHS["notes"]} characters`),
    
    // Handle validation errors
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array().map((e) => ({
            field: e.path,
            message: e.msg,
            value: e.value,
          })),
        });
      }
      next();
    },
  ],
  
  update: [
    body("specialRequests")
      .optional()
      .trim()
      .isLength({ max: MAX_LENGTHS["specialRequests"] })
      .withMessage(`Special requests must not exceed ${MAX_LENGTHS["specialRequests"]} characters`)
      .custom((value) => {
        const sanitized = sanitizeString(value);
        if (sanitized !== value) {
          throw new Error("Special requests contains invalid characters");
        }
        return true;
      }),
    
    body("notes")
      .optional()
      .trim()
      .isLength({ max: MAX_LENGTHS["notes"] })
      .withMessage(`Notes must not exceed ${MAX_LENGTHS["notes"]} characters`),
    
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array().map((e) => ({
            field: e.path,
            message: e.msg,
          })),
        });
      }
      next();
    },
  ],
};

/**
 * Sanitization for payment-related fields
 */
export const paymentSanitization = {
  capture: [
    body("reference")
      .optional()
      .trim()
      .isLength({ max: MAX_LENGTHS["reference"] })
      .withMessage(`Reference must not exceed ${MAX_LENGTHS["reference"]} characters`)
      .custom((value) => {
        const sanitized = sanitizeString(value);
        if (sanitized !== value) {
          throw new Error("Reference contains invalid characters");
        }
        return true;
      }),
    
    body("notes")
      .optional()
      .trim()
      .isLength({ max: MAX_LENGTHS["notes"] })
      .withMessage(`Notes must not exceed ${MAX_LENGTHS["notes"]} characters`),
    
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }
      next();
    },
  ],
  
  refund: [
    body("reason")
      .optional()
      .trim()
      .isLength({ max: MAX_LENGTHS["reason"] })
      .withMessage(`Reason must not exceed ${MAX_LENGTHS["reason"]} characters`)
      .custom((value) => {
        const sanitized = sanitizeString(value);
        if (sanitized !== value) {
          throw new Error("Reason contains invalid characters");
        }
        return true;
      }),
    
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }
      next();
    },
  ],
};

/**
 * Export the sanitizeString function for use in controllers
 */
export { sanitizeString, deepSanitize };

export default { sanitizeAll, sanitizeBody, sanitizeParams, sanitizeQuery, bookingSanitization, paymentSanitization };
