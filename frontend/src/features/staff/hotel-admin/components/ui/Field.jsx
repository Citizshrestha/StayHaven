import React, { useId } from 'react';
import { AlertCircle, Search } from 'lucide-react';

/**
 * Labeled text input with inline validation.
 * Ties label/input via htmlFor/id and exposes aria-invalid/aria-describedby.
 */
export function Input({
  label,
  error,
  id,
  className = '',
  required = false,
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
      <input
        id={inputId}
        className={`ha-input ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errId : undefined}
        aria-required={required || undefined}
        {...rest}
      />
      {error && (
        <span className="ha-field__error" id={errId} role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

export function Textarea({ label, error, id, className = '', required = false, ...rest }) {
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
      <textarea
        id={inputId}
        className={`ha-textarea ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errId : undefined}
        {...rest}
      />
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
