/**
 * Guest Dashboard - Settings
 *
 * Account settings for guest users: profile photo, personal details,
 * password and appearance. Reads/writes the shared GuestProfileContext so the
 * sidebar and mobile header update as soon as a change is saved.
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Camera, Trash2, Save, RotateCcw, Eye, EyeOff, Lock, Check, X, Mail, AtSign, Moon, Sun, ShieldCheck, User,
} from 'lucide-react';
import { useTheme } from '../../../../core/hooks/useTheme';
import { cn } from '../../../../core/utils/cn';
import {
  updateUserProfile, uploadProfilePicture, removeProfilePicture, changePassword,
} from '../guestDashboardApi';
import { useGuestProfileContext } from '../hooks/useGuestProfile';
import { errorMessage } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';

const CARD = 'rounded-(--g-radius-lg) bg-(--g-surface) border border-(--g-border) shadow-(--g-shadow-sm) p-5 sm:p-6';
// Styled in guest-tokens.css (.g-input) so it follows light/dark tokens.
const INPUT = 'g-input';
// Keeps anchored sections clear of the sticky mobile top bar when scrolled to.
const SECTION_SCROLL = 'scroll-mt-20 lg:scroll-mt-8';

const SECTIONS = [
  { id: 'photo', label: 'Profile photo', icon: Camera },
  { id: 'details', label: 'Personal details', icon: AtSign },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'appearance', label: 'Appearance', icon: Moon },
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

// Mirrors user.schema.js#validatePassword so guests see the rules before submitting.
const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'num', label: 'One number', test: (v) => /[0-9]/.test(v) },
  { id: 'special', label: 'One special character (!@#$%^&*…)', test: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v) },
];

/* ───────────────────────── small building blocks ───────────────────────── */

const SectionTitle = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 mb-5">
    {Icon && (
      <span className="w-10 h-10 shrink-0 rounded-(--g-radius-sm) bg-(--g-primary-tint) text-(--g-primary-text) flex items-center justify-center">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
    )}
    <div className="min-w-0">
      <h2 className="g-h2 text-(--g-text)">{title}</h2>
      {description && <p className="g-small text-(--g-text-muted) mt-0.5">{description}</p>}
    </div>
  </div>
);

const Field = ({ label, hint, error, children, id }) => (
  <div>
    <label htmlFor={id} className="g-label text-(--g-text-muted) block mb-1.5">{label}</label>
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="g-small text-(--g-danger-text) mt-1.5">{error}</p>
    ) : hint ? (
      <p id={`${id}-hint`} className="g-small text-(--g-text-muted) mt-1.5">{hint}</p>
    ) : null}
  </div>
);

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

const PasswordInput = ({ id, value, onChange, error, hint, autoComplete, disabled }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        disabled={disabled}
        maxLength={72}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(INPUT, 'g-input--trail')}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-(--g-radius-sm) text-(--g-text-muted) hover:text-(--g-text)"
      >
        {visible ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
      </button>
    </div>
  );
};

/* ───────────────────────────── profile photo ───────────────────────────── */

const PhotoCard = ({ profile, onChange }) => {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(null); // 'upload' | 'remove' | null
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const name = profile?.fullname || profile?.username || 'Guest';
  const shown = preview || profile?.profilePicture || null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after an error
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error('Please choose a JPEG, PNG or WEBP image');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setBusy('upload');
    try {
      const res = await uploadProfilePicture(file);
      onChange({ profilePicture: res?.data?.profilePicture || null });
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t upload your photo. Please try again.'));
    } finally {
      setPreview(null);
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    setBusy('remove');
    try {
      await removeProfilePicture();
      onChange({ profilePicture: null });
      setConfirmRemove(false);
      toast.success('Profile photo removed');
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t remove your photo.'));
    } finally {
      setBusy(null);
    }
  };

  const hasPhoto = Boolean(profile?.profilePicture);

  return (
    <section id="photo" aria-labelledby="settings-photo-title" className={cn(CARD, SECTION_SCROLL)}>
      <SectionTitle
        icon={Camera}
        title={<span id="settings-photo-title">Profile photo</span>}
        description="Helps staff recognise you at the front desk and when delivering orders."
      />
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={Boolean(busy)}
          aria-label={hasPhoto ? 'Change profile photo' : 'Upload profile photo'}
          className="group relative self-center sm:self-auto rounded-full disabled:cursor-wait"
        >
          <Avatar src={shown} name={name} size="xl" decorative className={cn('ring-4 ring-(--g-primary-tint)', busy === 'upload' && 'opacity-60')} />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full flex items-center justify-center bg-black/45 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150"
          >
            <Camera className="w-6 h-6" />
          </span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="g-body-strong text-(--g-text)">{hasPhoto ? 'Looking good.' : 'No photo yet'}</p>
          <p className="g-small text-(--g-text-muted) mt-0.5">JPEG, PNG or WEBP, up to 5 MB. Square images work best.</p>

          {confirmRemove ? (
            <div role="group" aria-label="Confirm photo removal" className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="g-small text-(--g-text) mr-1">Remove your photo?</span>
              <Button variant="danger" icon={Trash2} loading={busy === 'remove'} onClick={handleRemove}>Remove</Button>
              <Button variant="secondary" disabled={busy === 'remove'} onClick={() => setConfirmRemove(false)}>Keep it</Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
              <Button icon={Camera} loading={busy === 'upload'} disabled={Boolean(busy)} onClick={() => fileRef.current?.click()}>
                {hasPhoto ? 'Change photo' : 'Upload photo'}
              </Button>
              {hasPhoto && (
                <Button variant="dangerOutline" icon={Trash2} disabled={Boolean(busy)} onClick={() => setConfirmRemove(true)}>
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────── personal details ─────────────────────────── */

const validateDetails = ({ fullname, contact }) => {
  const errors = {};
  const name = fullname.trim();
  if (name.length < 2 || name.length > 100) errors.fullname = 'Full name must be between 2 and 100 characters';
  const digits = contact.replace(/\D/g, '');
  if (contact.trim() && !/^\d{10,15}$/.test(digits)) errors.contact = 'Phone number must contain 10 to 15 digits';
  return errors;
};

const DetailsCard = ({ profile, onChange }) => {
  const baseId = useId();
  const initial = useMemo(() => ({
    fullname: profile?.fullname || '',
    contact: profile?.contact || '',
  }), [profile?.fullname, profile?.contact]);

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial); setErrors({}); }, [initial]);

  const dirty = form.fullname.trim() !== initial.fullname || form.contact.replace(/\D/g, '') !== initial.contact.replace(/\D/g, '');

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateDetails(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const res = await updateUserProfile({ fullname: form.fullname.trim(), contact: form.contact.trim() });
      onChange({ fullname: res?.data?.fullname, contact: res?.data?.contact });
      toast.success('Your details were saved');
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t save your details.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="details" aria-labelledby="settings-details-title" className={cn(CARD, SECTION_SCROLL)}>
      <SectionTitle
        icon={AtSign}
        title={<span id="settings-details-title">Personal details</span>}
        description="This is how the hotel team will see and contact you."
      />
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${baseId}-name`} label="Full name" error={errors.fullname}>
            <input
              id={`${baseId}-name`}
              type="text"
              value={form.fullname}
              onChange={set('fullname')}
              autoComplete="name"
              maxLength={100}
              required
              aria-invalid={Boolean(errors.fullname) || undefined}
              aria-describedby={describedBy(`${baseId}-name`, errors.fullname)}
              className={INPUT}
            />
          </Field>
          <Field id={`${baseId}-phone`} label="Phone number" hint="10–15 digits. Optional." error={errors.contact}>
            <input
              id={`${baseId}-phone`}
              type="tel"
              inputMode="tel"
              value={form.contact}
              onChange={set('contact')}
              autoComplete="tel"
              maxLength={20}
              placeholder="98XXXXXXXX"
              aria-invalid={Boolean(errors.contact) || undefined}
              aria-describedby={describedBy(`${baseId}-phone`, errors.contact, '10–15 digits. Optional.')}
              className={INPUT}
            />
          </Field>
          <Field id={`${baseId}-email`} label="Email" hint="Contact the front desk to change your email.">
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-(--g-text-muted) pointer-events-none" aria-hidden="true" />
              <input
                id={`${baseId}-email`}
                type="email"
                value={profile?.email || ''}
                disabled
                aria-describedby={`${baseId}-email-hint`}
                className={cn(INPUT, 'g-input--lead')}
              />
            </div>
          </Field>
          <Field id={`${baseId}-user`} label="Username" hint="Used to sign in. Can’t be changed.">
            <input
              id={`${baseId}-user`}
              type="text"
              value={profile?.username || ''}
              disabled
              aria-describedby={`${baseId}-user-hint`}
              className={INPUT}
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="secondary" icon={RotateCcw} disabled={!dirty || saving} onClick={() => { setForm(initial); setErrors({}); }}>
            Reset
          </Button>
          <Button type="submit" icon={Save} loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
    </section>
  );
};

/* ─────────────────────────────── password ─────────────────────────────── */

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

const PasswordCard = ({ isGoogleUser }) => {
  const baseId = useId();
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const ruleResults = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(form.newPassword) }));
  const allRulesPass = ruleResults.every((r) => r.ok);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.currentPassword) found.currentPassword = 'Enter your current password';
    if (!allRulesPass) found.newPassword = 'Your new password doesn’t meet all the requirements';
    else if (form.newPassword === form.currentPassword) found.newPassword = 'New password must be different from your current password';
    if (form.confirmPassword !== form.newPassword) found.confirmPassword = 'Passwords don’t match';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(EMPTY_PASSWORDS);
      toast.success('Password changed');
    } catch (err) {
      const data = err?.response?.data;
      if (data?.field) setErrors({ [data.field]: data.message });
      else toast.error(errorMessage(err, 'Couldn’t change your password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="password" aria-labelledby="settings-password-title" className={cn(CARD, SECTION_SCROLL)}>
      <SectionTitle
        icon={Lock}
        title={<span id="settings-password-title">Password</span>}
        description="Use a strong password you don’t use anywhere else."
      />

      {isGoogleUser ? (
        <div className="flex items-start gap-3 p-4 rounded-(--g-radius-md) bg-(--g-info-bg) text-(--g-info-text)">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="g-small">
            You sign in with Google, so there’s no StayHaven password to change. Manage your password in your Google account.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Hidden username helps password managers pair the new password with the right account */}
          <input type="text" autoComplete="username" value={localStorage.getItem('username') || ''} readOnly hidden />
          <Field id={`${baseId}-current`} label="Current password" error={errors.currentPassword}>
            <PasswordInput
              id={`${baseId}-current`}
              value={form.currentPassword}
              onChange={set('currentPassword')}
              error={errors.currentPassword}
              autoComplete="current-password"
              disabled={saving}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${baseId}-new`} label="New password" error={errors.newPassword}>
              <PasswordInput
                id={`${baseId}-new`}
                value={form.newPassword}
                onChange={set('newPassword')}
                error={errors.newPassword}
                autoComplete="new-password"
                disabled={saving}
              />
            </Field>
            <Field id={`${baseId}-confirm`} label="Confirm new password" error={errors.confirmPassword}>
              <PasswordInput
                id={`${baseId}-confirm`}
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                error={errors.confirmPassword}
                autoComplete="new-password"
                disabled={saving}
              />
            </Field>
          </div>

          <ul aria-label="Password requirements" className="grid gap-1.5 sm:grid-cols-2 p-4 rounded-(--g-radius-md) bg-(--g-surface-sunken)">
            {ruleResults.map(({ id, label, ok }) => (
              <li key={id} className={cn('g-small flex items-center gap-2', ok ? 'text-(--g-success-text)' : 'text-(--g-text-muted)')}>
                {ok ? <Check className="w-4 h-4 shrink-0" aria-hidden="true" /> : <X className="w-4 h-4 shrink-0" aria-hidden="true" />}
                <span>{label}<span className="sr-only">{ok ? ' — met' : ' — not met'}</span></span>
              </li>
            ))}
          </ul>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              icon={Lock}
              loading={saving}
              disabled={!form.currentPassword || !form.newPassword || !form.confirmPassword}
              className="w-full sm:w-auto"
            >
              Update password
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};

/* ────────────────────────────── appearance ────────────────────────────── */

const AppearanceCard = () => {
  const { isDark, toggleTheme } = useTheme();
  const labelId = useId();
  const Icon = isDark ? Moon : Sun;
  return (
    <section id="appearance" aria-labelledby="settings-appearance-title" className={cn(CARD, SECTION_SCROLL)}>
      <SectionTitle
        icon={Icon}
        title={<span id="settings-appearance-title">Appearance</span>}
        description="Choose how the guest portal looks on this device."
      />
      <div className="flex items-center justify-between gap-4 p-4 rounded-(--g-radius-md) bg-(--g-surface-sunken)">
        <div className="min-w-0">
          <p id={labelId} className="g-body-strong text-(--g-text)">Dark mode</p>
          <p className="g-small text-(--g-text-muted)">Easier on the eyes at night.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-labelledby={labelId}
          onClick={toggleTheme}
          className={cn(
            'relative shrink-0 w-12 h-7 rounded-full transition-colors duration-150 ease-out',
            isDark ? 'bg-(--g-primary-fill)' : 'bg-(--g-border-strong)'
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-(--g-shadow-md) transition-transform duration-150 ease-out',
              isDark && 'translate-x-5'
            )}
          />
        </button>
      </div>
    </section>
  );
};

/* ──────────────────────────────── page ──────────────────────────────── */

/**
 * In-page section navigation: vertical list on desktop (sticky), horizontal
 * pills on mobile. Highlights the section currently in view.
 */
const SectionNav = ({ active, onJump }) => (
  <nav aria-label="Settings sections">
    <ul className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto g-scroll-x -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              onClick={(e) => { e.preventDefault(); onJump(id); }}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'flex items-center gap-2.5 min-h-[44px] px-4 lg:px-3 rounded-(--g-radius-pill) lg:rounded-(--g-radius-sm) g-small font-semibold whitespace-nowrap',
                'border lg:border-0 transition-colors duration-150 ease-out',
                isActive
                  ? 'bg-(--g-primary-tint) text-(--g-primary-text) border-transparent'
                  : 'bg-(--g-surface) lg:bg-transparent text-(--g-text-muted) border-(--g-border) hover:bg-(--g-surface-sunken) hover:text-(--g-text)'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {label}
            </a>
          </li>
        );
      })}
    </ul>
  </nav>
);

const SettingsSkeleton = () => (
  <div role="status" aria-live="polite" className="grid gap-6 lg:grid-cols-12 items-start">
    <span className="sr-only">Loading your settings…</span>
    <div className="hidden lg:block lg:col-span-3 space-y-2" aria-hidden="true">
      {SECTIONS.map((s) => <Skeleton key={s.id} className="h-11 w-full" />)}
    </div>
    <div className="lg:col-span-9 space-y-6" aria-hidden="true">
      <SkeletonCard lines={2} />
      <SkeletonCard lines={4} />
      <SkeletonCard lines={3} />
    </div>
  </div>
);

const SettingsView = () => {
  const { profile, loading, error, refresh, patchProfile } = useGuestProfileContext();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(SECTIONS[0].id);
  const ready = Boolean(profile);

  const jumpTo = useCallback((id, { focus = true } = {}) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setActive(id);
    // Move focus to the section so keyboard/screen-reader users land there too.
    if (focus) {
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  // Deep links from the Profile page (e.g. /settings#photo).
  useEffect(() => {
    if (!ready) return;
    const id = hash.replace('#', '');
    if (SECTIONS.some((s) => s.id === id)) requestAnimationFrame(() => jumpTo(id));
  }, [ready, hash, jumpTo]);

  // Scroll-spy: highlight the section nearest the top of the viewport.
  useEffect(() => {
    if (!ready || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -55% 0px', threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Update your photo, details, password and preferences"
        actions={
          <Button variant="secondary" icon={User} onClick={() => navigate('/guest-dashboard/profile')} aria-label="View my profile">
            <span className="hidden sm:inline">View profile</span>
          </Button>
        }
      />

      {loading && !profile ? (
        <SettingsSkeleton />
      ) : error && !profile ? (
        <EmptyState
          icon={AtSign}
          title="We couldn’t load your settings"
          description={error}
          action={<Button icon={RotateCcw} onClick={refresh}>Try again</Button>}
        />
      ) : (
        <div className="grid gap-5 lg:gap-8 lg:grid-cols-12 items-start">
          <div className="lg:col-span-3 lg:sticky lg:top-8">
            <SectionNav active={active} onJump={jumpTo} />
          </div>
          <div className="lg:col-span-9 space-y-6 max-w-4xl">
            <PhotoCard profile={profile} onChange={patchProfile} />
            <DetailsCard profile={profile} onChange={patchProfile} />
            <PasswordCard isGoogleUser={Boolean(profile?.isGoogleUser)} />
            <AppearanceCard />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
