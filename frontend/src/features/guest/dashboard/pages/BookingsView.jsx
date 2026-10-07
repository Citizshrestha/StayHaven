/**
 * Guest Dashboard - Bookings View
 * Current / upcoming / past bookings with modify and cancel.
 * Styling comes exclusively from the guest design tokens (guest-tokens.css).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  CalendarDays, MapPin, BedDouble, Clock, AlertTriangle, RefreshCw, Edit2, X, Hash, Copy, Check, Info, CheckCircle2,
} from 'lucide-react';
import { getGuestBookings, modifyBooking, cancelBooking } from '../guestDashboardApi';
import { cn } from '../../../../core/utils/cn';
import usePullToRefresh from '../hooks/usePullToRefresh';
import {
  errorMessage, formatDate, formatLocation, fromDateInputValue, nightsBetween, toDateInputValue,
} from '../utils/format';
import Button from '../components/ui/Button';
import Money from '../components/ui/Money';
import PageHeader from '../components/ui/PageHeader';
import FilterTabs from '../components/ui/FilterTabs';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import Sheet from '../components/ui/Sheet';
import PullIndicator from '../components/ui/PullIndicator';
import { SkeletonCard } from '../components/ui/Skeleton';

const FILTERS = ['all', 'Pending', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled'];
const FILTER_LABELS = {
  all: 'All', Pending: 'Pending', Confirmed: 'Confirmed', 'Checked-In': 'Checked in', 'Checked-Out': 'Checked out', Cancelled: 'Cancelled',
};
const BOOKING_LIST_ID = 'booking-list';
const HOUR = 1000 * 60 * 60;
const MAX_GUESTS = 10; // mirrors bookingController.modifyBooking

const hoursUntil = (date) => (date ? (new Date(date) - new Date()) / HOUR : -Infinity);

// Guest count lives in `guests.adults` on the schema; `numGuests` is the API field.
const guestCount = (booking) => booking?.numGuests || booking?.guests?.adults || 1;

const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Groups for the "All" view: Current stay → Upcoming → Past. */
const groupBookings = (bookings) => {
  const today = startOfToday();
  const groups = { current: [], upcoming: [], past: [] };
  bookings.forEach((b) => {
    if (b.status === 'Checked-In') groups.current.push(b);
    else if (['Pending', 'Confirmed'].includes(b.status) && (!b.checkOut || new Date(b.checkOut) >= today)) groups.upcoming.push(b);
    else groups.past.push(b);
  });
  const byCheckIn = (a, b) => new Date(a.checkIn || 0) - new Date(b.checkIn || 0);
  groups.upcoming.sort(byCheckIn);
  groups.past.sort((a, b) => byCheckIn(b, a));
  return [
    { key: 'current', title: 'Current stay', items: groups.current },
    { key: 'upcoming', title: 'Upcoming', items: groups.upcoming },
    { key: 'past', title: 'Past', items: groups.past },
  ].filter((g) => g.items.length > 0);
};

const BookingsView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [modifyTarget, setModifyTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const statusParam = searchParams.get('status');
  const filter = FILTERS.includes(statusParam) ? statusParam : 'all';
  const setFilter = (value) => setSearchParams(value === 'all' ? {} : { status: value });

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getGuestBookings({ status: filter !== 'all' ? filter : undefined });
      const normalized = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.bookings)
            ? res.bookings
            : [];
      setBookings(normalized);
      setLoaded(true);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const { pull, refreshing } = usePullToRefresh(loadBookings);

  const groups = useMemo(
    () => (filter === 'all' ? groupBookings(bookings) : [{ key: filter, title: null, items: bookings }]),
    [bookings, filter]
  );

  const filterOptions = FILTERS.map((value) => ({ value, label: FILTER_LABELS[value] }));

  const handleModifySuccess = () => {
    setModifyTarget(null);
    loadBookings();
  };

  const handleCancelDone = () => {
    setCancelTarget(null);
    loadBookings();
  };

  return (
    <div>
      <PullIndicator pull={pull} refreshing={refreshing} />

      <PageHeader
        title="My bookings"
        subtitle="View and manage your current and past stays"
        filters={<FilterTabs label="Filter bookings" options={filterOptions} value={filter} onChange={setFilter} controls={BOOKING_LIST_ID} />}
      />

      {loading && !loaded ? (
        <div role="status" aria-live="polite" className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          <span className="sr-only">Loading your bookings…</span>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} media lines={3} />)}
        </div>
      ) : error ? (
        <div role="alert">
          <EmptyState
            icon={AlertTriangle}
            title="Bookings unavailable"
            description={error}
            action={<Button variant="secondary" icon={RefreshCw} onClick={loadBookings}>Try again</Button>}
          />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings found"
          description={filter === 'all' ? 'You haven’t made any bookings yet.' : `No ${FILTER_LABELS[filter].toLowerCase()} bookings.`}
          action={filter !== 'all' && <Button variant="secondary" onClick={() => setFilter('all')}>Show all bookings</Button>}
        />
      ) : (
        <div id={BOOKING_LIST_ID} className={cn('space-y-8 transition-opacity duration-150', loading && 'opacity-60')} aria-busy={loading || undefined}>
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={group.title ? `group-${group.key}` : undefined}>
              {group.title && (
                <h2 id={`group-${group.key}`} className="g-h2 mb-3">
                  {group.title} <span className="text-(--g-text-muted) guestNum">({group.items.length})</span>
                </h2>
              )}
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                {group.items.map((booking) => (
                  <li key={booking._id}>
                    <BookingCard
                      booking={booking}
                      onModify={() => setModifyTarget(booking)}
                      onCancel={() => setCancelTarget(booking)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {modifyTarget && (
        <ModifyBookingSheet booking={modifyTarget} onClose={() => setModifyTarget(null)} onSuccess={handleModifySuccess} />
      )}

      {cancelTarget && (
        <CancelBookingSheet booking={cancelTarget} onClose={() => setCancelTarget(null)} onDone={handleCancelDone} />
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const DetailChip = ({ icon: Icon, label, children }) => (
  <div className="rounded-(--g-radius-sm) bg-(--g-surface-sunken) px-3 py-2.5 flex items-center gap-2 min-w-0">
    {Icon && <Icon className="w-4 h-4 shrink-0 text-(--g-primary-text)" aria-hidden="true" />}
    <div className="min-w-0">
      <p className="g-label text-(--g-text-muted)">{label}</p>
      <p className="g-small font-semibold text-(--g-text) guestNum truncate">{children}</p>
    </div>
  </div>
);

DetailChip.propTypes = { icon: PropTypes.elementType, label: PropTypes.string.isRequired, children: PropTypes.node };

const CopyCode = ({ code }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Confirmation code copied');
    } catch {
      toast.error('Couldn’t copy — please select the code manually');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy confirmation code ${code}`}
      className="min-h-[44px] -my-2 -mr-2 px-2 inline-flex items-center gap-1.5 rounded-(--g-radius-sm) font-mono g-small font-semibold text-(--g-text) hover:bg-(--g-surface-sunken) select-all"
    >
      {code}
      {copied
        ? <Check className="w-4 h-4 text-(--g-success-text)" aria-hidden="true" />
        : <Copy className="w-4 h-4 text-(--g-text-muted)" aria-hidden="true" />}
    </button>
  );
};

CopyCode.propTypes = { code: PropTypes.string.isRequired };

const HotelImage = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="absolute inset-0 bg-(--g-surface-sunken)" aria-hidden="true" />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover" />;
};

HotelImage.propTypes = { src: PropTypes.string, alt: PropTypes.string };

const BookingCard = ({ booking, onModify, onCancel }) => {
  const nights = Math.max(1, nightsBetween(booking.checkIn, booking.checkOut));
  const hasDates = Boolean(booking.checkIn && booking.checkOut);
  const room = booking.room?.roomNumber || (booking.room?.type ? `${booking.room.type} room` : 'To be assigned');

  // 24h rule mirrors bookingController.modifyBooking for non-staff users.
  const modifiableStatus = ['Pending', 'Confirmed'].includes(booking.status);
  const canModify = modifiableStatus && hoursUntil(booking.checkIn) >= 24;
  const lockedByWindow = modifiableStatus && !canModify && Boolean(booking.checkIn);
  const canCancel = !['Cancelled', 'Checked-Out', 'No-Show'].includes(booking.status);
  const location = formatLocation(booking.hotel?.location);

  return (
    <article className="h-full flex flex-col rounded-(--g-radius-md) border border-(--g-border) bg-(--g-surface) shadow-(--g-shadow-sm) overflow-hidden">
      <div className="relative aspect-video">
        <HotelImage src={booking.hotel?.images?.[0]} alt={booking.hotel?.name || 'Hotel'} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" aria-hidden="true" />
        <StatusBadge domain="booking" status={booking.status} className="absolute top-3 right-3" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="g-h2 text-white">{booking.hotel?.name || 'Hotel'}</h3>
          {location && (
            <p className="g-small text-white/90 mt-0.5 flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <DetailChip icon={CalendarDays} label="Check-in">{formatDate(booking.checkIn)}</DetailChip>
          <DetailChip icon={CalendarDays} label="Check-out">{formatDate(booking.checkOut)}</DetailChip>
          <DetailChip icon={BedDouble} label="Room">{room}</DetailChip>
          <DetailChip icon={Clock} label="Duration">{hasDates ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : '—'}</DetailChip>
        </div>

        <div className="mt-4 pt-4 border-t border-(--g-border) flex items-center justify-between gap-3">
          <span className="g-small text-(--g-text-muted) inline-flex items-center gap-1.5 min-w-0">
            <Hash className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">Booking ID</span>
            <span className="truncate guestNum">{booking.bookingId || booking._id?.slice(-8) || '—'}</span>
          </span>
          {booking.confirmationCode && <CopyCode code={booking.confirmationCode} />}
        </div>

        {lockedByWindow && (
          <p className="mt-3 g-small text-(--g-text-muted) flex items-start gap-1.5">
            <Info className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            Changes close 24 hours before check-in. Contact the hotel to adjust this stay.
          </p>
        )}

        {(canModify || canCancel) && (
          <div className="mt-auto pt-4 flex gap-2.5">
            {canModify && <Button className="flex-1" icon={Edit2} onClick={onModify}>Modify</Button>}
            {canCancel && <Button className="flex-1" variant="dangerOutline" icon={X} onClick={onCancel}>Cancel</Button>}
          </div>
        )}
      </div>
    </article>
  );
};

BookingCard.propTypes = {
  booking: PropTypes.object.isRequired,
  onModify: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

// ─────────────────────────────────────────
// Modify booking
// ─────────────────────────────────────────

const inputClass = (invalid) => cn(
  'mt-1 w-full min-h-[44px] px-3 rounded-(--g-radius-sm) border bg-(--g-surface) text-(--g-text) g-body outline-none focus:border-(--g-primary)',
  invalid ? 'border-(--g-danger)' : 'border-(--g-border)'
);

const FieldError = ({ id, children }) => (children ? <p id={id} className="g-small text-(--g-danger-text) mt-1">{children}</p> : null);
FieldError.propTypes = { id: PropTypes.string.isRequired, children: PropTypes.node };

const ModifyBookingSheet = ({ booking, onClose, onSuccess }) => {
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    checkIn: toDateInputValue(booking.checkIn),
    checkOut: toDateInputValue(booking.checkOut),
    numGuests: String(guestCount(booking)),
  });
  const today = toDateInputValue(new Date());

  const update = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    const inDate = fromDateInputValue(formData.checkIn);
    const outDate = fromDateInputValue(formData.checkOut);
    const guests = Number(formData.numGuests);
    if (!inDate) next.checkIn = 'Choose a check-in date';
    else if (formData.checkIn < today) next.checkIn = 'Check-in can’t be in the past';
    if (!outDate) next.checkOut = 'Choose a check-out date';
    else if (inDate && outDate <= inDate) next.checkOut = 'Check-out must be after check-in';
    if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) next.numGuests = `Enter between 1 and ${MAX_GUESTS} guests`;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`modify-${first}`)?.focus();
    return !first;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;
    try {
      setSaving(true);
      setSubmitError('');
      const res = await modifyBooking(booking._id, { ...formData, numGuests: Number(formData.numGuests) });
      if (res?.success) {
        toast.success('Booking updated');
        onSuccess();
      } else {
        setSubmitError(res?.message || 'Failed to modify booking');
      }
    } catch (error) {
      console.error('Modify booking error:', error);
      setSubmitError(errorMessage(error, 'Failed to modify booking'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!saving}
      title="Modify booking"
      description={booking.hotel?.name}
      footer={(
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="modify-booking-form" className="flex-1" loading={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}
    >
      <form id="modify-booking-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {submitError && (
          <div role="alert" className="rounded-(--g-radius-md) bg-(--g-danger-bg) text-(--g-danger-text) p-3 g-small flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            {submitError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="modify-checkIn" className="g-label text-(--g-text-muted)">Check-in date</label>
            <input
              id="modify-checkIn"
              type="date"
              value={formData.checkIn}
              min={today}
              onChange={(e) => update('checkIn', e.target.value)}
              aria-invalid={Boolean(errors.checkIn) || undefined}
              aria-describedby={errors.checkIn ? 'modify-checkIn-error' : undefined}
              className={inputClass(errors.checkIn)}
              required
            />
            <FieldError id="modify-checkIn-error">{errors.checkIn}</FieldError>
          </div>
          <div>
            <label htmlFor="modify-checkOut" className="g-label text-(--g-text-muted)">Check-out date</label>
            <input
              id="modify-checkOut"
              type="date"
              value={formData.checkOut}
              min={formData.checkIn || today}
              onChange={(e) => update('checkOut', e.target.value)}
              aria-invalid={Boolean(errors.checkOut) || undefined}
              aria-describedby={errors.checkOut ? 'modify-checkOut-error' : undefined}
              className={inputClass(errors.checkOut)}
              required
            />
            <FieldError id="modify-checkOut-error">{errors.checkOut}</FieldError>
          </div>
        </div>
        <div>
          <label htmlFor="modify-numGuests" className="g-label text-(--g-text-muted)">Number of guests</label>
          <input
            id="modify-numGuests"
            type="number"
            inputMode="numeric"
            min="1"
            max={MAX_GUESTS}
            value={formData.numGuests}
            onChange={(e) => update('numGuests', e.target.value)}
            aria-invalid={Boolean(errors.numGuests) || undefined}
            aria-describedby={errors.numGuests ? 'modify-numGuests-error' : undefined}
            className={cn(inputClass(errors.numGuests), 'guestNum')}
            required
          />
          <FieldError id="modify-numGuests-error">{errors.numGuests}</FieldError>
        </div>
        <p className="g-small text-(--g-text-muted) flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
          Changes can only be made at least 24 hours before check-in.
        </p>
      </form>
    </Sheet>
  );
};

ModifyBookingSheet.propTypes = {
  booking: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

// ─────────────────────────────────────────
// Cancel booking
// ─────────────────────────────────────────

// Local estimate only — mirrors bookingController.cancelBooking. The server's
// `refund` in the cancel response is authoritative and is shown afterwards.
const estimateRefund = (booking) => {
  const hours = hoursUntil(booking.checkIn);
  const percentage = hours >= 48 ? 100 : hours >= 24 ? 50 : 0;
  const policy = hours >= 48
    ? 'Full refund (48+ hours before check-in)'
    : hours >= 24
      ? '50% refund (24–48 hours before check-in)'
      : 'No refund (less than 24 hours before check-in)';
  return { amount: ((Number(booking.totalAmount) || 0) * percentage) / 100, percentage, policy };
};

const CancelBookingSheet = ({ booking, onClose, onDone }) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null); // server refund after success
  const estimate = useMemo(() => estimateRefund(booking), [booking]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    try {
      setLoading(true);
      setSubmitError('');
      const res = await cancelBooking(booking._id, { reason });
      if (res?.success) {
        toast.success('Booking cancelled');
        setResult(res.refund || { amount: null });
      } else {
        setSubmitError(res?.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Cancel booking error:', error);
      setSubmitError(errorMessage(error, 'Failed to cancel booking'));
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const hasAmount = Number.isFinite(Number(result.amount)) && result.amount !== null;
    return (
      <Sheet open onClose={onDone} title="Booking cancelled" footer={<Button className="w-full" onClick={onDone} data-autofocus>Done</Button>}>
        <div role="status" className="rounded-(--g-radius-md) bg-(--g-success-bg) text-(--g-success-text) p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="g-body-strong">Your booking at {booking.hotel?.name || 'the hotel'} is cancelled.</p>
            {hasAmount ? (
              <p className="g-small mt-1">
                Refund confirmed by the hotel: <Money amount={Number(result.amount)} className="font-bold" />
                {Number.isFinite(result.percentage) && <span className="guestNum"> ({result.percentage}%)</span>}
                {result.policy && <span className="block mt-0.5">{result.policy}</span>}
              </p>
            ) : (
              <p className="g-small mt-1">The hotel will confirm any refund with you directly.</p>
            )}
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!loading}
      title="Cancel booking"
      description={booking.hotel?.name}
      footer={(
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Keep booking</Button>
          <Button type="submit" form="cancel-booking-form" variant="danger" className="flex-1" loading={loading}>
            {loading ? 'Cancelling…' : 'Confirm cancellation'}
          </Button>
        </div>
      )}
    >
      <form id="cancel-booking-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-(--g-radius-md) border border-(--g-border) bg-(--g-surface-sunken) p-4">
          <p className="g-label text-(--g-text-muted)">Estimated refund</p>
          <p className="mt-1">
            <Money amount={estimate.amount} size="lg" />
            <span className="g-small text-(--g-text-muted) guestNum ml-2">({estimate.percentage}%)</span>
          </p>
          <p className="g-small text-(--g-text-muted) mt-1">{estimate.policy}</p>
          <p className="g-small text-(--g-text-muted) mt-2 flex items-start gap-1.5">
            <Info className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            This is an estimate. The hotel confirms the final refund when you cancel.
          </p>
        </div>

        {submitError && (
          <div role="alert" className="rounded-(--g-radius-md) bg-(--g-danger-bg) text-(--g-danger-text) p-3 g-small flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            {submitError}
          </div>
        )}

        <div>
          <label htmlFor="cancel-reason" className="g-label text-(--g-text-muted)">Reason for cancellation (optional)</label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Let the hotel know why you’re cancelling"
            className="mt-1 w-full px-3 py-2.5 rounded-(--g-radius-sm) border border-(--g-border) bg-(--g-surface) text-(--g-text) g-body placeholder:text-(--g-text-subtle) outline-none focus:border-(--g-primary) resize-none"
          />
        </div>
      </form>
    </Sheet>
  );
};

CancelBookingSheet.propTypes = {
  booking: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default BookingsView;
