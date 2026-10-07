/**
 * Guest Dashboard - Requests View
 * Submit and track service requests (housekeeping, maintenance, amenities).
 * Styling comes exclusively from the guest design tokens (guest-tokens.css).
 */

import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Plus, ClipboardList, Wrench, Sparkles, Coffee, HelpCircle, LogOut, Zap, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { getGuestRequests, submitRequest } from '../guestDashboardApi';
import { useSocket } from '../../../../core/context/SocketContext';
import { cn } from '../../../../core/utils/cn';
import useMediaQuery, { DESKTOP_QUERY } from '../hooks/useMediaQuery';
import usePullToRefresh from '../hooks/usePullToRefresh';
import { errorMessage, formatDateTime, formatRelative, formatDate } from '../utils/format';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import FilterTabs from '../components/ui/FilterTabs';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Sheet from '../components/ui/Sheet';
import PullIndicator from '../components/ui/PullIndicator';
import { SkeletonCard } from '../components/ui/Skeleton';

// Mirrors guestDashboardController.submitRequest validation.
const CATEGORIES = ['Maintenance', 'Amenities', 'Room Service', 'Checkout', 'Other'];
const DESC_MIN = 5;
const DESC_MAX = 500;

const categoryIcons = {
  Maintenance: Wrench,
  Amenities: Sparkles,
  'Room Service': Coffee,
  Checkout: LogOut,
  Other: HelpCircle,
};

// Accent per category (guest-tokens.css) so request types are recognisable at a glance.
const categoryTone = {
  Maintenance: { tile: 'g-tone-amber', fg: 'text-(--g-amber-fg)' },
  Amenities: { tile: 'g-tone-violet', fg: 'text-(--g-violet-fg)' },
  'Room Service': { tile: 'g-tone-orange', fg: 'text-(--g-orange-fg)' },
  Checkout: { tile: 'g-tone-sky', fg: 'text-(--g-sky-fg)' },
  Other: { tile: 'bg-(--g-neutral-bg) text-(--g-neutral-text)', fg: 'text-(--g-neutral-text)' },
};

const URGENCY = {
  low: { label: 'Low', dot: 'bg-(--g-primary)', active: 'bg-(--g-primary-tint) border-(--g-primary) text-(--g-primary-text)' },
  medium: { label: 'Medium', dot: 'bg-(--g-warning)', active: 'bg-(--g-warning-bg) border-(--g-warning) text-(--g-warning-text)' },
  urgent: { label: 'Urgent', dot: 'bg-(--g-danger)', active: 'bg-(--g-danger-bg) border-(--g-danger) text-(--g-danger-text)' },
};
const URGENCY_ORDER = ['low', 'medium', 'urgent'];

// Quick-request shortcuts — one tap fills the form with a common ask so
// guests don't have to type out the same handful of requests every time.
const QUICK_REQUESTS = [
  { label: 'Extra towels', category: 'Amenities', urgency: 'low', description: 'Please send extra towels to my room.' },
  { label: 'Room cleaning', category: 'Amenities', urgency: 'medium', description: 'Please clean my room when convenient.' },
  { label: 'Extra pillows', category: 'Amenities', urgency: 'low', description: 'Please send extra pillows to my room.' },
  { label: 'AC not working', category: 'Maintenance', urgency: 'urgent', description: 'The air conditioning in my room is not working.' },
  { label: 'Late checkout', category: 'Checkout', urgency: 'medium', description: 'Could I please get a late checkout?' },
];

const FILTERS = ['all', 'open', 'in-progress', 'resolved'];
const FILTER_LABELS = { all: 'All', open: 'Open', 'in-progress': 'In progress', resolved: 'Resolved' };
const REQUEST_LIST_ID = 'request-list';
const EMPTY_FORM = { category: 'Amenities', urgency: 'medium', description: '' };

const RequestsView = () => {
  const { subscribe, isConnected } = useSocket();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [attempted, setAttempted] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const statusParam = searchParams.get('status');
  const filter = FILTERS.includes(statusParam) ? statusParam : 'all';
  const setFilter = (value) => setSearchParams(value === 'all' ? {} : { status: value });

  // Keeps "5 min ago" labels honest without a refetch.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await getGuestRequests({ status: filter !== 'all' ? filter : undefined });
      const normalized = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setRequests(normalized);
      setLoaded(true);
      setNow(Date.now());
    } catch (error) {
      console.error('Requests load error:', error);
      setLoadError(errorMessage(error, 'Failed to load requests'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const { pull, refreshing } = usePullToRefresh(loadRequests);

  const handleRequestStatusUpdate = useCallback((data) => {
    setRequests((prev) =>
      prev.map((req) => (req._id === data.requestId ? { ...req, status: data.status, resolvedAt: data.resolvedAt } : req))
    );
    const label = `Request #${data.requestNumber || 'N/A'}`;
    if (data.status === 'resolved') {
      toast.success(`${label} has been resolved`, { position: 'top-center' });
      setAnnouncement(`${label} has been resolved`);
    } else if (data.status === 'in-progress') {
      toast.info(`${label} is being handled`, { position: 'top-center' });
      setAnnouncement(`${label} is being handled`);
    }
  }, []);

  useEffect(() => {
    if (!subscribe || !isConnected) return undefined;
    const unsub = subscribe('request-status-update', handleRequestStatusUpdate);
    return () => unsub();
  }, [subscribe, isConnected, handleRequestStatusUpdate]);

  const openForm = (preset) => {
    setFormData(preset || EMPTY_FORM);
    setAttempted(false);
    setSubmitError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setShowForm(false);
    setAttempted(false);
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setAttempted(true);
    if (formData.description.trim().length < DESC_MIN) {
      document.getElementById('request-description')?.focus();
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');
      const response = await submitRequest({ ...formData, description: formData.description.trim() });
      if (response?.success) {
        toast.success('Request submitted');
        setFormData(EMPTY_FORM);
        setAttempted(false);
        setShowForm(false);
        loadRequests();
      } else {
        setSubmitError(response?.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Request submission error:', error);
      setSubmitError(errorMessage(error, 'Failed to submit request'));
    } finally {
      setSubmitting(false);
    }
  };

  const formProps = {
    formData,
    setFormData,
    attempted,
    submitError,
    onSubmit: handleSubmit,
  };

  const formActions = (
    <div className="flex gap-3">
      <Button variant="secondary" onClick={closeForm} disabled={submitting}>Cancel</Button>
      <Button type="submit" form="request-form" className="flex-1" loading={submitting}>
        {submitting ? 'Submitting…' : 'Submit request'}
      </Button>
    </div>
  );

  const filterOptions = FILTERS.map((value) => ({ value, label: FILTER_LABELS[value] }));

  return (
    <div>
      <PullIndicator pull={pull} refreshing={refreshing} />
      <p className="sr-only" aria-live="polite">{announcement}</p>

      <PageHeader
        title="Service requests"
        subtitle="Housekeeping, maintenance and more"
        actions={<Button icon={Plus} onClick={() => (showForm && isDesktop ? closeForm() : openForm())}>New request</Button>}
        filters={<FilterTabs label="Filter requests" options={filterOptions} value={filter} onChange={setFilter} controls={REQUEST_LIST_ID} />}
      />

      {/* Desktop: inline form. Mobile: bottom sheet (below). */}
      {isDesktop && showForm ? (
        <section aria-labelledby="request-form-title" className="mb-6 rounded-(--g-radius-lg) border border-(--g-border) bg-(--g-surface) shadow-(--g-shadow-sm) p-6">
          <h2 id="request-form-title" className="g-h2 mb-4">Submit a new request</h2>
          <RequestForm {...formProps} />
          <div className="mt-5 max-w-md ml-auto">{formActions}</div>
        </section>
      ) : (
        <section aria-labelledby="quick-requests-title" className="mb-6">
          <h2 id="quick-requests-title" className="g-small font-semibold text-(--g-text) mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-(--g-amber-fg)" aria-hidden="true" />
            Quick requests
          </h2>
          <ul className="g-scroll-x flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {QUICK_REQUESTS.map((q) => {
              const Icon = categoryIcons[q.category] || HelpCircle;
              return (
                <li key={q.label} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => openForm({ category: q.category, urgency: q.urgency, description: q.description })}
                    className="min-h-[44px] pl-1.5 pr-4 rounded-(--g-radius-sm) border border-(--g-border) bg-(--g-surface) g-small font-semibold text-(--g-text) inline-flex items-center gap-2.5 hover:border-(--g-border-strong) hover:bg-(--g-surface-sunken) transition-colors duration-150"
                  >
                    <span className={cn('w-8 h-8 rounded-[8px] flex items-center justify-center', (categoryTone[q.category] || categoryTone.Other).tile)} aria-hidden="true">
                      <Icon className="w-4 h-4" />
                    </span>
                    {q.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!isDesktop && (
        <Sheet open={showForm} onClose={closeForm} dismissible={!submitting} title="New request" footer={formActions}>
          <RequestForm {...formProps} />
        </Sheet>
      )}

      {loading && !loaded ? (
        <div role="status" aria-live="polite" className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          <span className="sr-only">Loading your requests…</span>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : loadError && !loaded ? (
        <div role="alert">
          <EmptyState
            icon={AlertTriangle}
            title="Requests unavailable"
            description={loadError}
            action={<Button variant="secondary" icon={RefreshCw} onClick={loadRequests}>Try again</Button>}
          />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={filter === 'all' ? 'No requests yet' : `No ${FILTER_LABELS[filter].toLowerCase()} requests`}
          description="Use a quick request above or submit a new one to get started."
          action={filter !== 'all' && <Button variant="secondary" onClick={() => setFilter('all')}>Show all requests</Button>}
        />
      ) : (
        <>
          {loadError && (
            <div role="alert" className="mb-4 rounded-(--g-radius-md) bg-(--g-danger-bg) text-(--g-danger-text) p-3 g-small flex items-center justify-between gap-3">
              <span>{loadError}</span>
              <button type="button" onClick={loadRequests} className="min-h-[44px] font-semibold underline">Retry</button>
            </div>
          )}
          <ul
            id={REQUEST_LIST_ID}
            aria-busy={loading || undefined}
            className={cn('grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 transition-opacity duration-150', loading && 'opacity-60')}
          >
            {requests.map((request) => (
              <li key={request._id}>
                <RequestCard request={request} now={now} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const RequestForm = ({ formData, setFormData, attempted, submitError, onSubmit }) => {
  const length = formData.description.trim().length;
  const tooShort = length < DESC_MIN;
  const showLengthError = attempted && tooShort;

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <form id="request-form" onSubmit={onSubmit} noValidate className="space-y-4">
      {submitError && (
        <div role="alert" className="rounded-(--g-radius-md) bg-(--g-danger-bg) text-(--g-danger-text) p-3 g-small flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          {submitError}
        </div>
      )}

      <div>
        <label htmlFor="request-category" className="g-label text-(--g-text-muted)">Category</label>
        <select
          id="request-category"
          value={formData.category}
          onChange={(e) => update('category', e.target.value)}
          className="mt-1 w-full min-h-[44px] px-3 rounded-(--g-radius-sm) border border-(--g-border) bg-(--g-surface) text-(--g-text) g-body outline-none focus:border-(--g-primary)"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <fieldset>
        <legend className="g-label text-(--g-text-muted) mb-1">Urgency</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Urgency">
          {URGENCY_ORDER.map((level) => {
            const selected = formData.urgency === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update('urgency', level)}
                className={cn(
                  'min-h-[44px] px-3 rounded-(--g-radius-sm) border-2 g-small font-semibold inline-flex items-center justify-center gap-2 transition-colors duration-150',
                  selected ? URGENCY[level].active : 'border-(--g-border) bg-(--g-surface) text-(--g-text-muted) hover:border-(--g-border-strong)'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', URGENCY[level].dot)} aria-hidden="true" />
                {URGENCY[level].label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="request-description" className="g-label text-(--g-text-muted)">Description</label>
        <textarea
          id="request-description"
          value={formData.description}
          onChange={(e) => update('description', e.target.value)}
          maxLength={DESC_MAX}
          rows={4}
          placeholder="Describe what you need"
          aria-invalid={showLengthError || undefined}
          aria-describedby={showLengthError ? 'request-description-error' : undefined}
          className={cn(
            'mt-1 w-full px-3 py-2.5 rounded-(--g-radius-sm) border bg-(--g-surface) text-(--g-text) g-body placeholder:text-(--g-text-subtle) outline-none focus:border-(--g-primary) resize-none',
            showLengthError ? 'border-(--g-danger)' : 'border-(--g-border)'
          )}
        />
        {showLengthError && (
          <p id="request-description-error" className="g-small text-(--g-danger-text) mt-1">
            Please add a little more detail — at least {DESC_MIN} characters (<span className="guestNum">{length}/{DESC_MIN}</span>).
          </p>
        )}
      </div>
    </form>
  );
};

RequestForm.propTypes = {
  formData: PropTypes.shape({
    category: PropTypes.string.isRequired,
    urgency: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  setFormData: PropTypes.func.isRequired,
  attempted: PropTypes.bool.isRequired,
  submitError: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
};

const RequestCard = ({ request, now }) => {
  const CategoryIcon = categoryIcons[request.category] || HelpCircle;
  const urgency = URGENCY[request.urgency];
  const isOpen = !['resolved', 'closed', 'cancelled'].includes(request.status);

  return (
    <article className="h-full rounded-(--g-radius-md) border border-(--g-border) bg-(--g-surface) shadow-(--g-shadow-sm) p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className={cn('w-11 h-11 shrink-0 rounded-(--g-radius-sm) flex items-center justify-center', (categoryTone[request.category] || categoryTone.Other).tile)}>
            <CategoryIcon className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="g-body-strong truncate">{request.category}</h3>
            <p className="g-small text-(--g-text-muted) flex flex-wrap items-center gap-x-2">
              <span>Room {request.roomNumber || '—'}</span>
              {urgency && (
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full', urgency.dot)} aria-hidden="true" />
                  {urgency.label} urgency
                </span>
              )}
            </p>
          </div>
        </div>
        <StatusBadge domain="request" status={request.status} className="shrink-0" />
      </div>

      <p className="g-body text-(--g-text) break-words">{request.description}</p>

      <div className="mt-4 pt-4 border-t border-(--g-border) flex flex-wrap items-center justify-between gap-2 g-small text-(--g-text-muted)">
        <span>
          {isOpen && <span className="font-semibold text-(--g-text)">{formatRelative(request.createdAt, now)} · </span>}
          <time dateTime={request.createdAt} className="guestNum">{formatDateTime(request.createdAt)}</time>
        </span>
        {request.resolvedAt && (
          <span className="font-semibold text-(--g-success-text)">Resolved {formatDate(request.resolvedAt, { day: 'numeric', month: 'short' })}</span>
        )}
      </div>
    </article>
  );
};

RequestCard.propTypes = {
  request: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    urgency: PropTypes.string,
    description: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    roomNumber: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
    resolvedAt: PropTypes.string,
  }).isRequired,
  now: PropTypes.number.isRequired,
};

export default RequestsView;
