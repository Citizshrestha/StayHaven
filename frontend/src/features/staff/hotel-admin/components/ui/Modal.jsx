import React, { useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Ref-counted body scroll lock so stacked modals (e.g. a confirm opened from a
// detail modal) restore scrolling only when the last one closes.
let lockCount = 0;
let savedOverflow = '';
const lockScroll = () => {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
};
const unlockScroll = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = savedOverflow;
};

/**
 * Accessible modal dialog — single implementation for the whole dashboard.
 * - role="dialog" (or "alertdialog"), aria-modal, aria-labelledby/-describedby
 * - focus trap, initial focus on the first field (or initialFocusRef), focus
 *   restoration to the trigger
 * - Esc / overlay / X close, all blocked while `busy` (a save is in flight)
 * - ref-counted background scroll lock
 * - bottom sheet with sticky footer on phones (see ha-ui.css)
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
  describedBy,
  role = 'dialog',
  busy = false,
  initialFocusRef,
}) {
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const previouslyFocused = useRef(null);
  const autoTitleId = useId();
  const titleId = labelledBy || autoTitleId;

  const requestClose = useCallback(() => {
    if (!busy) onClose?.();
  }, [busy, onClose]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
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
    [requestClose]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    previouslyFocused.current = document.activeElement;
    lockScroll();

    // Focus the requested element, else the first field in the body, else
    // the first focusable control, else the dialog itself.
    const t = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ||
        bodyRef.current?.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])') ||
        dialogRef.current?.querySelector(FOCUSABLE);
      (target || dialogRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(t);
      unlockScroll();
      // Restore focus to whatever triggered the modal
      if (previouslyFocused.current instanceof HTMLElement && previouslyFocused.current.isConnected) {
        previouslyFocused.current.focus();
      }
    };
    // initialFocusRef is a ref object; reading .current at open time is intended
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = size === 'sm' ? 'ha-modal--sm' : size === 'lg' ? 'ha-modal--lg' : '';

  return createPortal(
    <div className="hotelAdminShell">
      <div
        className="ha-modal-overlay"
        onMouseDown={(e) => {
          if (closeOnOverlay && e.target === e.currentTarget) requestClose();
        }}
      >
        <div
          ref={dialogRef}
          className={`ha-modal ${sizeClass}`}
          role={role}
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={describedBy}
          aria-busy={busy ? 'true' : undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {title && (
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" id={titleId}>
                {title}
              </h3>
              <IconButton aria-label="Close dialog" onClick={requestClose} disabled={busy}>
                <X size={18} aria-hidden="true" />
              </IconButton>
            </div>
          )}
          <div className="ha-modal__body" ref={bodyRef}>{children}</div>
          {footer && <div className="ha-modal__footer">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}
