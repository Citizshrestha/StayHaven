import React from 'react';

/**
 * Shared hotel-admin button.
 * variant: 'primary' | 'secondary' | 'danger' | 'ghost'
 * size:    'sm' | 'md' | 'lg'
 */
const Button = React.forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    block = false,
    className = '',
    type = 'button',
    children,
    ...rest
  },
  ref
) {
  const cls = [
    'ha-btn',
    `ha-btn--${variant}`,
    size === 'sm' ? 'ha-btn--sm' : size === 'lg' ? 'ha-btn--lg' : '',
    block ? 'ha-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {children}
    </button>
  );
});

/**
 * Icon-only button — always requires an aria-label for accessibility.
 */
export const IconButton = React.forwardRef(function IconButton(
  { className = '', bordered = false, type = 'button', children, ...rest },
  ref
) {
  const cls = [
    'ha-icon-btn',
    bordered ? 'ha-icon-btn--bordered' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {children}
    </button>
  );
});

export default Button;
