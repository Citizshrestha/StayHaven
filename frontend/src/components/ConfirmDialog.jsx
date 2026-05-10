import React from 'react';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import './ConfirmDialog.css';

/**
 * Reusable confirmation dialog component
 *
 * @param {boolean} isOpen - Whether the dialog is visible
 * @param {function} onClose - Callback when dialog is closed/cancelled
 * @param {function} onConfirm - Callback when user confirms the action
 * @param {string} title - Dialog title
 * @param {string} message - Main message to display
 * @param {string} details - Optional additional details (shown in a box)
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} variant - Visual variant: 'danger', 'warning', 'info' (default: 'warning')
 * @param {boolean} loading - Whether the action is in progress
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  details = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  loading = false,
}) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!loading && onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!loading && onClose) {
      onClose();
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
      case 'warning':
        return <AlertTriangle size={24} />;
      case 'info':
        return <Info size={24} />;
      default:
        return <AlertTriangle size={24} />;
    }
  };

  return (
    <div className="confirm-dialog-overlay" onClick={handleCancel}>
      <div
        className={`confirm-dialog ${isDark ? 'dark' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <div className={`confirm-dialog-icon ${variant}`}>
            {getIcon()}
          </div>
          <div className="confirm-dialog-content">
            <h3 className="confirm-dialog-title">{title}</h3>
            <p className="confirm-dialog-message">{message}</p>
          </div>
        </div>

        {details && (
          <div className="confirm-dialog-body">
            <div className="confirm-dialog-details">{details}</div>
          </div>
        )}

        <div className="confirm-dialog-footer">
          <button
            className="confirm-dialog-btn confirm-dialog-btn-cancel"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-dialog-btn confirm-dialog-btn-confirm ${variant}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 size={16} className="confirm-dialog-spinner" />}
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
