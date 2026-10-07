import { useEffect, useRef, useState } from 'react';

export const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

/**
 * Touch pull-to-refresh on the window scroller (no library). Only arms when
 * the page is scrolled to the top and the touch did not start inside a dialog.
 * Returns the current pull distance (px) and whether a refresh is running.
 */
const usePullToRefresh = (onRefresh) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; });

  useEffect(() => {
    let startY = null;
    let distance = 0;
    let busy = false;
    let mounted = true;

    const reset = () => { startY = null; distance = 0; setPull(0); };

    const onStart = (e) => {
      if (busy || e.touches.length !== 1 || window.scrollY > 0) return;
      if (e.target instanceof Element && e.target.closest('[role="dialog"]')) return;
      startY = e.touches[0].clientY;
    };

    const onMove = (e) => {
      if (startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (window.scrollY > 0) { reset(); return; }
      if (dy <= 0) {
        if (distance) { distance = 0; setPull(0); }
        return;
      }
      distance = Math.min(dy * 0.6, MAX_PULL);
      setPull(distance);
    };

    const onEnd = async () => {
      if (startY == null) return;
      const reached = distance >= PULL_THRESHOLD;
      reset();
      if (!reached || busy) return;
      busy = true;
      setRefreshing(true);
      try {
        await onRefreshRef.current?.();
      } finally {
        busy = false;
        if (mounted) setRefreshing(false);
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', reset);
    return () => {
      mounted = false;
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, []);

  return { pull, refreshing };
};

export default usePullToRefresh;
