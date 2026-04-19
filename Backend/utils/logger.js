/**
 * Centralized Logging Utility
 *
 * Provides structured logging with:
 * - Log levels (debug, info, warn, error)
 * - Timestamps
 * - Environment-aware output (development vs production)
 * - Optional file logging for production
 * - Sentry integration for errors
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
  timestamp: '\x1b[90m', // gray
};

class Logger {
  constructor(context = 'App') {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.logLevel = this.isDevelopment ? 'debug' : 'info';
  }

  _shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.logLevel];
  }

  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const color = LOG_COLORS[level] || '';
    const reset = LOG_COLORS.reset;

    if (this.isDevelopment) {
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      return `${LOG_COLORS.timestamp}[${timestamp}]${reset} ${color}${level.toUpperCase().padEnd(5)}${reset} [${this.context}] ${message}${metaStr}`;
    }

    // Production format (JSON for log aggregation)
    return JSON.stringify({
      timestamp,
      level,
      context: this.context,
      message,
      ...meta,
    });
  }

  debug(message, meta = {}) {
    if (!this._shouldLog('debug')) return;
    if (this.isDevelopment) {
      console.log(this._formatMessage('debug', message, meta));
    }
  }

  info(message, meta = {}) {
    if (!this._shouldLog('info')) return;
    console.log(this._formatMessage('info', message, meta));
  }

  warn(message, meta = {}) {
    if (!this._shouldLog('warn')) return;
    console.warn(this._formatMessage('warn', message, meta));
  }

  error(message, meta = {}) {
    if (!this._shouldLog('error')) return;
    console.error(this._formatMessage('error', message, meta));

    // Send to Sentry in production if configured
    if (process.env.SENTRY_DSN) {
      try {
        import('@sentry/node').then((Sentry) => {
          Sentry.captureException(new Error(message), {
            extra: meta,
            tags: { context: this.context },
          });
        }).catch(() => {});
      } catch {}
    }
  }

  // Convenience method for creating child loggers
  child(context) {
    return new Logger(`${this.context}:${context}`);
  }
}

// Factory function to create loggers for specific modules
export const createLogger = (context) => new Logger(context);

// Default logger instance
export const logger = new Logger('App');

export default logger;