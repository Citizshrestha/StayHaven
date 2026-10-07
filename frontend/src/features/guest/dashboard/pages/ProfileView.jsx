/**
 * Guest Dashboard - Profile
 *
 * Read-only overview of the guest: identity, stay history, current/upcoming
 * stays and profile completeness. All editing lives on the Settings page;
 * every "change" affordance here deep-links to the matching Settings section.
 */

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award, Wallet, CalendarCheck, Calendar, Mail, Phone, User, Settings, ChevronRight, Camera,
  CheckCircle2, Circle, ShieldCheck, KeyRound, BedDouble, CalendarDays, AlertTriangle, RefreshCw, MapPin,
} from 'lucide-react';
import { cn } from '../../../../core/utils/cn';
import { useGuestProfileContext } from '../hooks/useGuestProfile';
import { useGuestOverviewContext } from '../hooks/useGuestOverview';
import { formatDate, formatLocation, formatMoney, nightsBetween } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';

const CARD = 'rounded-(--g-radius-lg) bg-(--g-surface) border border-(--g-border) shadow-(--g-shadow-sm)';
const SETTINGS = '/guest-dashboard/settings';

const shortDate = (d) => formatDate(d, { day: 'numeric', month: 'short' });

/* ─────────────────────────── building blocks ─────────────────────────── */

const CardHeader = ({ id, title, action }) => (
  <div className="flex items-center justify-between gap-3 mb-4">
    <h2 id={id} className="g-h2 text-(--g-text)">{title}</h2>
    {action}
  </div>
);

CardHeader.propTypes = { id: PropTypes.string, title: PropTypes.node.isRequired, action: PropTypes.node };

const TextLink = ({ to, children, label }) => (
  <Link
    to={to}
    aria-label={label}
    className="inline-flex items-center gap-1 min-h-[44px] -my-3 px-1 g-small font-semibold text-(--g-primary-text) hover:underline underline-offset-4"
  >
    {children}
    <ChevronRight className="w-4 h-4" aria-hidden="true" />
  </Link>
);

TextLink.propTypes = { to: PropTypes.string.isRequired, children: PropTypes.node, label: PropTypes.string };

/* ─────────────────────────────── identity ─────────────────────────────── */

const IdentityCard = ({ profile }) => {
  const name = profile.fullname || profile.username || 'Guest';
  const isGoogle = Boolean(profile.isGoogleUser);
  return (
    <section aria-label="Account summary" className={cn(CARD, 'overflow-hidden')}>
      <div className="h-24" style={{ background: 'var(--g-gradient)' }} aria-hidden="true" />
      <div className="px-6 pb-6 -mt-12 flex flex-col items-center text-center">
        <div className="relative">
          <Avatar src={profile.profilePicture} name={name} size="xl" className="border-4 border-(--g-surface) shadow-(--g-shadow-md)" />
          <Link
            to={`${SETTINGS}#photo`}
            aria-label="Change profile photo in Settings"
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center bg-(--g-surface) text-(--g-text) border border-(--g-border) shadow-(--g-shadow-md) hover:text-(--g-primary-text)"
          >
            <Camera className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <h2 className="g-h1 text-(--g-text) mt-3 max-w-full break-words">{name}</h2>
        {profile.username && <p className="g-small text-(--g-text-muted)">@{profile.username}</p>}

        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-(--g-radius-pill) g-small font-semibold bg-(--g-primary-tint) text-(--g-primary-text) capitalize">
            <User className="w-3.5 h-3.5" aria-hidden="true" />
            {profile.role || 'Guest'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-(--g-radius-pill) g-small font-semibold bg-(--g-neutral-bg) text-(--g-neutral-text)">
            {isGoogle ? <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> : <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />}
            {isGoogle ? 'Google sign-in' : 'Email & password'}
          </span>
        </div>

        <dl className="w-full mt-5 pt-5 border-t border-(--g-border) grid grid-cols-2 gap-3 text-left">
          <div className="min-w-0">
            <dt className="g-label text-(--g-text-muted)">Member since</dt>
            <dd className="g-body-strong text-(--g-text) mt-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-(--g-text-muted) shrink-0" aria-hidden="true" />
              <span className="truncate">{formatDate(profile.createdAt, { month: 'short', year: 'numeric' })}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="g-label text-(--g-text-muted)">Guest ID</dt>
            <dd className="g-body-strong text-(--g-text) mt-1 truncate guestNum">
              {String(localStorage.getItem('userId') || '').slice(-6).toUpperCase() || '—'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
};

IdentityCard.propTypes = { profile: PropTypes.object.isRequired };

/* ───────────────────────────── completeness ───────────────────────────── */

const CompletenessCard = ({ profile }) => {
  const items = [
    { id: 'name', label: 'Add your full name', done: (profile.fullname || '').trim().length >= 2, to: `${SETTINGS}#details` },
    { id: 'photo', label: 'Upload a profile photo', done: Boolean(profile.profilePicture), to: `${SETTINGS}#photo` },
    { id: 'phone', label: 'Add a phone number', done: Boolean(profile.contact), to: `${SETTINGS}#details` },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const complete = done === items.length;

  return (
    <section aria-labelledby="profile-complete-title" className={cn(CARD, 'p-5 sm:p-6')}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="profile-complete-title" className="g-h2 text-(--g-text)">Profile strength</h2>
        <span className="g-body-strong text-(--g-primary-text) guestNum">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-labelledby="profile-complete-title"
        className="h-2 mt-3 rounded-(--g-radius-pill) bg-(--g-surface-sunken) overflow-hidden"
      >
        {/* Flat fill: the banner above is this screen's one gradient. */}
        <div className="h-full rounded-(--g-radius-pill) bg-(--g-primary-fill) transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>

      {complete ? (
        <p className="g-small text-(--g-success-text) mt-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          All set. The front desk has everything they need to reach you.
        </p>
      ) : (
        <>
          <p className="g-small text-(--g-text-muted) mt-3">A complete profile helps the hotel team recognise and contact you.</p>
          <ul className="mt-3 space-y-1">
            {items.map(({ id, label, done: isDone, to }) => (
              <li key={id}>
                {isDone ? (
                  <span className="flex items-center gap-3 min-h-[40px] px-2 g-small text-(--g-text-muted) line-through decoration-(--g-text-subtle)">
                    <CheckCircle2 className="w-5 h-5 text-(--g-success) shrink-0" aria-hidden="true" />
                    {label}<span className="sr-only"> (done)</span>
                  </span>
                ) : (
                  <Link
                    to={to}
                    className="flex items-center gap-3 min-h-[44px] px-2 rounded-(--g-radius-sm) g-small font-semibold text-(--g-text) hover:bg-(--g-surface-sunken)"
                  >
                    <Circle className="w-5 h-5 text-(--g-text-subtle) shrink-0" aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-4 h-4 text-(--g-text-muted)" aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};

CompletenessCard.propTypes = { profile: PropTypes.object.isRequired };

/* ─────────────────────────────── stays ─────────────────────────────── */

const CurrentStayCard = ({ booking, loading }) => {
  const navigate = useNavigate();
  if (loading) return <SkeletonCard lines={3} />;

  return (
    <section aria-labelledby="profile-stay-title" className={cn(CARD, 'p-5 sm:p-6')}>
      <CardHeader id="profile-stay-title" title="Current stay" action={booking && <TextLink to="/guest-dashboard/bookings" label="View all bookings">Bookings</TextLink>} />
      {booking ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="w-12 h-12 shrink-0 rounded-(--g-radius-md) bg-(--g-primary-tint) text-(--g-primary-text) flex items-center justify-center">
            <BedDouble className="w-6 h-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="g-body-strong text-(--g-text) truncate">{booking.hotel?.name || 'Your hotel'}</p>
              <StatusBadge domain="booking" status={booking.status} />
            </div>
            <p className="g-small text-(--g-text-muted) mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {booking.room?.roomNumber && <span>Room {booking.room.roomNumber}{booking.room.type ? ` · ${booking.room.type}` : ''}</span>}
              {formatLocation(booking.hotel?.location) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  {formatLocation(booking.hotel.location)}
                </span>
              )}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:gap-4 sm:text-right shrink-0">
            {[
              ['Check-in', shortDate(booking.checkIn)],
              ['Check-out', shortDate(booking.checkOut)],
              ['Nights left', booking.nightsLeft ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-(--g-radius-sm) bg-(--g-surface-sunken) sm:bg-transparent p-2 sm:p-0">
                <dt className="g-label text-(--g-text-muted)">{k}</dt>
                <dd className="g-body-strong text-(--g-text) mt-0.5 guestNum">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="g-small text-(--g-text-muted) flex-1">You’re not checked in anywhere right now.</p>
          <Button variant="secondary" icon={CalendarDays} onClick={() => navigate('/guest-dashboard/bookings')}>
            See my bookings
          </Button>
        </div>
      )}
    </section>
  );
};

CurrentStayCard.propTypes = { booking: PropTypes.object, loading: PropTypes.bool };

const UpcomingCard = ({ bookings }) => {
  if (!bookings.length) return null;
  return (
    <section aria-labelledby="profile-upcoming-title" className={cn(CARD, 'p-5 sm:p-6')}>
      <CardHeader
        id="profile-upcoming-title"
        title="Upcoming stays"
        action={<TextLink to="/guest-dashboard/bookings?status=upcoming" label="View all upcoming stays">View all</TextLink>}
      />
      <ul className="divide-y divide-(--g-border)">
        {bookings.map((b) => {
          const nights = nightsBetween(b.checkIn, b.checkOut);
          return (
            <li key={b._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="w-10 h-10 shrink-0 rounded-(--g-radius-sm) bg-(--g-info-bg) text-(--g-info-text) flex items-center justify-center">
                <CalendarDays className="w-5 h-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="g-body-strong text-(--g-text) truncate">{b.hotel?.name || 'Hotel stay'}</p>
                <p className="g-small text-(--g-text-muted) guestNum">
                  {shortDate(b.checkIn)} – {formatDate(b.checkOut)} · {nights} night{nights === 1 ? '' : 's'}
                </p>
              </div>
              <StatusBadge domain="booking" status={b.status} />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

UpcomingCard.propTypes = { bookings: PropTypes.array.isRequired };

/* ──────────────────────────── contact (read-only) ──────────────────────────── */

const ContactCard = ({ profile }) => {
  const rows = [
    { icon: User, label: 'Full name', value: profile.fullname },
    { icon: Mail, label: 'Email', value: profile.email, breakAll: true },
    {
      icon: Phone,
      label: 'Phone',
      value: profile.contact,
      empty: <Link to={`${SETTINGS}#details`} className="g-small font-semibold text-(--g-primary-text) hover:underline underline-offset-4">Add a phone number</Link>,
    },
  ];
  return (
    <section aria-labelledby="profile-contact-title" className={cn(CARD, 'p-5 sm:p-6')}>
      <CardHeader
        id="profile-contact-title"
        title="Contact details"
        action={<TextLink to={`${SETTINGS}#details`} label="Edit contact details in Settings">Edit</TextLink>}
      />
      <dl className="grid gap-4 sm:grid-cols-3">
        {rows.map(({ icon: Icon, label, value, empty, breakAll }) => (
          <div key={label} className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 shrink-0 rounded-(--g-radius-sm) bg-(--g-surface-sunken) text-(--g-text-muted) flex items-center justify-center">
              <Icon className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="g-label text-(--g-text-muted)">{label}</dt>
              <dd className={cn('g-body-strong text-(--g-text) mt-1', breakAll ? 'break-all' : 'break-words')}>
                {value || empty || '—'}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
};

ContactCard.propTypes = { profile: PropTypes.object.isRequired };

/* ─────────────────────────────── page ─────────────────────────────── */

const ProfileSkeleton = () => (
  <div role="status" aria-live="polite" className="grid gap-5 lg:gap-6 lg:grid-cols-12 items-start">
    <span className="sr-only">Loading your profile…</span>
    <div className="lg:col-span-4 space-y-5 lg:space-y-6" aria-hidden="true">
      <div className={cn(CARD, 'overflow-hidden')}>
        <Skeleton className="h-24 w-full rounded-none" />
        <div className="p-6 flex flex-col items-center">
          <Skeleton className="w-24 h-24 rounded-full -mt-16" />
          <Skeleton className="h-6 w-40 mt-4" />
          <Skeleton className="h-4 w-24 mt-2" />
        </div>
      </div>
      <SkeletonCard lines={3} />
    </div>
    <div className="lg:col-span-8 space-y-5 lg:space-y-6" aria-hidden="true">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-(--g-radius-md)" />)}
      </div>
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
    </div>
  </div>
);

const ProfileView = () => {
  const navigate = useNavigate();
  const { profile, stats, loading, error, refresh } = useGuestProfileContext();
  const { overview, loading: overviewLoading } = useGuestOverviewContext();

  // Stats change as bookings/payments happen; refresh them whenever the page opens.
  useEffect(() => { refresh(); }, [refresh]);

  const header = (
    <PageHeader
      title="My profile"
      subtitle="Your account and stays at a glance"
      actions={
        <Button variant="secondary" icon={Settings} onClick={() => navigate(SETTINGS)} aria-label="Account settings">
          <span className="hidden sm:inline">Account settings</span>
        </Button>
      }
    />
  );

  if (loading && !profile) return <div>{header}<ProfileSkeleton /></div>;

  if (!profile) {
    return (
      <div>
        {header}
        <div role="alert">
          <EmptyState
            icon={AlertTriangle}
            title="Profile unavailable"
            description={error || 'We couldn’t load your profile.'}
            action={<Button variant="secondary" icon={RefreshCw} onClick={refresh}>Try again</Button>}
          />
        </div>
      </div>
    );
  }

  const active = overview?.activeBooking || null;
  const upcoming = (overview?.upcomingBookings || []).filter((b) => b._id !== active?._id).slice(0, 3);

  return (
    <div>
      {header}

      <div className="grid gap-5 lg:gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-4 space-y-5 lg:space-y-6">
          <IdentityCard profile={profile} />
          <CompletenessCard profile={profile} />
        </div>

        <div className="lg:col-span-8 space-y-5 lg:space-y-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              icon={Award}
              label="Total stays"
              value={<span className="guestNum">{stats?.totalBookings || 0}</span>}
              onClick={() => navigate('/guest-dashboard/bookings')}
            />
            <StatCard
              icon={Wallet}
              tone="success"
              label="Total spent"
              value={formatMoney(stats?.totalSpent, 0)}
              onClick={() => navigate('/guest-dashboard/billing')}
            />
            <StatCard
              icon={CalendarCheck}
              tone="info"
              label="Active bookings"
              value={<span className="guestNum">{stats?.activeBookings || 0}</span>}
              onClick={() => navigate('/guest-dashboard/bookings?status=upcoming')}
            />
          </div>

          <CurrentStayCard booking={active} loading={overviewLoading && !overview} />
          <UpcomingCard bookings={upcoming} />
          <ContactCard profile={profile} />
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
