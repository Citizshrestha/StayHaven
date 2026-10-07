import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../../../core/utils/cn';

const SIZES = {
  sm: 'w-9 h-9 g-small',
  md: 'w-11 h-11 g-body-strong',
  lg: 'w-20 h-20 text-2xl font-bold',
  xl: 'w-24 h-24 text-3xl font-bold',
};

/** Profile photo with an initial-letter fallback (also used if the image fails to load). */
const Avatar = ({ src, name, size = 'md', className, decorative = false }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const initial = (name || 'G').trim().charAt(0).toUpperCase() || 'G';
  const base = cn('shrink-0 rounded-full overflow-hidden', SIZES[size], className);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={decorative ? '' : name || 'Profile photo'}
        aria-hidden={decorative || undefined}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
        className={cn(base, 'object-cover bg-(--g-surface-sunken)')}
      />
    );
  }

  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name || 'Guest'}
      aria-hidden={decorative || undefined}
      className={cn(base, 'flex items-center justify-center bg-(--g-primary-fill) text-(--g-on-primary)')}
    >
      {initial}
    </span>
  );
};

Avatar.propTypes = {
  src: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(Object.keys(SIZES)),
  className: PropTypes.string,
  decorative: PropTypes.bool,
};

export default Avatar;
