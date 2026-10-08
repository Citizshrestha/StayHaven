import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal that is a bottom sheet on phones (full width, rounded top, scrolls inside, footer stays
 * reachable above the keyboard / home indicator) and a centred dialog from 640px up.
 * Handles Esc, backdrop tap, body scroll lock (restored on close), focus trap and focus return.
 */
const Sheet = ({ open, onClose, title, subtitle, icon, children, footer, closeDisabled = false, maxWidth = 'sm:max-w-lg' }) => {
  const panelRef = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const lockedRef = useRef(closeDisabled);
  lockedRef.current = closeDisabled;

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panelRef.current?.querySelector(FOCUSABLE);
    (first || panelRef.current)?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !lockedRef.current) {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sheet-fade"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !closeDisabled) onClose?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white w-full ${maxWidth} flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[rgba(0,191,166,0.2)] max-h-[calc(100vh-16px)] max-h-[calc(100dvh-16px)] sm:max-h-[90vh] outline-none sheet-rise`}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[rgba(0,191,166,0.2)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#00BFA6] to-[#00E5CC] flex items-center justify-center text-white">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg sm:text-xl font-bold text-[#263238] truncate">{title}</h2>
              {subtitle && <p className="text-sm text-[#546E7A] truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close"
            className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#546E7A]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-6">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[rgba(0,191,166,0.2)] bg-gray-50 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 rounded-b-none sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes sheetFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sheetRise { from { transform: translateY(24px); opacity: .6 } to { transform: translateY(0); opacity: 1 } }
        .sheet-fade { animation: sheetFade .2s ease-out }
        .sheet-rise { animation: sheetRise .28s ease-out }
        @media (prefers-reduced-motion: reduce) { .sheet-fade, .sheet-rise { animation: none } }
      `}</style>
    </div>,
    document.body,
  );
};

Sheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  icon: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  closeDisabled: PropTypes.bool,
  maxWidth: PropTypes.string,
};

export default Sheet;
