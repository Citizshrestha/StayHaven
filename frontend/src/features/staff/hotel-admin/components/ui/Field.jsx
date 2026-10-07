import React, { useId } from 'react';
import { AlertCircle, Search } from 'lucide-react';

/**
 * Labeled text input with inline validation.
 * Ties label/input via htmlFor/id and exposes aria-invalid/aria-describedby.
 */
// Helper text and/or "n / max" counter under a field.
function FieldHint({ id, hint, value, maxLength }) {
  const showCount = maxLength && typeof value === 'string';
  if (!hint && !showCount) return null;
  return (
    <span className="ha-field__hint" id={id}>
      {hint && <span>{hint}</span>}
      {showCount && (
        <span className="ha-field__count" data-over={value.length > maxLength ? 'true' : undefined}>
          {value.length} / {maxLength}
        </span>
      )}
    </span>
  );
}

const describedBy = (...ids) => ids.filter(Boolean).join(' ') || undefined;

export function Input({
  label,
  error,
  hint,
  counter = false,
  id,
  className = '',
  required = false,
  ...rest
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const errId = `${inputId}-err`;
  const hintId = `${inputId}-hint`;
  const hasHint = hint || (counter && rest.maxLength);
  return (
    <div className="ha-field">
      {label && (
        <label className="ha-field__label" htmlFor={inputId}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`ha-input ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(error && errId, hasHint && hintId)}
        aria-required={required || undefined}
        {...rest}
      />
      {hasHint && <FieldHint id={hintId} hint={hint} value={counter ? rest.value : undefined} maxLength={counter ? rest.maxLength : undefined} />}
      {error && (
        <span className="ha-field__error" id={errId} role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

export function Textarea({ label, error, hint, counter = false, id, className = '', required = false, ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  const errId = `${inputId}-err`;
  const hintId = `${inputId}-hint`;
  const hasHint = hint || (counter && rest.maxLength);
  return (
    <div className="ha-field">
      {label && (
        <label className="ha-field__label" htmlFor={inputId}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={`ha-textarea ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(error && errId, hasHint && hintId)}
        {...rest}
      />
      {hasHint && <FieldHint id={hintId} hint={hint} value={counter ? rest.value : undefined} maxLength={counter ? rest.maxLength : undefined} />}
      {error && (
        <span className="ha-field__error" id={errId} role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

export function Select({
  label,
  error,
  id,
  className = '',
  required = false,
  children,
  ...rest
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const errId = `${inputId}-err`;
  return (
    <div className="ha-field">
      {label && (
        <label className="ha-field__label" htmlFor={inputId}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <select
        id={inputId}
        className={`ha-select ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errId : undefined}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <span className="ha-field__error" id={errId} role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * Debounced-ready search input (debouncing handled by caller via value/onChange).
 */
export function SearchInput({ value, onChange, placeholder = 'Search…', ariaLabel = 'Search', className = '' }) {
  return (
    <div className={`ha-search ${className}`}>
      <Search size={16} className="ha-search__icon" aria-hidden="true" />
      <input
        type="search"
        className="ha-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  );
}
