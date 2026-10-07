import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../../../core/utils/cn';

const VARIANTS = {
  primary: 'bg-(--g-primary-fill) text-(--g-on-primary) hover:bg-(--g-primary-fill-hover) border-transparent shadow-(--g-shadow-sm)',
  secondary: 'bg-(--g-surface) text-(--g-text) border-(--g-border-strong) hover:bg-(--g-surface-sunken)',
  ghost: 'bg-transparent text-(--g-primary-text) border-transparent hover:bg-(--g-primary-tint)',
  danger: 'bg-(--g-danger-fill) text-white border-transparent hover:opacity-90 shadow-(--g-shadow-sm)',
  dangerOutline: 'bg-(--g-surface) text-(--g-danger-text) border-(--g-border-strong) hover:bg-(--g-danger-bg)',
};

/**
 * Guest portal button: 44px min target, one style source for every CTA.
 * Disabled uses an explicit muted fill (not opacity) so a disabled primary
 * reads as clearly "off" instead of a washed-out teal.
 */
const Button = ({ variant = 'primary', loading = false, icon: Icon, className, children, disabled, type = 'button', ...rest }) => {
  const isDisabled = disabled || loading;
  const disabledLook = disabled && !loading; // loading keeps variant colour
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-(--g-radius-sm) border g-small font-semibold',
        'transition-colors duration-150 ease-out disabled:cursor-not-allowed',
        disabledLook
          ? 'bg-(--g-disabled-bg) text-(--g-disabled-text) border-(--g-disabled-border)'
          : cn(VARIANTS[variant], loading && 'opacity-90'),
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
      {children}
    </button>
  );
};

Button.propTypes = {
  variant: PropTypes.oneOf(Object.keys(VARIANTS)),
  loading: PropTypes.bool,
  icon: PropTypes.elementType,
  className: PropTypes.string,
  children: PropTypes.node,
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
};

export default Button;
