import React, { useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog — single implementation for the whole dashboard.
 * - role="dialog", aria-modal, aria-labelledby
 * - focus trap + focus restoration to the trigger
 * - Esc to close, background scroll lock, click-outside to close
 * - wrapped in .hotelAdminShell so tokens/fonts apply inside the portal
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md', // 'sm' | 'md' | 'lg'
  closeOnOverlay = true,
  labelledBy,
}) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const autoTitleId = useId();
  const titleId = labelledBy || autoTitleId;

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key === 'Tab') {
        const nodes = dialogRef.current?.querySelectorAll(FOCUSABLE);
        if (!nodes || nodes.length === 0) return;
        const list = Array.from(nodes).filter((n) => n.offsetParent !== null);
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus first focusable element inside the dialog
    const t = window.setTimeout(() => {
      const nodes = dialogRef.current?.querySelectorAll(FOCUSABLE);
      if (nodes && nodes.length > 0) nodes[0].focus();
      else dialogRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = overflow;
      // Restore focus to whatever triggered the modal
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = size === 'sm' ? 'ha-modal--sm' : size === 'lg' ? 'ha-modal--lg' : '';

  return createPortal(
    <div className="hotelAdminShell">
      <div
        className="ha-modal-overlay"
        onMouseDown={(e) => {
          if (closeOnOverlay && e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          ref={dialogRef}
          className={`ha-modal ${sizeClass}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {title && (
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" id={titleId}>
                {title}
              </h3>
              <IconButton aria-label="Close dialog" onClick={onClose}>
                <X size={18} aria-hidden="true" />
              </IconButton>
            </div>
          )}
          <div className="ha-modal__body">{children}</div>
          {footer && <div className="ha-modal__footer">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}
