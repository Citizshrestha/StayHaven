import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getDashboardOverview } from '../guestDashboardApi';
import { errorMessage } from '../utils/format';

export const GuestOverviewContext = createContext(null);

/**
 * Single owner of `/guest/portal/dashboard`. Mounted once in the layout and
 * shared through GuestOverviewContext, so the endpoint is fetched exactly once
 * per load / refresh and the layout never blocks on it.
 */
const useGuestOverview = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setError(null);
    try {
      const res = await getDashboardOverview();
      if (requestId !== latestRequest.current) return;
      if (!res?.success) throw new Error(res?.message);
      setOverview(res.data || null);
      setLastRefreshedAt(Date.now());
    } catch (err) {
      if (requestId === latestRequest.current) setError(errorMessage(err, 'We couldn’t load your dashboard.'));
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Invalidate any in-flight response once the layout unmounts.
    return () => { latestRequest.current += 1; };
  }, [refresh]);

  const hasNoBookings = Boolean(
    overview &&
    !overview.activeBooking &&
    !(overview.upcomingBookings?.length > 0) &&
    !(overview.pastBookingsCount > 0)
  );

  return { overview, loading, error, refresh, lastRefreshedAt, hasNoBookings };
};

export const useGuestOverviewContext = () => {
  const ctx = useContext(GuestOverviewContext);
  if (!ctx) throw new Error('useGuestOverviewContext must be used inside GuestDashboardLayout');
  return ctx;
};

export default useGuestOverview;
