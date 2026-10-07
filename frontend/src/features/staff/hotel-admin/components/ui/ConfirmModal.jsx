import React, { useId, useRef } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

const ICONS = {
  danger: { Icon: Trash2, bg: 'var(--ha-danger-bg)', color: 'var(--ha-danger-text)' },
  warning: { Icon: AlertTriangle, bg: 'var(--ha-warning-bg)', color: 'var(--ha-warning-text)' },
  info: { Icon: Info, bg: 'var(--ha-info-bg)', color: 'var(--ha-info-text)' },
};

/**
 * Hotel-admin confirmation dialog (drop-in for shared ConfirmDialog props).
 * role="alertdialog", focus starts on Cancel, Esc/overlay blocked while loading.
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  variant = 'danger',
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  children,
}) {
  const cancelRef = useRef(null);
  const descId = useId();
  const { Icon, bg, color } = ICONS[variant] || ICONS.info;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      role="alertdialog"
      describedBy={descId}
      busy={loading}
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={loading}>{cancelText}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {loading ? 'Working…' : confirmText}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span
          aria-hidden="true"
          style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 'var(--ha-radius-md)', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon size={20} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p id={descId} className="ha-body" style={{ color: 'var(--ha-text-muted)', margin: 0, overflowWrap: 'anywhere' }}>{message}</p>
          {children}
        </div>
      </div>
    </Modal>
  );
}
