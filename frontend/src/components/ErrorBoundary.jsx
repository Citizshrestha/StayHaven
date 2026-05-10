import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service (Sentry)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Send to Sentry if configured
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorCard}>
            <div className={styles.iconWrapper}>
              <AlertTriangle className={styles.icon} />
            </div>

            <h1 className={styles.title}>Oops! Something went wrong</h1>

            <p className={styles.message}>
              We're sorry, but something unexpected happened. Our team has been notified and we're working on it.
            </p>

            {this.state.errorId && (
              <div className={styles.errorId}>
                <span className={styles.errorIdLabel}>Error ID:</span>
                <code className={styles.errorIdCode}>{this.state.errorId}</code>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={styles.errorDetails}>
                <summary className={styles.errorSummary}>Technical Details (Development Only)</summary>
                <div className={styles.errorStack}>
                  <p className={styles.errorName}>{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className={styles.errorStackTrace}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className={styles.actions}>
              <button onClick={this.handleReload} className={styles.primaryButton}>
                <RefreshCw className={styles.buttonIcon} />
                Reload Page
              </button>
              <button onClick={this.handleGoHome} className={styles.secondaryButton}>
                <Home className={styles.buttonIcon} />
                Go to Home
              </button>
            </div>

            <p className={styles.helpText}>
              If this problem persists, please contact support at{' '}
              <a href="mailto:support@stayhaven.com" className={styles.link}>
                support@stayhaven.com
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
