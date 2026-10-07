import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

// Body scroll lock is reference-counted so stacked modals restore correctly.
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
 * Shared modal behaviour: Esc to close, Tab focus trap, initial focus,
 * focus return to the opener, and background scroll lock.
 *
 * @param {React.RefObject<HTMLElement>} containerRef  the dialog element
 * @param {object}   options
 * @param {boolean}  options.isOpen
 * @param {Function} options.onClose        called on Esc
 * @param {boolean} [options.canClose=true] false while an action is in flight
 * @param {React.RefObject<HTMLElement>} [options.initialFocusRef]
 */
export default function useModalA11y(containerRef, { isOpen, onClose, canClose = true, initialFocusRef } = {}) {
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);
  onCloseRef.current = onClose;
  canCloseRef.current = canClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const opener = document.activeElement;
    lockScroll();

    const focusFirst = () => {
      const node = containerRef.current;
      if (!node) return;
      const target = initialFocusRef?.current || node.querySelector(FOCUSABLE) || node;
      target.focus({ preventScroll: true });
    };
    const frame = requestAnimationFrame(focusFirst);

    const onKeyDown = (event) => {
      const node = containerRef.current;
      if (!node) return;
      if (event.key === 'Escape') {
        if (canCloseRef.current) {
          event.stopPropagation();
          onCloseRef.current?.();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown, true);
      unlockScroll();
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [isOpen, containerRef, initialFocusRef]);
}
