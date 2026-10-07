import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../../../core/utils/cn';

const TONES = {
  primary: 'bg-(--g-primary-tint) text-(--g-primary-text)',
  success: 'bg-(--g-success-bg) text-(--g-success-text)',
  warning: 'bg-(--g-warning-bg) text-(--g-warning-text)',
  danger: 'bg-(--g-danger-bg) text-(--g-danger-text)',
  info: 'bg-(--g-info-bg) text-(--g-info-text)',
  neutral: 'bg-(--g-neutral-bg) text-(--g-neutral-text)',
  // Accent tones (guest-tokens.css) — feature identity rather than status meaning
  indigo: 'g-tone-indigo',
  violet: 'g-tone-violet',
  sky: 'g-tone-sky',
  amber: 'g-tone-amber',
  orange: 'g-tone-orange',
  rose: 'g-tone-rose',
  teal: 'g-tone-teal',
};

const StatCard = ({ icon: Icon, label, value, tone = 'primary', onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full min-w-0 text-left rounded-(--g-radius-md) bg-(--g-surface) border border-(--g-border) shadow-(--g-shadow-sm) p-4 sm:p-5',
        onClick && 'g-lift cursor-pointer min-h-[44px]'
      )}
    >
      {Icon && (
        <span className={cn('w-10 h-10 rounded-(--g-radius-sm) flex items-center justify-center mb-3', TONES[tone] || TONES.primary)}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
      )}
      <span className="block g-money text-(--g-text) truncate">{value}</span>
      <span className="block g-small text-(--g-text-muted) mt-0.5 truncate">{label}</span>
    </Tag>
  );
};

StatCard.propTypes = {
  icon: PropTypes.elementType,
  label: PropTypes.node.isRequired,
  value: PropTypes.node,
  tone: PropTypes.oneOf(Object.keys(TONES)),
  onClick: PropTypes.func,
};

export default StatCard;
