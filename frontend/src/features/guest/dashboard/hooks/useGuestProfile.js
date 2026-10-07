import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getUserProfile } from '../guestDashboardApi';
import { errorMessage } from '../utils/format';

export const GuestProfileContext = createContext(null);

/**
 * Single owner of `/guest/portal/profile`. Mounted once in the layout so the
 * sidebar, mobile header, Profile and Settings pages all read the same data,
 * and an edit on Settings updates the sidebar immediately.
 */
const useGuestProfile = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setError(null);
    try {
      const res = await getUserProfile();
      if (requestId !== latestRequest.current) return;
      if (!res?.success) throw new Error(res?.message);
      setProfile(res.data?.profile || null);
      setStats(res.data?.stats || null);
    } catch (err) {
      if (requestId === latestRequest.current) setError(errorMessage(err, 'We couldn’t load your profile.'));
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  /** Merge server-confirmed fields into the cached profile without refetching. */
  const patchProfile = useCallback((fields) => {
    setProfile((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  useEffect(() => {
    refresh();
    return () => { latestRequest.current += 1; };
  }, [refresh]);

  return { profile, stats, loading, error, refresh, patchProfile };
};

export const useGuestProfileContext = () => {
  const ctx = useContext(GuestProfileContext);
  if (!ctx) throw new Error('useGuestProfileContext must be used inside GuestDashboardLayout');
  return ctx;
};

export default useGuestProfile;
