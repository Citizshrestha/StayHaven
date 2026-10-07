import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../../../core/utils/cn';

export const Skeleton = ({ className }) => (
  <span aria-hidden="true" className={cn('g-skeleton block rounded-(--g-radius-sm)', className)} />
);

Skeleton.propTypes = { className: PropTypes.string };

export const SkeletonCard = ({ lines = 3, media = false, className }) => (
  <div aria-hidden="true" className={cn('rounded-(--g-radius-lg) bg-(--g-surface) border border-(--g-border) overflow-hidden', className)}>
    {media && <Skeleton className="w-full aspect-video rounded-none" />}
    <div className="p-5 space-y-3">
      <Skeleton className="h-5 w-2/5" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i % 2 ? 'w-3/5' : 'w-4/5')} />
      ))}
    </div>
  </div>
);

SkeletonCard.propTypes = { lines: PropTypes.number, media: PropTypes.bool, className: PropTypes.string };

/** Screen-reader announcement + visual skeleton list used by every page. */
export const SkeletonList = ({ count = 3, label = 'Loading', ...cardProps }) => (
  <div role="status" aria-live="polite" className="space-y-4">
    <span className="sr-only">{label}…</span>
    {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} {...cardProps} />)}
  </div>
);

SkeletonList.propTypes = { count: PropTypes.number, label: PropTypes.string };
