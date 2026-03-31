import React from 'react';
import { AlertTriangle, RefreshCw, X, Home } from 'lucide-react';

/**
 * Modal Error Boundary
 * Prevents modal errors from crashing the entire dashboard
 * Catches JavaScript errors anywhere in the modal component tree
 */
export class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Modal Error Boundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Send error to monitoring service if available
    if (window.errorReporter) {
      window.errorReporter.report({
        error: error?.toString(),
        componentStack: errorInfo?.componentStack,
        component: this.props.modalName || 'UnknownModal',
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleRetry = () => {
    // Reset error state to attempt re-render
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleClose = () => {
    // Close modal and reset state
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  handleReturnToDashboard = () => {
    // Navigate back to dashboard and close modal
    this.handleClose();
    
    // Navigate to dashboard if navigation function provided
    if (this.props.onNavigateToDashboard) {
      this.props.onNavigateToDashboard();
    }
  };

  render() {
    const { hasError, error, errorCount } = this.state;
    const { children, fallback, isDark = false, modalName = 'Modal' } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback UI
    if (fallback) {
      return fallback({
        error,
        errorCount,
        onRetry: this.handleRetry,
        onClose: this.handleClose,
        onReturnToDashboard: this.handleReturnToDashboard
      });
    }

    // Default error fallback UI
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) this.handleClose();
        }}
      >
        <div
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #1e293b 0%, #1a2332 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
            borderRadius: '20px',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '24px 28px 20px',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: isDark
                    ? 'linear-gradient(135deg, #ef444425, #ef444410)'
                    : 'linear-gradient(135deg, #ef444415, #ef444408)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={24} strokeWidth={2} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    margin: '0 0 4px 0',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Something Went Wrong
                </h2>
                <p
                  style={{
                    fontSize: '14px',
                    color: isDark ? '#64748b' : '#94a3b8',
                    margin: 0
                  }}
                >
                  {modalName} encountered an error
                </p>
              </div>
            </div>
            <button
              onClick={this.handleClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(0, 0, 0, 0.04)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isDark ? '#94a3b8' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
            {/* Error Message */}
            <div
              style={{
                padding: '14px 16px',
                background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                borderRadius: '10px',
                border: isDark ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid #fecaca',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p
                    style={{
                      fontSize: '13px',
                      color: isDark ? '#fca5a5' : '#dc2626',
                      fontWeight: '500',
                      margin: '0 0 4px 0'
                    }}
                  >
                    Error Details
                  </p>
                  <p
                    style={{
                      fontSize: '13px',
                      color: isDark ? '#94a3b8' : '#64748b',
                      margin: 0,
                      fontFamily: 'monospace',
                      wordBreak: 'break-word'
                    }}
                  >
                    {error?.message || 'An unexpected error occurred'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recovery Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Retry Button */}
              <button
                onClick={this.handleRetry}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
                }}
              >
                <RefreshCw size={18} />
                Try Again
              </button>

              {/* Return to Dashboard */}
              <button
                onClick={this.handleReturnToDashboard}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
                }}
              >
                <Home size={18} />
                Return to Dashboard
              </button>

              {/* Close Modal Only */}
              <button
                onClick={this.handleClose}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'transparent',
                  color: isDark ? '#64748b' : '#94a3b8',
                  border: 'none'
                }}
              >
                Close Modal Only
              </button>
            </div>

            {/* Error Count Warning */}
            {errorCount > 1 && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                  borderRadius: '8px',
                  border: isDark ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid #fde68a'
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    color: isDark ? '#fbbf24' : '#b45309',
                    margin: 0,
                    textAlign: 'center'
                  }}
                >
                  This error has occurred {errorCount} times. If it persists, please contact support.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

/**
 * HOC to wrap modal components with error boundary
 */
export const withModalErrorBoundary = (WrappedComponent, options = {}) => {
  return function WithModalErrorBoundary(props) {
    const { isDark, onClose, onNavigate } = props;
    
    return (
      <ModalErrorBoundary
        isDark={isDark}
        onClose={onClose}
        onNavigateToDashboard={onNavigate}
        modalName={options.modalName || WrappedComponent.displayName || WrappedComponent.name || 'Modal'}
      >
        <WrappedComponent {...props} />
      </ModalErrorBoundary>
    );
  };
};

/**
 * Hook for error handling in functional components
 */
export const useModalErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((err) => {
    console.error('Modal error:', err);
    setError(err);
    
    // Report to error boundary if possible
    if (window.errorReporter) {
      window.errorReporter.report({
        error: err?.toString(),
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};

export default ModalErrorBoundary;
