/**
 * Environment Variable Validator
 * Validates required environment variables on server startup
 * Prevents server from starting with missing or invalid security-critical variables
 */

import { createLogger } from './logger.js';

const logger = createLogger('EnvValidator');

// Required environment variables for security
const REQUIRED_VARS = {
  // Database
  MONGODB_URI: {
    required: true,
    validate: (val) => val.startsWith('mongodb://') || val.startsWith('mongodb+srv://'),
    message: 'MONGODB_URI must be a valid MongoDB connection string',
  },

  // JWT Secrets
  JWT_SECRET: {
    required: true,
    validate: (val) => val.length >= 32,
    message: 'JWT_SECRET must be at least 32 characters for security',
  },
  JWT_REFRESH_SECRET: {
    required: true,
    validate: (val) => val.length >= 32,
    message: 'JWT_REFRESH_SECRET must be at least 32 characters for security',
  },

  // Node Environment
  NODE_ENV: {
    required: false,
    validate: (val) => ['development', 'production', 'test'].includes(val),
    message: 'NODE_ENV must be development, production, or test',
    default: 'development',
  },

  // CORS
  CLIENT_URL: {
    required: false,
    validate: (val) => val.split(',').every(url => url.trim().startsWith('http')),
    message: 'CLIENT_URL must be comma-separated HTTP(S) URLs',
    default: 'http://localhost:5173',
  },

  // Email (optional but recommended)
  EMAIL_USER: {
    required: false,
    validate: (val) => val.includes('@'),
    message: 'EMAIL_USER must be a valid email address',
  },
  EMAIL_PASS: {
    required: false,
    validate: (val) => val.length > 0,
    message: 'EMAIL_PASS must not be empty if EMAIL_USER is set',
  },

  // Cloudinary (optional)
  CLOUDINARY_CLOUD_NAME: {
    required: false,
    validate: (val) => val.length > 0,
    message: 'CLOUDINARY_CLOUD_NAME must not be empty',
  },
  CLOUDINARY_API_KEY: {
    required: false,
    validate: (val) => /^\d+$/.test(val),
    message: 'CLOUDINARY_API_KEY must be numeric',
  },
  CLOUDINARY_API_SECRET: {
    required: false,
    validate: (val) => val.length > 0,
    message: 'CLOUDINARY_API_SECRET must not be empty',
  },

  // Payment Gateways (optional)
  STRIPE_SECRET_KEY: {
    required: false,
    validate: (val) => val.startsWith('sk_'),
    message: 'STRIPE_SECRET_KEY must start with sk_',
  },
  STRIPE_WEBHOOK_SECRET: {
    required: false,
    validate: (val) => val.startsWith('whsec_'),
    message: 'STRIPE_WEBHOOK_SECRET must start with whsec_',
  },

  // Port
  PORT: {
    required: false,
    validate: (val) => {
      const port = parseInt(val, 10);
      return !isNaN(port) && port > 0 && port < 65536;
    },
    message: 'PORT must be a valid port number (1-65535)',
    default: '3000',
  },
};

/**
 * Validate a single environment variable
 */
const validateVar = (name, config) => {
  const value = process.env[name];

  // Check if required variable is missing
  if (config.required && !value) {
    return {
      valid: false,
      error: `Missing required environment variable: ${name}`,
    };
  }

  // If not required and not set, use default or skip
  if (!value) {
    if (config.default) {
      process.env[name] = config.default;
      logger.info(`Using default value for ${name}: ${config.default}`);
    }
    return { valid: true };
  }

  // Validate the value
  if (config.validate && !config.validate(value)) {
    return {
      valid: false,
      error: `Invalid ${name}: ${config.message}`,
    };
  }

  return { valid: true };
};

/**
 * Validate all environment variables
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  // Validate each required variable
  for (const [name, config] of Object.entries(REQUIRED_VARS)) {
    const result = validateVar(name, config);
    if (!result.valid) {
      errors.push(result.error);
    }
  }

  // Check for common security issues
  if (process.env.NODE_ENV === 'production') {
    // Production-specific checks
    if (process.env.JWT_SECRET === 'your-secret-key-here' ||
        process.env.JWT_SECRET === 'secret') {
      errors.push('JWT_SECRET must be changed from default value in production');
    }

    if (process.env.JWT_REFRESH_SECRET === 'your-refresh-secret-key-here' ||
        process.env.JWT_REFRESH_SECRET === 'secret') {
      errors.push('JWT_REFRESH_SECRET must be changed from default value in production');
    }

    if (!process.env.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not set - error monitoring disabled');
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      warnings.push('Email credentials not set - email notifications disabled');
    }

    // Check if using localhost in CLIENT_URL
    if (process.env.CLIENT_URL && process.env.CLIENT_URL.includes('localhost')) {
      warnings.push('CLIENT_URL contains localhost in production - this may be incorrect');
    }
  }

  // Log warnings
  warnings.forEach(warning => logger.warn(warning));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate environment and exit if invalid
 * Call this at server startup
 */
export const validateEnvironmentOrExit = () => {
  logger.info('Validating environment variables...');

  const result = validateEnvironment();

  if (!result.valid) {
    logger.error('Environment validation failed:');
    result.errors.forEach(error => logger.error(`  ❌ ${error}`));

    logger.error('\nServer cannot start with invalid environment configuration.');
    logger.error('Please check your .env file and ensure all required variables are set correctly.\n');

    process.exit(1);
  }

  if (result.warnings.length > 0) {
    logger.warn('Environment validation warnings:');
    result.warnings.forEach(warning => logger.warn(`  ⚠️  ${warning}`));
  }

  logger.info('✅ Environment validation passed');
};

/**
 * Get sanitized environment info for logging (removes sensitive values)
 */
export const getSanitizedEnvInfo = () => {
  const sensitiveKeys = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_SECRET',
    'MONGODB_URI',
    'SMTP_PASS',
    'CLOUDINARY_API_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'KHALTI_SECRET_KEY',
    'ESEWA_SECRET_KEY',
    'SENTRY_DSN',
    'GOOGLE_CLIENT_SECRET',
  ];

  const envInfo = {};

  for (const key of Object.keys(REQUIRED_VARS)) {
    if (process.env[key]) {
      if (sensitiveKeys.includes(key)) {
        envInfo[key] = '[REDACTED]';
      } else {
        envInfo[key] = process.env[key];
      }
    } else {
      envInfo[key] = '[NOT SET]';
    }
  }

  return envInfo;
};

export default {
  validateEnvironment,
  validateEnvironmentOrExit,
  getSanitizedEnvInfo,
};
