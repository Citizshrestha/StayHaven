/**
 * Sentry Configuration - Currently Disabled
 * 
 * To enable Sentry error monitoring:
 * 1. Install package: npm install @sentry/node --omit=optional
 * 2. Sign up at https://sentry.io and get your DSN
 * 3. Add SENTRY_DSN to your .env file
 * 4. Uncomment the code at the bottom of this file
 * 
 * Note: Profiling is optional and requires Python. Skip it if you don't need profiling.
 */

// Stub implementation - Sentry is disabled
export const initSentry = (app) => {
  console.log('⚠️  Sentry is disabled. Install @sentry/node to enable error monitoring.');
  console.log('   Run: npm install @sentry/node --omit=optional');
};

// Stub middleware - does nothing
export const sentryRequestHandler = () => (req, res, next) => next();
export const sentryTracingHandler = () => (req, res, next) => next();
export const sentryErrorHandler = () => (err, req, res, next) => next(err);

/* 
═══════════════════════════════════════════════════════════════════════════
UNCOMMENT THE CODE BELOW AFTER INSTALLING SENTRY PACKAGE
═══════════════════════════════════════════════════════════════════════════

import * as Sentry from "@sentry/node";

export const initSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured. Error monitoring disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Express integration
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive fields from request body
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'cardNumber', 'cvv'];
        sensitiveFields.forEach(field => {
          if (event.request.data[field]) {
            event.request.data[field] = '[REDACTED]';
          }
        });
      }
      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'NetworkError',
    ],
  });

  console.log('✅ Sentry initialized for error monitoring');
};

// Middleware to attach Sentry request handler
export const sentryRequestHandler = () => Sentry.Handlers.requestHandler();

// Middleware to attach Sentry tracing handler
export const sentryTracingHandler = () => Sentry.Handlers.tracingHandler();

// Middleware to attach Sentry error handler
export const sentryErrorHandler = () => Sentry.Handlers.errorHandler();

*/
