import React from 'react';
import PropTypes from 'prop-types';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../../../../core/utils/cn';
import { PULL_THRESHOLD } from '../../hooks/usePullToRefresh';

/** Visual feedback for usePullToRefresh; renders nothing when idle. */
const PullIndicator = ({ pull, refreshing }) => {
  if (!pull && !refreshing) return null;
  const height = refreshing ? 48 : pull;
  return (
    <div aria-hidden="true" className="lg:hidden flex items-end justify-center overflow-hidden" style={{ height }}>
      <span className="mb-2 w-9 h-9 rounded-full bg-(--g-surface) border border-(--g-border) shadow-(--g-shadow-md) flex items-center justify-center">
        <RefreshCw
          className={cn('w-4 h-4', pull >= PULL_THRESHOLD || refreshing ? 'text-(--g-primary-text)' : 'text-(--g-text-muted)', refreshing && 'animate-spin')}
          style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
        />
      </span>
    </div>
  );
};

PullIndicator.propTypes = { pull: PropTypes.number.isRequired, refreshing: PropTypes.bool };

export default PullIndicator;
