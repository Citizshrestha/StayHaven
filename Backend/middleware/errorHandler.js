/**
 * Centralized Error Handling Middleware
 * 
 * Captures all errors, logs them, and returns consistent error responses to clients.
 * Sentry integration is optional - will work without it.
 */

// Custom error class for operational errors
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: error.message,
      stack: err.stack,
      statusCode: error.statusCode,
      path: req.path,
      method: req.method,
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = process.env.NODE_ENV === 'production'
      ? 'Resource not found'
      : `Resource not found with id: ${err.value}`;
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = process.env.NODE_ENV === 'production'
      ? 'This value already exists. Please use another value.'
      : `Duplicate field value: ${field}. Please use another value.`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = process.env.NODE_ENV === 'production'
      ? 'Invalid input data. Please check your entries.'
      : Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Your token has expired. Please log in again.', 401);
  }

  // Optional: Capture error in Sentry (only if Sentry is configured)
  // This will be skipped if @sentry/node is not installed
  try {
    if (process.env.SENTRY_DSN && (!error.isOperational || error.statusCode >= 500)) {
      // Dynamically import Sentry only if it's available
      import('@sentry/node').then((Sentry) => {
        Sentry.captureException(err, {
          tags: {
            path: req.path,
            method: req.method,
            statusCode: error.statusCode,
          },
          user: req.user ? {
            id: req.user._id?.toString(),
            email: req.user.email,
            username: req.user.fullname,
          } : undefined,
          extra: {
            body: req.body,
            query: req.query,
            params: req.params,
          },
        });
      }).catch(() => {
        // Sentry not available, continue without it
      });
    }
  } catch (sentryError) {
    // Sentry error - log but don't crash
    console.log('⚠️  Sentry error capture failed (Sentry may not be installed)');
  }

  // Send error response
  // In production, sanitize error messages to avoid leaking sensitive information
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(error.statusCode).json({
    success: false,
    message: isProduction && error.statusCode >= 500
      ? 'An error occurred. Please try again later.'
      : error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: error
    }),
    // Include error ID for support reference in production
    ...(isProduction && error.statusCode >= 500 && {
      errorId: generateErrorId()
    })
  });
};

// Generate unique error ID for tracking
function generateErrorId() {
  return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler for undefined routes
export const notFound = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};
