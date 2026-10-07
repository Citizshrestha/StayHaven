/**
 * Sentry Configuration
 *
 * @sentry/node ^8 is a direct dependency (Backend/package.json) — this used
 * to be a permanent no-op stub with a real v7-style implementation
 * commented out below it (Sentry.Handlers.*, Sentry.Integrations.Http/
 * Express), which no longer exist in v8 and would have thrown if
 * uncommented as-is. This file now actually initializes Sentry using the
 * current v8 API (Sentry.init with httpIntegration/expressIntegration,
 * Sentry.expressErrorHandler() for the error middleware — v8 auto-
 * instruments requests/tracing once init() has run, so there's no separate
 * request/tracing handler middleware to mount).
 *
 * Enable by setting SENTRY_DSN in .env. Without it, everything below is a
 * harmless no-op, same as before.
 */

import * as Sentry from "@sentry/node";

let sentryEnabled = false;

export const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    // Silently skip - no warning needed in development
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],

    // Filter out sensitive data before it ever leaves the process
    sendDefaultPii: false,
    beforeSend(event) {
      // Never ship credentials or contact details to Sentry.
      if (event.request?.headers) {
        for (const header of Object.keys(event.request.headers)) {
          if (/^(authorization|cookie|x-csrf-token|csrf-token)$/i.test(header)) event.request.headers[header] = "[REDACTED]";
        }
      }
      if (event.request) delete event.request.cookies;
      if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
      if (event.request?.data) {
        const sensitiveFields = ["password", "token", "apiKey", "secret", "cardNumber", "cvv", "cardDetails"];
        sensitiveFields.forEach((field) => {
          if (event.request.data[field]) {
            event.request.data[field] = "[REDACTED]";
          }
        });
      }
      return event;
    },

    ignoreErrors: [
      "ECONNRESET",
      "ENOTFOUND",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "NetworkError",
    ],
  });

  sentryEnabled = true;
  console.log("✅ Sentry initialized for error monitoring");
};

// v8's httpIntegration/expressIntegration instrument requests and tracing
// automatically once Sentry.init() has run above — no separate middleware
// needed. Kept as no-op passthroughs so server.js's existing app.use()
// call sites stay valid regardless of whether Sentry is configured.
export const sentryRequestHandler = () => (req, res, next) => next();
export const sentryTracingHandler = () => (req, res, next) => next();

// Real error-capturing middleware once Sentry is initialized; a passthrough
// otherwise so errors still reach the app's own error handler.
export const sentryErrorHandler = () =>
  sentryEnabled ? Sentry.expressErrorHandler() : (err, req, res, next) => next(err);

/**
 * Manually report an error/exception to Sentry outside the request cycle
 * (e.g. from process-level unhandledRejection/uncaughtException handlers).
 * No-op if Sentry isn't configured.
 */
export const captureException = (error, context) => {
  if (!sentryEnabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
};
