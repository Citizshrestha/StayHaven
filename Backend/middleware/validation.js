import { body, param, query, validationResult } from "express-validator";

/**
 * Validation Middleware
 * Comprehensive validation for all critical endpoints
 */

// Helper to handle validation errors
export const handleValidationErrors = (req, res, next) => {
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
};

/**
 * Booking Validation Rules
 */
export const bookingValidation = {
  create: [
    body("hotelId")
      .notEmpty()
      .withMessage("Hotel ID is required")
      .isMongoId()
      .withMessage("Invalid hotel ID"),
    body("roomId")
      .notEmpty()
      .withMessage("Room ID is required")
      .isMongoId()
      .withMessage("Invalid room ID"),
    body("checkIn")
      .notEmpty()
      .withMessage("Check-in date is required")
      .isISO8601()
      .withMessage("Invalid date format")
      .custom((value) => {
        const checkIn = new Date(value);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        // Allow bookings from today onwards (with some buffer for same-day)
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (checkIn < yesterday) {
          throw new Error("Check-in date cannot be in the past");
        }
        return true;
      }),
    body("checkOut")
      .notEmpty()
      .withMessage("Check-out date is required")
      .isISO8601()
      .withMessage("Invalid date format")
      .custom((value, { req }) => {
        const checkIn = new Date(req.body.checkIn);
        const checkOut = new Date(value);
        if (checkOut <= checkIn) {
          throw new Error("Check-out must be after check-in");
        }
        const maxStay = 365; // Maximum 1 year stay
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        if (nights > maxStay) {
          throw new Error(`Maximum stay is ${maxStay} nights`);
        }
        return true;
      }),
    body("guests.adults")
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage("Adults must be between 1 and 10"),
    body("guests.children")
      .optional()
      .isInt({ min: 0, max: 8 })
      .withMessage("Children must be between 0 and 8"),
    body("guestName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Guest name must be 2-100 characters"),
    body("guestEmail")
      .optional()
      .trim()
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("guestPhone")
      .optional()
      .trim()
      .matches(/^[+]?[\d\s-]{8,20}$/)
      .withMessage("Invalid phone number format"),
    body("specialRequests")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Special requests cannot exceed 500 characters"),
    body("paymentMethod")
      .notEmpty()
      .withMessage("Payment method is required")
      .isIn(["esewa", "khalti", "card", "bank", "bank-transfer"])
      .withMessage("Invalid payment method"),
    body("cardDetails")
      .optional()
      .isObject()
      .withMessage("Card details must be an object"),
    body("bankTransferDetails")
      .optional()
      .isObject()
      .withMessage("Bank transfer details must be an object"),
    handleValidationErrors,
  ],

  update: [
    param("id").isMongoId().withMessage("Invalid booking ID"),
    body("checkIn")
      .optional()
      .isISO8601()
      .withMessage("Invalid date format"),
    body("checkOut")
      .optional()
      .isISO8601()
      .withMessage("Invalid date format")
      .custom((value, { req }) => {
        if (req.body.checkIn) {
          const checkIn = new Date(req.body.checkIn);
          const checkOut = new Date(value);
          if (checkOut <= checkIn) {
            throw new Error("Check-out must be after check-in");
          }
        }
        return true;
      }),
    body("specialRequests")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Special requests cannot exceed 500 characters"),
    handleValidationErrors,
  ],

  checkIn: [
    param("bookingId").isMongoId().withMessage("Invalid booking ID"),
    body("__v")
      .optional()
      .isInt()
      .withMessage("Version must be an integer"),
    handleValidationErrors,
  ],
};

/**
 * Payment Validation Rules
 */
export const paymentValidation = {
  capture: [
    body("bookingId")
      .notEmpty()
      .withMessage("Booking ID is required")
      .isMongoId()
      .withMessage("Invalid booking ID"),
    body("amount")
      .notEmpty()
      .withMessage("Amount is required")
      .isFloat({ min: 0.01, max: 1000000 })
      .withMessage("Amount must be between 0.01 and 1,000,000"),
    body("method")
      .optional()
      .isIn(["cash", "credit-card", "debit-card", "bank-transfer", "upi", "online"])
      .withMessage("Invalid payment method"),
    body("reference")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Reference cannot exceed 100 characters"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Notes cannot exceed 1000 characters"),
    handleValidationErrors,
  ],

  refund: [
    body("transactionId")
      .notEmpty()
      .withMessage("Transaction ID is required")
      .isMongoId()
      .withMessage("Invalid transaction ID"),
    body("amount")
      .notEmpty()
      .withMessage("Amount is required")
      .isFloat({ min: 0.01, max: 1000000 })
      .withMessage("Amount must be between 0.01 and 1,000,000"),
    body("reason")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Reason cannot exceed 500 characters"),
    handleValidationErrors,
  ],

  createIntent: [
    body("amount")
      .notEmpty()
      .withMessage("Amount is required")
      .isFloat({ min: 0.01, max: 1000000 })
      .withMessage("Amount must be between 0.01 and 1,000,000"),
    body("currency")
      .optional()
      .isIn(["usd", "eur", "gbp", "inr", "npr"])
      .withMessage("Invalid currency"),
    body("bookingId")
      .optional()
      .isMongoId()
      .withMessage("Invalid booking ID"),
    handleValidationErrors,
  ],
};

/**
 * Guest Validation Rules
 */
export const guestValidation = {
  create: [
    body("fullName")
      .notEmpty()
      .withMessage("Full name is required")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be 2-100 characters")
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage("Name contains invalid characters"),
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("phone")
      .notEmpty()
      .withMessage("Phone is required")
      .trim()
      .matches(/^[+]?[\d\s-]{8,20}$/)
      .withMessage("Invalid phone number format"),
    body("country")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Country must be 2-100 characters"),
    body("idType")
      .optional()
      .isIn(["passport", "national-id", "drivers-license", "other"])
      .withMessage("Invalid ID type"),
    body("idNumber")
      .optional()
      .trim()
      .isLength({ min: 4, max: 50 })
      .withMessage("ID number must be 4-50 characters"),
    handleValidationErrors,
  ],

  update: [
    param("id").isMongoId().withMessage("Invalid guest ID"),
    body("fullName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be 2-100 characters"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("phone")
      .optional()
      .trim()
      .matches(/^[+]?[\d\s-]{8,20}$/)
      .withMessage("Invalid phone number format"),
    handleValidationErrors,
  ],
};

/**
 * Room Validation Rules
 */
export const roomValidation = {
  create: [
    body("roomNumber")
      .notEmpty()
      .withMessage("Room number is required")
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage("Room number must be 1-20 characters"),
    body("roomName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Room name must be 2-100 characters"),
    body("type")
      .notEmpty()
      .withMessage("Room type is required")
      .isIn(["single", "double", "suite", "deluxe", "villa", "Standard Twin", "Standard Queen", "Deluxe King", "Executive Suite", "Ocean View", "Presidential Suite", "Garden View"])
      .withMessage("Invalid room type"),
    body("price")
      .notEmpty()
      .withMessage("Price is required")
      .isFloat({ min: 0, max: 100000 })
      .withMessage("Price must be between 0 and 100,000"),
    body("floor")
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage("Floor must be between 1 and 200"),
    body("maxGuests")
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage("Max guests must be between 1 and 20"),
    body("capacity.adults")
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage("Adult capacity must be between 1 and 10"),
    body("capacity.children")
      .optional()
      .isInt({ min: 0, max: 8 })
      .withMessage("Child capacity must be between 0 and 8"),
    handleValidationErrors,
  ],

  updateStatus: [
    param("id").isMongoId().withMessage("Invalid room ID"),
    body("status")
      .notEmpty()
      .withMessage("Status is required")
      .isIn(["available", "occupied", "maintenance", "cleaning", "reserved"])
      .withMessage("Invalid room status"),
    handleValidationErrors,
  ],
};

/**
 * Batch Operations Validation Rules
 */
export const batchValidation = {
  checkIn: [
    body("bookingIds")
      .notEmpty()
      .withMessage("bookingIds array is required")
      .isArray({ min: 1, max: 50 })
      .withMessage("Must provide 1-50 booking IDs")
      .custom((value) => {
        if (!value.every((id) => /^[0-9a-fA-F]{24}$/.test(id))) {
          throw new Error("All booking IDs must be valid MongoDB IDs");
        }
        return true;
      }),
    body("expectedVersions")
      .optional()
      .isObject()
      .withMessage("expectedVersions must be an object"),
    handleValidationErrors,
  ],

  checkOut: [
    body("bookingIds")
      .notEmpty()
      .withMessage("bookingIds array is required")
      .isArray({ min: 1, max: 50 })
      .withMessage("Must provide 1-50 booking IDs")
      .custom((value) => {
        if (!value.every((id) => /^[0-9a-fA-F]{24}$/.test(id))) {
          throw new Error("All booking IDs must be valid MongoDB IDs");
        }
        return true;
      }),
    body("skipUnpaid")
      .optional()
      .isBoolean()
      .withMessage("skipUnpaid must be a boolean"),
    handleValidationErrors,
  ],

  payment: [
    body("items")
      .notEmpty()
      .withMessage("items array is required")
      .isArray({ min: 1, max: 50 })
      .withMessage("Must provide 1-50 payment items")
      .custom((value) => {
        for (const item of value) {
          if (!item.bookingId || !/^[0-9a-fA-F]{24}$/.test(item.bookingId)) {
            throw new Error("Each item must have a valid bookingId");
          }
          if (typeof item.amount !== "number" || item.amount <= 0) {
            throw new Error("Each item must have a positive amount");
          }
        }
        return true;
      }),
    body("method")
      .optional()
      .isIn(["cash", "credit-card", "debit-card", "bank-transfer", "upi", "online"])
      .withMessage("Invalid payment method"),
    handleValidationErrors,
  ],

  roomStatus: [
    body("roomIds")
      .notEmpty()
      .withMessage("roomIds array is required")
      .isArray({ min: 1, max: 100 })
      .withMessage("Must provide 1-100 room IDs")
      .custom((value) => {
        if (!value.every((id) => /^[0-9a-fA-F]{24}$/.test(id))) {
          throw new Error("All room IDs must be valid MongoDB IDs");
        }
        return true;
      }),
    body("newStatus")
      .notEmpty()
      .withMessage("newStatus is required")
      .isIn(["available", "maintenance", "cleaning"])
      .withMessage("Invalid status for bulk update"),
    handleValidationErrors,
  ],
};

/**
 * Query Validation Rules
 */
export const queryValidation = {
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Limit must be between 1 and 1000"),
    handleValidationErrors,
  ],

  dateRange: [
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid start date format"),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid end date format")
      .custom((value, { req }) => {
        if (req.query.startDate) {
          const start = new Date(req.query.startDate);
          const end = new Date(value);
          if (end < start) {
            throw new Error("End date must be after start date");
          }
          // Max range: 1 year
          const diff = (end - start) / (1000 * 60 * 60 * 24);
          if (diff > 365) {
            throw new Error("Date range cannot exceed 1 year");
          }
        }
        return true;
      }),
    handleValidationErrors,
  ],
};

/**
 * Maintenance Schedule Validation
 */
export const maintenanceValidation = {
  create: [
    body("title")
      .notEmpty()
      .withMessage("Title is required")
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("Title must be 2-200 characters"),
    body("scheduledDate")
      .notEmpty()
      .withMessage("Scheduled date is required")
      .isISO8601()
      .withMessage("Invalid date format"),
    body("category")
      .optional()
      .isIn(["preventive", "repair", "inspection", "deep-cleaning", "renovation", "electrical", "plumbing", "hvac", "other"])
      .withMessage("Invalid category"),
    body("scheduleType")
      .notEmpty()
      .withMessage("Schedule type is required")
      .isIn(["daily", "weekly", "monthly", "quarterly", "yearly", "custom", "one-time"])
      .withMessage("Invalid schedule type"),
    body("duration")
      .optional()
      .isInt({ min: 5, max: 1440 })
      .withMessage("Duration must be between 5 minutes and 24 hours"),
    body("priority")
      .optional()
      .isIn(["low", "normal", "high", "critical"])
      .withMessage("Invalid priority level"),
    handleValidationErrors,
  ],
};

/**
 * Email Communication Validation
 */
export const communicationValidation = {
  sendEmail: [
    body("to")
      .notEmpty()
      .withMessage("Recipient email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("subject")
      .notEmpty()
      .withMessage("Subject is required")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Subject must be 1-200 characters"),
    body("html")
      .notEmpty()
      .withMessage("Email body is required")
      .isLength({ min: 1, max: 50000 })
      .withMessage("Email body must not exceed 50KB"),
    handleValidationErrors,
  ],

  bookingId: [
    body("bookingId")
      .notEmpty()
      .withMessage("Booking ID is required")
      .isMongoId()
      .withMessage("Invalid booking ID"),
    handleValidationErrors,
  ],
};
