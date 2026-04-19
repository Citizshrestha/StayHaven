/**
 * Frontend Logging Utility
 *
 * Provides environment-aware logging for the frontend:
 * - Only logs in development mode
 * - Structured log levels (debug, info, warn, error)
 * - Can be extended for production error tracking (Sentry, LogRocket, etc.)
 */

const isDevelopment = import.meta.env?.DEV ?? process.env.NODE_ENV !== 'production';

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase().padEnd(5)} [${this.context}] ${message}${metaStr}`;
  }

  debug(message, meta = {}) {
    if (!isDevelopment) return;
    console.log(this._formatMessage('debug', message, meta));
  }

  info(message, meta = {}) {
    if (!isDevelopment) return;
    console.info(this._formatMessage('info', message, meta));
  }

  warn(message, meta = {}) {
    if (!isDevelopment) return;
    console.warn(this._formatMessage('warn', message, meta));
  }

  error(message, meta = {}) {
    // Always log errors, but in production consider sending to error tracking
    console.error(this._formatMessage('error', message, meta));

    // In production, you could send to Sentry, LogRocket, etc.
    // if (!isDevelopment && window.Sentry) {
    //   window.Sentry.captureException(new Error(message), { extra: meta });
    // }
  }

  child(context) {
    return new Logger(`${this.context}:${context}`);
  }
}

export const createLogger = (context) => new Logger(context);

export const logger = new Logger('App');

export default logger;