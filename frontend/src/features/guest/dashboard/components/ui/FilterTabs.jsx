import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../../../core/utils/cn';

/**
 * Horizontal filter tabs. Roving tabindex + Arrow/Home/End keys; scrolls
 * horizontally with an edge fade on narrow screens.
 */
const FilterTabs = ({ options, value, onChange, label, controls }) => {
  const refs = useRef([]);

  const move = (index) => {
    const next = (index + options.length) % options.length;
    onChange(options[next].value);
    const el = refs.current[next];
    el?.focus();
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };

  const onKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); move(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(index - 1); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(options.length - 1); }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="g-scroll-x flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]"
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => { refs.current[index] = el; }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={controls}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'shrink-0 min-h-[44px] px-4 rounded-(--g-radius-pill) g-small font-semibold whitespace-nowrap border transition-colors duration-150 ease-out',
              active
                ? 'bg-(--g-primary-fill) border-(--g-primary-fill) text-(--g-on-primary)'
                : 'bg-(--g-surface) border-(--g-border) text-(--g-text-muted) hover:border-(--g-border-strong) hover:text-(--g-text)'
            )}
          >
            {option.label}
            {Number.isFinite(option.count) && (
              <span className={cn('ml-1.5 guestNum', active ? 'opacity-90' : 'text-(--g-text-muted)')}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

FilterTabs.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.node.isRequired,
    count: PropTypes.number,
  })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  controls: PropTypes.string,
};

export default FilterTabs;
