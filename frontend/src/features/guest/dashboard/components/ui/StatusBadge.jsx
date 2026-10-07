import React from 'react';
import PropTypes from 'prop-types';
import {
  CheckCircle2, Clock, XCircle, AlertTriangle, LogIn, LogOut, ChefHat, PackageCheck, Truck, CircleDot, Loader, RotateCcw, Ban,
} from 'lucide-react';
import { cn } from '../../../../../core/utils/cn';

const TONE_CLASS = {
  success: 'bg-(--g-success-bg) text-(--g-success-text)',
  warning: 'bg-(--g-warning-bg) text-(--g-warning-text)',
  danger: 'bg-(--g-danger-bg) text-(--g-danger-text)',
  info: 'bg-(--g-info-bg) text-(--g-info-text)',
  neutral: 'bg-(--g-neutral-bg) text-(--g-neutral-text)',
  primary: 'bg-(--g-primary-tint) text-(--g-primary-text)',
};

// One map for every status the guest portal renders, keyed by domain.
// Keys are lower-case; lookups are case-insensitive. Icon + text means colour
// is never the only carrier of meaning.
const STATUS_MAP = {
  booking: {
    pending: { label: 'Pending', tone: 'warning', icon: Clock },
    confirmed: { label: 'Confirmed', tone: 'success', icon: CheckCircle2 },
    'checked-in': { label: 'Checked in', tone: 'primary', icon: LogIn },
    'checked-out': { label: 'Checked out', tone: 'neutral', icon: LogOut },
    cancelled: { label: 'Cancelled', tone: 'danger', icon: XCircle },
    'no-show': { label: 'No-show', tone: 'neutral', icon: Ban },
  },
  order: {
    pending: { label: 'Pending', tone: 'warning', icon: Clock },
    confirmed: { label: 'Confirmed', tone: 'info', icon: CheckCircle2 },
    preparing: { label: 'Preparing', tone: 'primary', icon: ChefHat },
    ready: { label: 'Ready', tone: 'success', icon: PackageCheck },
    delivered: { label: 'Delivered', tone: 'neutral', icon: Truck },
    cancelled: { label: 'Cancelled', tone: 'danger', icon: XCircle },
  },
  invoice: {
    paid: { label: 'Paid', tone: 'success', icon: CheckCircle2 },
    pending: { label: 'Pending', tone: 'warning', icon: Clock },
    partial: { label: 'Partial', tone: 'info', icon: Clock },
    overdue: { label: 'Overdue', tone: 'danger', icon: AlertTriangle },
    refunded: { label: 'Refunded', tone: 'neutral', icon: RotateCcw },
  },
  request: {
    open: { label: 'Open', tone: 'warning', icon: CircleDot },
    'in-progress': { label: 'In progress', tone: 'info', icon: Loader },
    resolved: { label: 'Resolved', tone: 'success', icon: CheckCircle2 },
    closed: { label: 'Closed', tone: 'neutral', icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', tone: 'danger', icon: XCircle },
  },
};

const humanize = (value) => {
  const text = String(value || 'Unknown').replace(/[-_]/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const StatusBadge = ({ domain, status, className }) => {
  const meta = STATUS_MAP[domain]?.[String(status || '').toLowerCase()];
  const Icon = meta?.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-(--g-radius-pill) g-small font-semibold whitespace-nowrap',
        TONE_CLASS[meta?.tone || 'neutral'],
        className
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
      {meta?.label || humanize(status)}
    </span>
  );
};

StatusBadge.propTypes = {
  domain: PropTypes.oneOf(Object.keys(STATUS_MAP)).isRequired,
  status: PropTypes.string,
  className: PropTypes.string,
};

export default StatusBadge;
