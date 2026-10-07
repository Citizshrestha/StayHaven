import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../../../../core/utils/cn';
import useMediaQuery, { DESKTOP_QUERY } from '../../hooks/useMediaQuery';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
const EASE = [0.32, 0.72, 0, 1];

/**
 * Accessible sheet: bottom sheet on mobile, right drawer (max 420px) on desktop.
 * Focus trap, Esc, body scroll lock, focus restore, role=dialog + aria-modal.
 * Portaled into a `.guestPortal` wrapper so the design tokens still apply.
 */
const Sheet = ({ open, onClose, title, description, children, footer, dismissible = true, className }) => {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const first = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE);
      (first || panel).focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open]);

  const requestClose = () => {
    if (dismissibleRef.current) onCloseRef.current?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      requestClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const nodes = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (nodes.length === 0) { e.preventDefault(); panel.focus(); return; }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: EASE };
  const hidden = isDesktop ? { x: '100%' } : { y: '100%' };

  return createPortal(
    <div className="guestPortal" style={{ background: 'transparent' }}>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70]" onKeyDown={onKeyDown}>
            <Motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              onClick={requestClose}
              aria-hidden="true"
            />
            <Motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descId : undefined}
              tabIndex={-1}
              initial={hidden}
              animate={{ x: 0, y: 0 }}
              exit={hidden}
              transition={transition}
              className={cn(
                'absolute flex flex-col bg-(--g-surface) text-(--g-text) shadow-(--g-shadow-lg) outline-none',
                isDesktop
                  ? 'top-0 right-0 h-full w-full max-w-[420px] border-l border-(--g-border)'
                  : 'bottom-0 inset-x-0 max-h-[92dvh] rounded-t-(--g-radius-lg) border-t border-(--g-border) pb-[env(safe-area-inset-bottom)]',
                className
              )}
            >
              {!isDesktop && <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-(--g-border-strong)" />}
              <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-(--g-border)">
                <div className="min-w-0">
                  <h2 id={titleId} className="g-h2">{title}</h2>
                  {description && <p id={descId} className="g-small text-(--g-text-muted) mt-0.5">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={!dismissible}
                  aria-label="Close"
                  className="shrink-0 -mr-2 w-11 h-11 flex items-center justify-center rounded-(--g-radius-sm) text-(--g-text-muted) hover:bg-(--g-surface-sunken) disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
              {footer && <div className="border-t border-(--g-border) px-5 py-4 bg-(--g-surface)">{footer}</div>}
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};

Sheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  dismissible: PropTypes.bool,
  className: PropTypes.string,
};

export default Sheet;
