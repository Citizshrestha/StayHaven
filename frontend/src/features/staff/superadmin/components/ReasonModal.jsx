import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ReasonModal.css';

/**
 * Asks for a short reason before a moderation action (replaces window.prompt,
 * which is unstyled, blocks the page and is awkward on phones).
 * Bottom sheet on phones, Esc / backdrop / Cancel close it, focus starts in
 * the textarea and returns to the opener.
 */
const ReasonModal = ({
  isOpen,
  title,
  description,
  label = 'Reason',
  confirmText = 'Confirm',
  maxLength = 500,
  busy = false,
  darkMode = false,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef(null);
  const openerRef = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    openerRef.current = document.activeElement;
    setReason('');
    setTouched(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => textareaRef.current?.focus(), 0);
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
    // busy/onCancel intentionally read at call time only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = reason.trim();
  const error = touched && !trimmed ? 'Please enter a reason.' : '';

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!trimmed || busy) return;
    onConfirm(trimmed);
  };

  return createPortal(
    <div className={`sa-reason-backdrop ${darkMode ? 'dark' : ''}`} onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <form
        className="sa-reason-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onSubmit={submit}
      >
        <h2 id={`${id}-title`} className="sa-reason-title">{title}</h2>
        {description && <p id={`${id}-desc`} className="sa-reason-desc">{description}</p>}
        <label htmlFor={`${id}-input`} className="sa-reason-label">{label}</label>
        <textarea
          id={`${id}-input`}
          ref={textareaRef}
          className="sa-reason-input"
          rows={4}
          maxLength={maxLength}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={`${id}-count${error ? ` ${id}-err` : ''}`}
        />
        <div className="sa-reason-meta">
          {error ? <span id={`${id}-err`} className="sa-reason-error" role="alert">{error}</span> : <span />}
          <span id={`${id}-count`} className="sa-reason-count">{reason.length}/{maxLength}</span>
        </div>
        <div className="sa-reason-actions">
          <button type="button" className="sa-reason-btn secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" className="sa-reason-btn danger" disabled={busy}>
            {busy && <span className="sa-reason-spinner" aria-hidden="true" />}
            {busy ? 'Saving…' : confirmText}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default ReasonModal;
